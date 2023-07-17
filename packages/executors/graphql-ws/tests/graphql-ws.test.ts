import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { parse } from 'graphql';
import { useServer } from 'graphql-ws/lib/use/ws';
import { WebSocketServer } from 'ws'; // yarn add ws

import { buildGraphQLWSExecutor } from '@graphql-tools/executor-graphql-ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Executor, isAsyncIterable } from '@graphql-tools/utils';

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
                subscribe: async function* (_root, { to }) {
                  for (let i = 0; i < to; i++) {
                    yield { count: i };
                  }
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
  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
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
    ]);
  });
});
