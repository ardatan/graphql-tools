import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { parse } from 'graphql';
import { useServer } from 'graphql-ws/lib/use/ws';
import { Repeater } from 'graphql-yoga';
import { WebSocketServer } from 'ws'; // yarn add ws

import { buildGraphQLWSExecutor } from '@graphql-tools/executor-graphql-ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Executor, isAsyncIterable } from '@graphql-tools/utils';
import { assertAsyncIterable } from '../../../loaders/url/tests/test-utils';

describe('GraphQL WS Executor', () => {
  let server: Server;
  let executor: Executor;
  beforeAll(async () => {
    server = createServer();
    const websocketServer = new WebSocketServer({
      path: '/graphql',
      server,
    });

    useServer(
      {
        schema: makeExecutableSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              hello: String
            }
            type Subscription {
              count(to: Int): Int
            }
          `,
          resolvers: {
            Query: {
              hello: () => 'world',
            },
            Subscription: {
              count: {
                subscribe(_, { to }: { to: number }) {
                  return new Repeater((push, stop) => {
                    let i = 0;
                    let closed = false;
                    let timeout: NodeJS.Timeout;
                    const pump = async () => {
                      if (closed) {
                        return;
                      }
                      await push({ count: i });
                      if (i++ < to) {
                        timeout = setTimeout(pump, 150);
                      } else {
                        stop();
                      }
                    };
                    stop.then(() => {
                      closed = true;
                      clearTimeout(timeout);
                    });
                    pump();
                  });
                },
              },
            },
          },
        }),
      },
      websocketServer,
    );

    await new Promise<void>(resolve => server.listen(0, resolve));
    executor = buildGraphQLWSExecutor({
      url: `ws://localhost:${(server.address() as AddressInfo).port}/graphql`,
    });
  });
  afterAll(done => {
    server.closeAllConnections();
    server.close(done);
  });
  it('should return a promise of an execution result for regular queries', async () => {
    const result = await executor({
      document: parse(/* GraphQL */ `
        query {
          hello
        }
      `),
    });
    if (isAsyncIterable(result)) {
      throw new Error('Expected result to be a promise, but it was an async iterable');
    }
    expect(result).toMatchObject({
      data: {
        hello: 'world',
      },
    });
  });
  it('should return an async iterable of the execution result for subscriptions', async () => {
    const result = await executor({
      document: parse(/* GraphQL */ `
        subscription {
          count(to: 3)
        }
      `),
    });
    if (!isAsyncIterable(result)) {
      throw new Error('Expected result to be an async iterable, but it was a promise');
    }
    const results = [];
    for await (const item of result) {
      results.push(item);
    }
    expect(results).toMatchObject([
      { data: { count: 0 } },
      { data: { count: 1 } },
      { data: { count: 2 } },
      { data: { count: 3 } },
    ]);
  });
  it('should close connections when disposed', async () => {
    const result = await executor({
      document: parse(/* GraphQL */ `
        subscription {
          count(to: 4)
        }
      `),
    });
    assertAsyncIterable(result);
    for await (const item of result) {
      if (item.data?.count === 2) {
        await executor[Symbol.asyncDispose]();
      }
      if (item.data?.count === 3) {
        throw new Error('Expected connection to be closed before receiving the third item');
      }
    }
  });
});
