import webpack, { Stats } from 'webpack';
import path from 'path';
import fs from 'fs';
import http from 'http';
import puppeteer from 'puppeteer';
import type * as UrlLoaderModule from '../src/index.js';
import { parse } from 'graphql';
import { ExecutionResult } from '@graphql-tools/utils';
import { createSchema, createYoga, Repeater, useEngine } from 'graphql-yoga';
import { useDeferStream } from '@graphql-yoga/plugin-defer-stream';
import { normalizedExecutor } from '@graphql-tools/executor';
import { sleep } from './test-utils.js';

describe('[url-loader] webpack bundle compat', () => {
  if (process.env['TEST_BROWSER']) {
    let httpServer: http.Server;
    let browser: puppeteer.Browser;
    let page: puppeteer.Page;
    let streamActive = false;
    const port = 8712;
    const httpAddress = 'http://localhost:8712';
    const webpackBundlePath = path.resolve(__dirname, 'webpack.js');
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            foo: Boolean
            countdown(from: Int): [Int]
            pingStream: [Boolean]
          }
          type Subscription {
            foo: Boolean
          }
        `,
        resolvers: {
          Query: {
            foo: () => new Promise(resolve => setTimeout(() => resolve(true), 300)),
            countdown: async function* (_, { from }) {
              for (let i = from; i >= 0; i--) {
                yield i;
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            },
            pingStream: () =>
              new Repeater(async (push, stop) => {
                streamActive = true;
                const interval = setInterval(() => {
                  push(true);
                }, 300);
                stop.then(() => {
                  clearInterval(interval);
                  streamActive = false;
                });
              }),
          },
          Subscription: {
            foo: {
              async *subscribe() {
                await new Promise(resolve => setTimeout(resolve, 300));
                yield { foo: true };
                await new Promise(resolve => setTimeout(resolve, 300));
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

    beforeAll(async () => {
      // bundle webpack js
      const stats = await new Promise<Stats | undefined>((resolve, reject) => {
        webpack(
          {
            mode: 'development',
            entry: path.resolve(__dirname, '..', 'dist', 'esm', 'index.js'),
            output: {
              path: path.resolve(__dirname),
              filename: 'webpack.js',
              libraryTarget: 'umd',
              library: 'GraphQLToolsUrlLoader',
              umdNamedDefine: true,
            },
            plugins: [
              new webpack.DefinePlugin({
                setImmediate: 'setTimeout',
              }),
            ],
          },
          (err, stats) => {
            if (err) return reject(err);
            resolve(stats);
          }
        );
      });

      if (stats?.hasErrors()) {
        console.error(stats.toString({ colors: true }));
      }

      httpServer = http.createServer((req, res) => {
        if (req.method === 'GET' && req.url === '/') {
          res.statusCode = 200;
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=UTF-8',
          });

          res.write(/** HTML */ `
          <html>
            <title>Url Loader Test</title>
            <body>
              <script src="/webpack.js"></script>
            </body>
          </html>
        `);
          res.end();
          return;
        }

        if (req.method === 'GET' && req.url === '/webpack.js') {
          const stat = fs.statSync(webpackBundlePath);
          res.writeHead(200, {
            'Content-Type': 'application/javascript',
            'Content-Length': stat.size,
          });

          const readStream = fs.createReadStream(webpackBundlePath);
          readStream.pipe(res);

          return;
        }

        yoga(req, res);
      });

      await new Promise<void>(resolve => {
        httpServer.listen(port, () => {
          resolve();
        });
      });
      browser = await puppeteer.launch({
        // headless: false,
      });
      page = await browser.newPage();
      await page.goto(httpAddress);
    }, 90_000);

    afterAll(async () => {
      await browser.close();
      await new Promise<void>((resolve, reject) => {
        httpServer.close(err => {
          if (err) return reject(err);
          resolve();
        });
      });
      await fs.promises.unlink(webpackBundlePath);
    });

    it('can be exposed as a global', async () => {
      const result = await page.evaluate(async () => {
        return typeof window['GraphQLToolsUrlLoader'];
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
        async (httpAddress, document) => {
          const module = window['GraphQLToolsUrlLoader'] as typeof UrlLoaderModule;
          const loader = new module.UrlLoader();
          const executor = loader.getExecutorAsync(httpAddress + '/graphql');
          const result = await executor({
            document,
          });
          return result;
        },
        httpAddress,
        document as any
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
          const module = window['GraphQLToolsUrlLoader'] as typeof UrlLoaderModule;
          const loader = new module.UrlLoader();
          const executor = loader.getExecutorAsync(httpAddress + '/graphql');
          const result = await executor({
            document,
          });
          const results = [];
          for await (const currentResult of result as any[]) {
            if (currentResult) {
              results.push(JSON.parse(JSON.stringify(currentResult)));
            }
          }
          return results;
        },
        httpAddress,
        document as any
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
          const module = window['GraphQLToolsUrlLoader'] as typeof UrlLoaderModule;
          const loader = new module.UrlLoader();
          const executor = loader.getExecutorAsync(httpAddress + '/graphql');
          const result = await executor({
            document,
          });
          const results = [];
          for await (const currentResult of result as any[]) {
            if (currentResult) {
              results.push(JSON.parse(JSON.stringify(currentResult)));
            }
          }
          return results;
        },
        httpAddress,
        document as any
      );

      expect(results).toEqual([
        { data: { countdown: [] } },
        { data: { countdown: [3] } },
        { data: { countdown: [3, 2] } },
        { data: { countdown: [3, 2, 1] } },
        { data: { countdown: [3, 2, 1, 0] } },
        { data: { countdown: [3, 2, 1, 0] } },
      ]);
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
          const module = window['GraphQLToolsUrlLoader'] as typeof UrlLoaderModule;
          const loader = new module.UrlLoader();
          const executor = loader.getExecutorAsync(httpAddress + '/graphql', {
            subscriptionsProtocol: module.SubscriptionProtocol.SSE,
          });
          const result = await executor({
            document,
          });
          const results = [];
          for await (const currentResult of result as AsyncIterable<ExecutionResult>) {
            results.push(currentResult);
          }
          return results;
        },
        httpAddress,
        document as any
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
          const module = window['GraphQLToolsUrlLoader'] as typeof UrlLoaderModule;
          const loader = new module.UrlLoader();
          const executor = loader.getExecutorAsync(httpAddress + '/graphql', {
            subscriptionsProtocol: module.SubscriptionProtocol.SSE,
          });
          const result = (await executor({
            document,
          })) as AsyncIterableIterator<ExecutionResult>;
          const results = [];
          for await (const currentResult of result) {
            results.push(currentResult);
            if (results.length === 2) {
              break;
            }
          }
          return results;
        },
        httpAddress,
        document as any
      );

      expect(result).toStrictEqual(sentDatas.slice(0, 2));

      // no uncaught errors should be reported (browsers raise errors when canceling requests)
      expect(pageerrorFn).not.toBeCalled();
    });
    it('terminates stream queries correctly', async () => {
      const document = parse(/* GraphQL */ `
        query {
          pingStream @stream
        }
      `);

      const pageerrorFn = jest.fn();
      page.on('pageerror', pageerrorFn);

      const currentResult = await page.evaluate(
        async (httpAddress, document) => {
          const module = window['GraphQLToolsUrlLoader'] as typeof UrlLoaderModule;
          const loader = new module.UrlLoader();
          const executor = loader.getExecutorAsync(httpAddress + '/graphql');
          const result = (await executor({
            document,
          })) as AsyncIterableIterator<ExecutionResult>;
          for await (const currentResult of result) {
            if (currentResult?.data?.pingStream) {
              return currentResult;
            }
          }
        },
        httpAddress,
        document as any
      );

      console.log(currentResult);

      expect(currentResult?.data?.pingStream).toBeTruthy();

      await sleep(500);

      expect(streamActive).toBe(false);

      // no uncaught errors should be reported (browsers raise errors when canceling requests)
      expect(pageerrorFn).not.toBeCalled();
    });
  } else {
    it('dummy', () => {});
  }
});
