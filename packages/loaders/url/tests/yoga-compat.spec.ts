import { normalizedExecutor } from '@graphql-tools/executor';
import { parse } from 'graphql';
import { assertAsyncIterable, sleep } from './test-utils';
import http, { createServer } from 'http';
import { SubscriptionProtocol, UrlLoader } from '../src';
import { GraphQLLiveDirectiveSDL, useLiveQuery } from '@envelop/live-query';
import { InMemoryLiveQueryStore } from '@n1ru4l/in-memory-live-query-store';
import { LiveExecutionResult } from '@n1ru4l/graphql-live-query';
import { ExecutionResult } from '@graphql-tools/utils';
import { createYoga, createSchema, useEngine } from 'graphql-yoga';

describe('Yoga Compatibility', () => {
  const loader = new UrlLoader();
  let httpServer: http.Server;
  const liveQueryStore = new InMemoryLiveQueryStore();
  let serverPort: number;
  let serverHost: string;
  let serverPath: string;
  let active = false;
  let cnt = 0;

  beforeAll(async () => {
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          ${GraphQLLiveDirectiveSDL}
          type Query {
            foo: Foo
            cnt: Int
          }
          type Foo {
            a: Int
            b: Int
          }
          type Subscription {
            foo: Int
          }
        `,
        resolvers: {
          Query: {
            foo: () => ({}),
            cnt: () => cnt,
          },
          Foo: {
            a: () => new Promise(resolve => setTimeout(() => resolve(1), 300)),
            b: () => new Promise(resolve => setTimeout(() => resolve(2), 600)),
          },
          Subscription: {
            foo: {
              async *subscribe() {
                for (let i = 1; i <= 3; i++) {
                  await sleep(300);
                  yield { foo: i };
                }
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
        useLiveQuery({
          liveQueryStore,
        }),
      ],
    });
    httpServer = createServer(yoga);
    await new Promise<void>(resolve => httpServer.listen(0, resolve));
    serverPort = (httpServer.address() as any).port;
    serverHost = 'http://localhost:' + serverPort;
    serverPath = new URL(yoga.graphqlEndpoint, serverHost).toString();
    function pump() {
      if (active) {
        cnt++;
        liveQueryStore.invalidate('Query.cnt').then(() => {
          setTimeout(pump, 300);
        });
      }
    }
    active = true;
    pump();
  });

  afterAll(async () => {
    active = false;
    if (httpServer !== undefined) {
      await new Promise<void>(resolve => httpServer.close(() => resolve()));
    }
  });

  it('should handle multipart response result', async () => {
    expect.assertions(5);
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

    const executor = loader.getExecutorAsync(serverPath);
    const result = await executor({
      document: parse(/* GraphQL */ `
        query {
          foo {
            ... on Foo @defer {
              a
            }
            ... on Foo @defer {
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
  });

  it('should handle SSE subscription result', async () => {
    const expectedDatas: ExecutionResult[] = [{ data: { foo: 1 } }, { data: { foo: 2 } }, { data: { foo: 3 } }];

    const executor = loader.getExecutorAsync(serverPath, {
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
    const sentDatas: ExecutionResult[] = [{ data: { foo: 1 } }, { data: { foo: 2 } }, { data: { foo: 3 } }];

    const executor = loader.getExecutorAsync(serverPath, {
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
  it('should handle live queries', async () => {
    const executor = loader.getExecutorAsync(serverPath, {
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
