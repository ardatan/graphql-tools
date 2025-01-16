import fs from 'fs';
import http from 'http';
import { AddressInfo, Socket } from 'net';
import { platform, tmpdir } from 'os';
import path, { join } from 'path';
import { setTimeout } from 'timers/promises';
import { parse } from 'graphql';
import { createSchema, createYoga, Repeater } from 'graphql-yoga';
import puppeteer, { Browser, Page } from 'puppeteer';
import webpack, { Stats } from 'webpack';
import { useEngine } from '@envelop/core';
import { normalizedExecutor } from '@graphql-tools/executor';
import { createDeferred, ExecutionResult } from '@graphql-tools/utils';
import { useDeferStream } from '@graphql-yoga/plugin-defer-stream';
import { describeIf } from '../../../testing/utils.js';
import type * as UrlLoaderModule from '../src/index.js';

declare global {
  interface Window {
    GraphQLToolsUrlLoader: typeof UrlLoaderModule;
  }
}

describeIf(platform() !== 'win32')('[url-loader] webpack bundle compat', () => {
  let httpServer: http.Server;
  let browser: Browser;
  let page: Page;
  const fakeAsyncIterableReturnDeferred = createDeferred<void>();
  const yoga = createYoga({
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: Boolean
          countdown(from: Int): [Int]
          fakeStream: [Boolean]
        }
        type Subscription {
          foo: Boolean
        }
      `,
      resolvers: {
        Query: {
          foo: () => setTimeout(300).then(() => true),
          countdown: async function* (_, { from }) {
            for (let i = from; i >= 0; i--) {
              yield i;
              await setTimeout(100);
            }
          },
          fakeStream: () =>
            new Repeater<true>(function (push, stop) {
              let timeout: ReturnType<typeof globalThis.setTimeout>;
              function tick() {
                push(true).finally(() => {
                  timeout = globalThis.setTimeout(tick, 300);
                });
              }
              tick();
              stop.finally(() => {
                if (timeout) {
                  clearTimeout(timeout);
                }
                fakeAsyncIterableReturnDeferred.resolve();
              });
            }),
        },
        Subscription: {
          foo: {
            async *subscribe() {
              await setTimeout(300);
              yield { foo: true };
              await setTimeout(300);
              yield { foo: false };
            },
          },
        },
      },
    }),
    plugins: [
      useEngine({
        execute: normalizedExecutor,
        subscribe: normalizedExecutor,
      }),
      useDeferStream(),
    ],
  });

  let httpAddress: string;

  const sockets = new Set<Socket>();

  const webpackBundleFileName = 'webpack.js';
  const webpackBundleDir = join(tmpdir(), 'graphql-tools-url-loader');
  const webpackBundleFullPath = path.resolve(webpackBundleDir, webpackBundleFileName);

  beforeAll(async () => {
    // bundle webpack js
    const stats = await new Promise<Stats | undefined>((resolve, reject) => {
      const compiler = webpack(
        {
          mode: 'development',
          entry: path.resolve(__dirname, '..', 'dist', 'esm', 'index.js'),
          output: {
            path: webpackBundleDir,
            filename: webpackBundleFileName,
            libraryTarget: 'umd',
            library: 'GraphQLToolsUrlLoader',
            umdNamedDefine: true,
          },
        },
        (err, stats) => {
          if (err) {
            reject(err);
          } else {
            compiler.close(err => {
              if (err) {
                reject(err);
              } else {
                resolve(stats);
              }
            });
          }
        },
      );
    });

    if (stats?.hasErrors()) {
      throw stats.toString({ colors: true });
    }

    httpServer = http
      .createServer((req, res) => {
        if (req.method === 'GET' && req.url === '/') {
          res.statusCode = 200;
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=UTF-8',
          });

          res.write(/** HTML */ `
          <html>
            <title>Url Loader Test</title>
            <body>
              <script src="/${webpackBundleFileName}"></script>
            </body>
          </html>
        `);
          res.end();
          return;
        }

        if (req.method === 'GET' && req.url === '/' + webpackBundleFileName) {
          const stat = fs.statSync(webpackBundleFullPath);
          res.writeHead(200, {
            'Content-Type': 'application/javascript',
            'Content-Length': stat.size,
          });

          const readStream = fs.createReadStream(webpackBundleFullPath);
          readStream.pipe(res);

          return;
        }

        yoga(req, res);
      })
      .on('connection', socket => {
        sockets.add(socket);
        socket.once('close', () => {
          sockets.delete(socket);
        });
      });

    const { port } = await new Promise<AddressInfo>(resolve => {
      httpServer.listen(0, () => {
        resolve(httpServer.address() as AddressInfo);
      });
    });
    httpAddress = `http://localhost:${port}`;
    browser = await puppeteer.launch({
      // headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--incognito'],
    });
    page = await browser.newPage();
    await page.goto(httpAddress);
  });

  afterAll(async () => {
    if (page) {
      await page.close().catch(e => {
        console.warn('Error closing page', e, 'ignoring');
      });
    }
    if (browser) {
      await browser.close();
    }
    await new Promise<void>((resolve, reject) => {
      for (const socket of sockets) {
        socket.destroy();
      }
      if (httpServer) {
        if (!globalThis.Bun) {
          httpServer.closeAllConnections();
        }
        httpServer.close(err => {
          if (err) return reject(err);
          resolve();
        });
      } else {
        resolve();
      }
    });
    if (fs.existsSync(webpackBundleFullPath)) {
      await fs.promises.unlink(webpackBundleFullPath);
    }
  });

  it('can be exposed as a global', async () => {
    const result = await page.evaluate(() => {
      return typeof window.GraphQLToolsUrlLoader;
    });
    expect(result).toEqual('object');
  });

  it('can be used for executing a basic http query operation', async () => {
    const expectedData = {
      data: {
        foo: true,
      },
    };
    const document = parse(/* GraphQL */ `
      query {
        foo
      }
    `);

    const result = await page.evaluate(
      (httpAddress, document) => {
        const module = window.GraphQLToolsUrlLoader;
        const loader = new module.UrlLoader();
        const executor = loader.getExecutorAsync(httpAddress + '/graphql');
        return executor({
          document,
        });
      },
      httpAddress,
      document,
    );
    expect(result).toStrictEqual(expectedData);
  });

  it('handles executing a @defer operation using multipart responses', async () => {
    const document = parse(/* GraphQL */ `
      query {
        ... on Query @defer {
          foo
        }
      }
    `);

    const results = await page.evaluate(
      async (httpAddress, document) => {
        const module = window.GraphQLToolsUrlLoader;
        const loader = new module.UrlLoader();
        const executor = loader.getExecutorAsync(httpAddress + '/graphql');
        const result = await executor({
          document,
        });
        if (!(Symbol.asyncIterator in result)) {
          throw new Error('Expected an async iterator');
        }
        const results: ExecutionResult[] = [];
        for await (const currentResult of result) {
          if (currentResult) {
            results.push(JSON.parse(JSON.stringify(currentResult)));
          }
        }
        return results;
      },
      httpAddress,
      document,
    );
    expect(results).toEqual([{ data: {} }, { data: { foo: true } }]);
  });

  it('handles executing a @stream operation using multipart responses', async () => {
    const document = parse(/* GraphQL */ `
      query {
        countdown(from: 3) @stream
      }
    `);

    const results = await page.evaluate(
      async (httpAddress, document) => {
        const module = window.GraphQLToolsUrlLoader;
        const loader = new module.UrlLoader();
        const executor = loader.getExecutorAsync(httpAddress + '/graphql');
        const result = await executor({
          document,
        });
        if (!(Symbol.asyncIterator in result)) {
          throw new Error('Expected an async iterator');
        }
        const results: ExecutionResult[] = [];
        for await (const currentResult of result) {
          if (currentResult) {
            results.push(JSON.parse(JSON.stringify(currentResult)));
          }
        }
        return results;
      },
      httpAddress,
      document,
    );

    expect(results[0]).toEqual({ data: { countdown: [] } });
    expect(results[1]).toEqual({ data: { countdown: [3] } });
    expect(results[2]).toEqual({ data: { countdown: [3, 2] } });
    expect(results[3]).toEqual({ data: { countdown: [3, 2, 1] } });
    expect(results[4]).toEqual({ data: { countdown: [3, 2, 1, 0] } });
  });

  it('handles SSE subscription operations', async () => {
    const expectedDatas = [{ data: { foo: true } }, { data: { foo: false } }];

    const document = parse(/* GraphQL */ `
      subscription {
        foo
      }
    `);

    const result = await page.evaluate(
      async (httpAddress, document) => {
        const module = window.GraphQLToolsUrlLoader;
        const loader = new module.UrlLoader();
        const executor = loader.getExecutorAsync(httpAddress + '/graphql', {
          subscriptionsProtocol: module.SubscriptionProtocol.SSE,
        });
        const result = await executor({
          document,
        });
        if (!(Symbol.asyncIterator in result)) {
          throw new Error('Expected an async iterator');
        }
        const results: ExecutionResult[] = [];
        for await (const currentResult of result) {
          results.push(currentResult);
        }
        return results;
      },
      httpAddress,
      document,
    );
    expect(result).toStrictEqual(expectedDatas);
  });
  it('terminates SSE subscriptions when calling return on the AsyncIterator', async () => {
    const sentDatas = [{ data: { foo: true } }, { data: { foo: false } }, { data: { foo: true } }];

    const document = parse(/* GraphQL */ `
      subscription {
        foo
      }
    `);

    const pageerrorFn = jest.fn();
    page.on('pageerror', pageerrorFn);

    const result = await page.evaluate(
      async (httpAddress, document) => {
        const module = window.GraphQLToolsUrlLoader;
        const loader = new module.UrlLoader();
        const executor = loader.getExecutorAsync(httpAddress + '/graphql', {
          subscriptionsProtocol: module.SubscriptionProtocol.SSE,
        });
        const result = await executor({
          document,
        });
        if (!(Symbol.asyncIterator in result)) {
          throw new Error('Expected an async iterator');
        }
        const results: ExecutionResult[] = [];
        for await (const currentResult of result) {
          results.push(currentResult);
          if (results.length === 2) {
            break;
          }
        }
        return results;
      },
      httpAddress,
      document,
    );

    expect(result).toStrictEqual(sentDatas.slice(0, 2));

    // no uncaught errors should be reported (browsers raise errors when canceling requests)
    expect(pageerrorFn).not.toBeCalled();
  });
  const testIf = (condition: boolean) => (condition ? it : it.skip);
  testIf(!globalThis.Bun)('terminates stream correctly', async () => {
    const document = parse(/* GraphQL */ `
      query {
        fakeStream @stream
      }
    `);

    const pageerrorFn = jest.fn();
    page.once('pageerror', pageerrorFn);

    const currentResult: ExecutionResult = await page.evaluate(
      async (httpAddress, document) => {
        const module = window.GraphQLToolsUrlLoader;
        const loader = new module.UrlLoader();
        const executor = loader.getExecutorAsync(httpAddress + '/graphql');
        const result = await executor({
          document,
        });
        if (!(Symbol.asyncIterator in result)) {
          throw new Error('Expected an async iterator');
        }
        for await (const currentResult of result) {
          if (currentResult?.data?.fakeStream?.length > 1) {
            return JSON.parse(JSON.stringify(currentResult));
          }
        }
      },
      httpAddress,
      document,
    );

    await fakeAsyncIterableReturnDeferred.promise;

    page.off('pageerror', pageerrorFn);

    // no uncaught errors should be reported (browsers raise errors when canceling requests)
    expect(pageerrorFn).not.toHaveBeenCalled();

    expect(currentResult).toEqual({
      data: {
        fakeStream: [true, true],
      },
    });
  });
});
