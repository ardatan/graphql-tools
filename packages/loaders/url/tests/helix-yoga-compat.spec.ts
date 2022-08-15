import { execute, ExecutionResult, parse } from '@graphql-tools/graphql';
import { assertAsyncIterable, sleep } from './test-utils';
import http from 'http';
import { SubscriptionProtocol, UrlLoader } from '../src';
import { GraphQLLiveDirectiveSDL } from '@envelop/live-query';
import { InMemoryLiveQueryStore } from '@n1ru4l/in-memory-live-query-store';
import { LiveExecutionResult } from '@n1ru4l/graphql-live-query';
import { isAsyncIterable } from '@graphql-tools/utils';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('helix/yoga compat', () => {
  const loader = new UrlLoader();
  let httpServer: http.Server;

  afterEach(async () => {
    if (httpServer !== undefined) {
      await new Promise<void>(resolve => httpServer.close(() => resolve()));
    }
  });

  it('should handle multipart response result', async () => {
    const chunkDatas = [
      { data: { foo: {} }, hasNext: true },
      { data: { a: 1 }, path: ['foo'], hasNext: true },
      { data: { a: 1, b: 2 }, path: ['foo'], hasNext: false },
    ];
    const expectedDatas: ExecutionResult[] = [
      {
        data: {
          foo: {},
        },
      },
      {
        data: {
          foo: {
            a: 1,
          },
        },
      },
      {
        data: {
          foo: {
            a: 1,
            b: 2,
          },
        },
      },
    ];
    const serverPort = 1335;
    const serverHost = 'http://localhost:' + serverPort;
    let receivedAcceptHeader: string | undefined;
    httpServer = http.createServer((req, res) => {
      receivedAcceptHeader = req.headers['accept'];
      res.writeHead(200, {
        // prettier-ignore
        "Connection": "keep-alive",
        'Content-Type': 'multipart/mixed; boundary="-"',
        'Transfer-Encoding': 'chunked',
      });

      res.write(`---`);

      chunkDatas.forEach(chunkData =>
        sleep(300).then(() => {
          const chunk = Buffer.from(JSON.stringify(chunkData), 'utf8');
          const data = ['', 'Content-Type: application/json; charset=utf-8', '', chunk, '', `---`];
          res.write(data.join('\r\n'));
        })
      );

      sleep(1000).then(() => {
        res.write('\r\n-----\r\n');
        res.end();
      });
    });
    await new Promise<void>(resolve => httpServer.listen(serverPort, resolve));

    const executor = loader.getExecutorAsync(serverHost);
    const result = await executor({
      document: parse(/* GraphQL */ `
        query {
          foo {
            ... on Foo @defer {
              a
              b
            }
          }
        }
      `),
    });

    assertAsyncIterable(result);
    for await (const data of result) {
      expect(data).toEqual(expectedDatas.shift()!);
    }
    expect(expectedDatas.length).toBe(0);
    expect(receivedAcceptHeader).toBe('application/json');
  });

  it('should handle SSE subscription result', async () => {
    const expectedDatas: ExecutionResult[] = [{ data: { foo: 1 } }, { data: { foo: 2 } }, { data: { foo: 3 } }];
    const serverPort = 1336;
    const serverHost = 'http://localhost:' + serverPort;

    httpServer = http.createServer((_, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        // prettier-ignore
        "Connection": "keep-alive",
        'Cache-Control': 'no-cache',
      });

      expectedDatas.forEach(result => sleep(300).then(() => res.write(`data: ${JSON.stringify(result)}\n\n`)));

      sleep(1000).then(() => res.end());
    });

    await new Promise<void>(resolve => httpServer.listen(serverPort, () => resolve()));

    const executor = loader.getExecutorAsync(`${serverHost}/graphql`, {
      subscriptionsProtocol: SubscriptionProtocol.SSE,
    });
    const result = await executor({
      document: parse(/* GraphQL */ `
        subscription {
          foo
        }
      `),
    });
    assertAsyncIterable(result);

    for await (const singleResult of result) {
      expect(singleResult).toStrictEqual(expectedDatas.shift()!);
    }
    expect(expectedDatas.length).toBe(0);
  });
  it('terminates SSE subscriptions when calling return on the AsyncIterable', async () => {
    const sentDatas: ExecutionResult[] = [
      { data: { foo: 0 } },
      { data: { foo: 1 } },
      { data: { foo: 2 } },
      { data: { foo: 3 } },
    ];
    const serverPort = 1336 + Math.floor(Math.random() * 5);
    const serverHost = 'http://localhost:' + serverPort;

    httpServer = http.createServer((_, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        // prettier-ignore
        "Connection": "keep-alive",
        'Cache-Control': 'no-cache',
      });

      let foo = 0;
      const ping = setInterval(() => {
        // Ping
        res.write(
          `data: ${JSON.stringify({
            data: {
              foo,
            },
          })}\n\n`
        );
        foo++;
      }, 300);
      res.once('close', () => {
        clearInterval(ping);
      });
    });

    await new Promise<void>(resolve => httpServer.listen(serverPort, () => resolve()));

    const executor = loader.getExecutorAsync(`${serverHost}/graphql`, {
      subscriptionsProtocol: SubscriptionProtocol.SSE,
    });
    const result = await executor({
      document: parse(/* GraphQL */ `
        subscription {
          foo
        }
      `),
    });
    assertAsyncIterable(result);

    for await (const singleResult of result) {
      const expectedData = sentDatas.shift();
      if (expectedData == null) {
        break;
      }
      expect(singleResult).toStrictEqual(expectedData);
    }

    expect(sentDatas.length).toBe(0);
  });
  describe('live queries', () => {
    const urlLoader = new UrlLoader();
    let active = false;
    let cnt = 0;
    beforeAll(async () => {
      const liveQueryStore = new InMemoryLiveQueryStore();
      function pump() {
        if (active) {
          cnt++;
          liveQueryStore.invalidate('Query.cnt').then(() => {
            setTimeout(pump, 100);
          });
        }
      }
      active = true;
      pump();
      // @ts-expect-error Uses graphql-js so it doesn't like us
      const liveExecute = liveQueryStore.makeExecute(execute);
      const schema = makeExecutableSchema({
        typeDefs: [
          /* GraphQL */ `
            type Query {
              cnt: Int!
            }
          `,
          GraphQLLiveDirectiveSDL,
        ],
        resolvers: {
          Query: {
            cnt: () => cnt,
          },
        },
      });
      httpServer = http.createServer((req, res) => {
        let closed = false;
        res.on('close', () => {
          closed = true;
        });
        const queryParams = new URLSearchParams(req.url!.split('?')[1]);
        const query = queryParams.get('query')!;
        const variablesStr = queryParams.get('variables');
        let variables = {};
        if (variablesStr) {
          variables = JSON.parse(variablesStr);
        }
        // @ts-expect-error Uses graphql-js so it doesn't like us
        Promise.resolve(liveExecute({ schema, document: parse(query), variableValues: variables })).then(
          async result => {
            if (isAsyncIterable(result)) {
              res.writeHead(200, {
                'Content-Type': 'text/event-stream',
              });
              for await (const data of result) {
                if (closed) {
                  return;
                }
                res.write(`data: ${JSON.stringify(data)}\n\n`);
              }
              res.end();
              return;
            }
            res.writeHead(200, {
              'Content-Type': 'application/json',
            });
            res.end(JSON.stringify(result));
          }
        );
      });
      await new Promise<void>(resolve => httpServer.listen(9877, resolve));
    });
    afterAll(() => {
      active = false;
    });
    it('should handle live queries', async () => {
      const executor = urlLoader.getExecutorAsync(`http://localhost:9877/graphql`, {
        subscriptionsProtocol: SubscriptionProtocol.SSE,
      });
      const result = await executor({
        document: parse(/* GraphQL */ `
          query Count @live {
            cnt
          }
        `),
      });
      assertAsyncIterable(result);
      for await (const singleResult of result) {
        expect(singleResult.data.cnt).toBe(cnt);
        expect((singleResult as LiveExecutionResult).isLive);
        if (cnt >= 3) {
          break;
        }
      }
    });
  });
});
