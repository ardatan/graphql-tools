import { normalizedExecutor } from '@graphql-tools/executor';
import { parse } from 'graphql';
import { assertAsyncIterable, sleep } from './test-utils';
import http, { createServer } from 'http';
import { SubscriptionProtocol, UrlLoader } from '../src';
import { GraphQLLiveDirectiveSDL, useLiveQuery } from '@envelop/live-query';
import { InMemoryLiveQueryStore } from '@n1ru4l/in-memory-live-query-store';
import { LiveExecutionResult } from '@n1ru4l/graphql-live-query';
import { ExecutionResult } from '@graphql-tools/utils';
import { createYoga, createSchema, useEngine, Repeater } from 'graphql-yoga';
import { useDeferStream } from '@graphql-yoga/plugin-defer-stream';

describe('Yoga Compatibility', () => {
  const loader = new UrlLoader();
  let httpServer: http.Server;
  const liveQueryStore = new InMemoryLiveQueryStore();
  let serverPort: number;
  let serverHost: string;
  let serverPath: string;
  let active = false;
  let cnt = 0;
  const alphabet = [
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'i',
    'j',
    'k',
    'l',
    'm',
    'n',
    'o',
    'p',
    'q',
    'r',
    's',
    't',
    'u',
    'v',
    'w',
    'x',
    'y',
    'z',
  ];
  let intervalStreamActive = false;
  let streamActive = false;
  beforeAll(async () => {
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          ${GraphQLLiveDirectiveSDL}
          type Query {
            foo: Foo
            cnt: Int
            """
            Resolves the alphabet slowly. 1 character per second
            Maybe you want to @stream this field ;)
            """
            alphabet(waitFor: Int! = 1000): [String]
            pingStream: [Boolean]
            pingIntervalStream: [Boolean]
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
            async *alphabet(_, { waitFor }) {
              for (const character of alphabet) {
                yield character;
                await sleep(waitFor);
              }
            },
            pingStream: () =>
              new Repeater(async (push, stop) => {
                streamActive = true;
                stop.then(() => {
                  streamActive = false;
                });
                // eslint-disable-next-line no-unmodified-loop-condition
                while (streamActive) {
                  await sleep(300);
                  await push(true);
                }
              }),
            pingIntervalStream: () =>
              new Repeater(async (push, stop) => {
                intervalStreamActive = true;
                const interval = setInterval(() => {
                  push(true);
                }, 300);
                stop.then(() => {
                  clearInterval(interval);
                  intervalStreamActive = false;
                });
              }),
          },
          Foo: {
            a: async () => {
              await sleep(300);
              return 1;
            },
            b: async () => {
              await sleep(600);
              return 2;
            },
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
        useDeferStream(),
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

  it('should handle defer', async () => {
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

  it('should handle stream', async () => {
    const document = parse(/* GraphQL */ `
      query StreamAlphabet {
        alphabet(waitFor: 100) @stream
      }
    `);

    const executor = loader.getExecutorAsync(serverPath);
    const result = await executor({
      document,
    });

    assertAsyncIterable(result);

    let i = 0;
    let finalResult: ExecutionResult | undefined;
    for await (const chunk of result) {
      if (chunk) {
        expect(chunk.data?.alphabet?.length).toBe(i);
        i++;
        if (i > alphabet.length) {
          finalResult = chunk;
          break;
        }
      }
    }
    expect(finalResult?.data?.alphabet).toEqual(alphabet);
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
  it('terminates stream queries correctly with pingStream', async () => {
    expect.assertions(2);
    const executor = loader.getExecutorAsync(serverPath);
    const result = await executor({
      document: parse(/* GraphQL */ `
        query StreamExample {
          pingStream @stream
        }
      `),
    });
    assertAsyncIterable(result);
    for await (const singleResult of result) {
      if (singleResult?.data?.pingStream?.length > 1) {
        expect(streamActive).toBe(true);
        break;
      }
    }
    await sleep(300);
    expect(streamActive).toBe(false);
  });
  it('terminates stream queries correctly with pingIntervalStream', async () => {
    expect.assertions(2);
    const executor = loader.getExecutorAsync(serverPath);
    const result = await executor({
      document: parse(/* GraphQL */ `
        query StreamExample {
          pingIntervalStream @stream
        }
      `),
    });
    assertAsyncIterable(result);
    for await (const singleResult of result) {
      if (singleResult?.data?.pingIntervalStream?.length > 1) {
        expect(intervalStreamActive).toBe(true);
        break;
      }
    }
    await sleep(300);
    expect(intervalStreamActive).toBe(false);
  });
});
