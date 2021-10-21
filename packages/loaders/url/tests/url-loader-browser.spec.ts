import webpack from 'webpack';
import path from 'path';
import fs from 'fs';
import http from 'http';
import puppeteer from 'puppeteer';
import type { UrlLoader } from '../src';
import { parse } from 'graphql';

describe('[url-loader] webpack bundle compat', () => {
  let httpServer: http.Server;
  let browser: puppeteer.Browser;
  let page: puppeteer.Page | undefined;
  const port = 8712;
  const httpAddress = 'http://localhost:8712';
  const webpackBundlePath = path.resolve(__dirname, 'webpack.js');
  let graphqlHandler: http.RequestListener | undefined;

  beforeAll(async () => {
    // bundle webpack js
    await new Promise<void>((resolve, reject) => {
      webpack(
        {
          entry: path.resolve(__dirname, '..', 'dist', 'index.mjs'),
          output: {
            path: path.resolve(__dirname),
            filename: 'webpack.js',
            libraryTarget: 'umd',
            library: 'GraphQLToolsUrlLoader',
            umdNamedDefine: true,
          },
          optimization: {
            minimize: false,
          },
          plugins: [
            new webpack.DefinePlugin({
              'process.env.NODE_ENV': JSON.stringify('production'),
              'process.env.NODE_DEBUG': 'undefined',
              setImmediate: 'setTimeout',
            }),
          ],
        },
        err => {
          if (err) return reject(err);
          resolve();
        }
      );
    });

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
        console.log('fetch webpack bundle...');
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
    graphqlHandler = (_req, res) => {
      res.writeHead(200, {
        'Content-Type': 'application/json',
      });
      res.write(
        JSON.stringify({
          data: {
            foo: true,
          },
        })
      );
      res.end();
    };
    const document = parse(/* GraphQL */ `
      query {
        foo
      }
    `);

    const result = await page.evaluate(
      async (httpAddress, document) => {
        const UrlLoaderClass = window['GraphQLToolsUrlLoader'].UrlLoader as typeof UrlLoader;
        const loader = new UrlLoaderClass();
        const executor = loader.buildHTTPExecutor(httpAddress + '/graphql', window.fetch);
        const result = await executor({
          document,
          operationType: 'query',
        });
        return result;
      },
      httpAddress,
      document as any
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "foo": true,
        },
      }
    `);
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
        const UrlLoaderClass = window['GraphQLToolsUrlLoader'].UrlLoader as typeof UrlLoader;
        const loader = new UrlLoaderClass();
        const executor = loader.buildHTTPExecutor(httpAddress + '/graphql', window.fetch);
        const result = await executor({
          document,
          operationType: 'query',
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
    expect(result).toEqual([
      { data: {} },
      { data: { foo: true} }
    ]);
  });

  it('handles SSE subscription operations', async() => {
    page = await browser.newPage();
    await page.goto(httpAddress);

    graphqlHandler = async (_req, res) => {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        // prettier-ignore
        "Connection": "keep-alive",
        "Cache-Control": "no-cache",
      });

      res.write(`data: ${JSON.stringify({ data: { foo: true }})}\n\n`)
      res.write(`data: ${JSON.stringify({ data: { foo: false }})}\n\n`)

      res.end();
    };

    const document = parse(/* GraphQL */ `
      subscription {
        foo
      }
    `);

    const result = await page.evaluate(
      async (httpAddress, document) => {
        const UrlLoaderClass = window['GraphQLToolsUrlLoader'].UrlLoader as typeof UrlLoader;
        const loader = new UrlLoaderClass();
        const executor = loader.buildHTTPExecutor(httpAddress + '/graphql', window.fetch);
        const result = await executor({
          document,
          operationType: 'query',
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
    expect(result).toEqual([
      { data: { foo: true } },
      { data: { foo: false } }
    ]);
  })
});
