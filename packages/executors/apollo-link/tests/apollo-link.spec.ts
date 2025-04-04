import { setTimeout } from 'timers/promises';
import { parse } from 'graphql';
import { createSchema, createYoga, DisposableSymbols, Repeater } from 'graphql-yoga';
import { ApolloClient, FetchResult, InMemoryCache } from '@apollo/client/core';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { createDeferred } from '@graphql-tools/utils';
import { testIf } from '../../../testing/utils.js';
import { ExecutorLink } from '../src/index.js';

describe('Apollo Link', () => {
  const { promise: waitForPingStop, resolve: pingStop } = createDeferred<void>();
  const yoga = createYoga({
    logging: false,
    maskedErrors: false,
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        scalar File
        type Query {
          hello: String
        }
        type Mutation {
          readFile(file: File!): String!
        }
        type Subscription {
          time: String
          ping: String
        }
      `,
      resolvers: {
        Query: {
          hello: () => 'Hello Apollo Client!',
        },
        Mutation: {
          readFile: (_, args: { file: File }) => args.file.text(),
        },
        Subscription: {
          time: {
            async *subscribe() {
              while (true) {
                await setTimeout(300);
                yield new Date().toISOString();
              }
            },
            resolve: str => str,
          },
          ping: {
            subscribe: () =>
              new Repeater(async (_pull, stop) => {
                await stop;
                pingStop();
              }),
          },
        },
      },
    }),
  });

  const executor = buildHTTPExecutor({
    endpoint: `http://localhost${yoga.graphqlEndpoint}`,
    fetch: yoga.fetch,
    File: yoga.fetchAPI.File,
    FormData: yoga.fetchAPI.FormData,
  });
  const client = new ApolloClient({
    link: new ExecutorLink(executor),
    cache: new InMemoryCache(),
  });

  afterAll(async () => {
    await executor[DisposableSymbols.asyncDispose]();
    client.stop();
    await client.clearStore();
  });

  it('should handle queries correctly', async () => {
    const result = await client.query({
      query: parse(/* GraphQL */ `
        query Greetings {
          hello
        }
      `),
    });
    expect(result.error).toBeUndefined();
    expect(result.errors?.length).toBeFalsy();
    expect(result.data).toEqual({
      hello: 'Hello Apollo Client!',
    });
  });
  testIf(!process.env['LEAK_TEST'] && !globalThis.Bun)(
    'should handle subscriptions correctly',
    async () => {
      expect.assertions(5);
      const observable = client.subscribe({
        query: parse(/* GraphQL */ `
          subscription Time {
            time
          }
        `),
      });
      const collectedValues: string[] = [];
      let i = 0;
      await new Promise<void>((resolve, reject) => {
        const subscription = observable.subscribe((result: FetchResult) => {
          collectedValues.push(result.data?.['time']);
          i++;
          if (i > 2) {
            subscription.unsubscribe();
            resolve();
          }
        }, reject);
      });
      expect(collectedValues.length).toBe(3);
      expect(i).toBe(3);
      const now = new Date();
      for (const value of collectedValues) {
        expect(new Date(value).getFullYear()).toBe(now.getFullYear());
      }
    },
  );
  it('should handle file uploads correctly', async () => {
    const result = await client.mutate({
      mutation: parse(/* GraphQL */ `
        mutation readFile($file: File!) {
          readFile(file: $file)
        }
      `),
      variables: {
        file: new yoga.fetchAPI.File(['Hello World'], 'file.txt', { type: 'text/plain' }),
      },
    });
    expect(result.errors?.length).toBeFalsy();
    expect(result.data).toEqual({
      readFile: 'Hello World',
    });
  });
  testIf(!globalThis.Bun)(
    'should complete subscription even while waiting for events',
    async () => {
      const observable = client.subscribe({
        query: parse(/* GraphQL */ `
          subscription Ping {
            ping
          }
        `),
      });
      const sub = observable.subscribe({
        next: () => {
          // noop
        },
      });
      globalThis.setTimeout(() => sub.unsubscribe(), 0);
      await waitForPingStop;
    },
  );
});
