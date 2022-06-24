import webpack, { Stats } from 'webpack';
import path from 'path';
import fs from 'fs';
import http from 'http';
import puppeteer from 'puppeteer';
import type * as UrlLoaderModule from '../src/index.js';
import { ExecutionResult, parse } from 'graphql';

describe('[url-loader] webpack bundle compat', () => {
  if (process.env['TEST_BROWSER']) {
    let httpServer: http.Server;
    let browser: puppeteer.Browser;
    let page: puppeteer.Page | undefined;
    const port = 8712;
    const httpAddress = 'http://localhost:8712';
    const webpackBundlePath = path.resolve(__dirname, 'webpack.js');
    let graphqlHandler: http.RequestListener | undefined;

    beforeAll(async () => {
      // bundle webpack js
      const stats = await new Promise<Stats | undefined>((resolve, reject) => {
        webpack(
          {
            mode: 'development',
            entry: path.resolve(__dirname, '..', 'dist', 'index.mjs'),
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

        if (graphqlHandler) {
          graphqlHandler(req, res);
          return;
        }

        res.writeHead(404, 'Not found :(');
      });

      await new Promise<void>(resolve => {
        httpServer.listen(port, () => {
          resolve();
        });
      });
      browser = await puppeteer.launch({
        // headless: false,
      });
    }, 90_000);

    beforeEach(async () => {
      if (page !== undefined) {
        await page.close();
        page = undefined;
      }
      graphqlHandler = undefined;
    });

    afterAll(async () => {
      await browser.close();
      await new Promise<void>((resolve, reject) => {
        httpServer.close(err => {
          if (err) return reject(err);
          resolve();
        });
      });
    });

    it('can be exposed as a global', async () => {
      page = await browser.newPage();
      await page.goto(httpAddress);
      const result = await page.evaluate(async () => {
        return typeof window['GraphQLToolsUrlLoader'];
      });
      expect(result).toEqual('object');
    });

    it('can be used for executing a basic http query operation', async () => {
      page = await browser.newPage();
      await page.goto(httpAddress);
      const expectedData = {
        data: {
          foo: true,
        },
      };
      graphqlHandler = (_req, res) => {
        res.writeHead(200, {
          'Content-Type': 'application/json',
        });
        res.write(JSON.stringify(expectedData));
        res.end();
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
          const executor = await loader.getExecutorAsync(httpAddress + '/graphql');
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

    it('handles executing a operation using multipart responses', async () => {
      page = await browser.newPage();
      await page.goto(httpAddress);
      graphqlHandler = async (_req, res) => {
        res.writeHead(200, {
          // prettier-ignore
          "Connection": "keep-alive",
          'Content-Type': 'multipart/mixed; boundary="-"',
          'Transfer-Encoding': 'chunked',
        });
        res.write(`---`);
        let chunk = Buffer.from(JSON.stringify({ data: {} }), 'utf8');
        let data = ['', 'Content-Type: application/json; charset=utf-8', '', chunk, '', `---`];
        res.write(data.join('\r\n'));
        await new Promise(resolve => setTimeout(resolve, 300));
        chunk = Buffer.from(JSON.stringify({ data: true, path: ['foo'] }), 'utf8');
        data = ['', 'Content-Type: application/json; charset=utf-8', '', chunk, '', `---`];
        res.write(data.join('\r\n'));
        res.end();
      };

      const document = parse(/* GraphQL */ `
        query {
          ... on Query @defer(label: "foo") {
            foo
          }
        }
      `);

      const result = await page.evaluate(
        async (httpAddress, document) => {
          const module = window['GraphQLToolsUrlLoader'] as typeof UrlLoaderModule;
          const loader = new module.UrlLoader();
          const executor = await loader.getExecutorAsync(httpAddress + '/graphql');
          const result = await executor({
            document,
          });
          const results = [];
          for await (const currentResult of result as any) {
            results.push(JSON.parse(JSON.stringify(currentResult)));
          }
          return results;
        },
        httpAddress,
        document as any
      );
      expect(result).toEqual([{ data: {} }, { data: { foo: true } }]);
    });

    it('handles SSE subscription operations', async () => {
      page = await browser.newPage();
      await page.goto(httpAddress);

      const expectedDatas = [{ data: { foo: true } }, { data: { foo: false } }];

      graphqlHandler = async (_req, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          // prettier-ignore
          "Connection": "keep-alive",
          'Cache-Control': 'no-cache',
        });

        for (const data of expectedDatas) {
          await new Promise(resolve => setTimeout(resolve, 300));
          res.write(`data: ${JSON.stringify(data)}\n\n`);
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        res.end();
      };

      const document = parse(/* GraphQL */ `
        subscription {
          foo
        }
      `);

      const result = await page.evaluate(
        async (httpAddress, document) => {
          const module = window['GraphQLToolsUrlLoader'] as typeof UrlLoaderModule;
          const loader = new module.UrlLoader();
          const executor = await loader.getExecutorAsync(httpAddress + '/graphql', {
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
      page = await browser.newPage();
      await page.goto(httpAddress);

      const sentDatas = [{ data: { foo: true } }, { data: { foo: false } }, { data: { foo: true } }];

      let responseClosed$: Promise<boolean>;

      graphqlHandler = async (_req, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          // prettier-ignore
          "Connection": "keep-alive",
          'Cache-Control': 'no-cache',
        });

        responseClosed$ = new Promise(resolve => res.once('close', () => resolve(true)));

        const ping = setInterval(() => {
          // Ping
          res.write(':\n\n');
        }, 100);

        for (const data of sentDatas) {
          await new Promise(resolve => setTimeout(resolve, 300));
          res.write(`data: ${JSON.stringify(data)}\n\n`);
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        clearInterval(ping);
      };

      const document = parse(/* GraphQL */ `
        subscription {
          foo
        }
      `);

      const result = await page.evaluate(
        async (httpAddress, document) => {
          const module = window['GraphQLToolsUrlLoader'] as typeof UrlLoaderModule;
          const loader = new module.UrlLoader();
          const executor = await loader.getExecutorAsync(httpAddress + '/graphql', {
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

      expect(await responseClosed$!).toBe(true);

      expect(result).toStrictEqual(sentDatas.slice(0, 2));
    });
  } else {
    it('dummy', () => {});
  }
});
