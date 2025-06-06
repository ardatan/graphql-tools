import { setTimeout } from 'timers/promises';
import { createSchema, createYoga } from 'graphql-yoga';
import { pipe, toObservable } from 'wonka';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { ExecutionResult } from '@graphql-tools/utils';
import { createClient } from '@urql/core';
import { AsyncDisposableStack } from '@whatwg-node/disposablestack';
import { testIf } from '../../../testing/utils.js';
import { executorExchange } from '../src/index.js';

describe('URQL Yoga Exchange', () => {
  const asyncDisposableStack = new AsyncDisposableStack();
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
          alphabet: String
        }
      `,
      resolvers: {
        Query: {
          hello: async () => 'Hello Urql Client!',
        },
        Mutation: {
          readFile: async (_, args: { file: File }) => args.file.text(),
        },
        Subscription: {
          alphabet: {
            async *subscribe() {
              let i = 0;
              while (true) {
                const aCharCode = 'a'.charCodeAt(0);
                yield String.fromCharCode(aCharCode + i);
                await setTimeout(300);
                i++;
              }
            },
            resolve: str => str,
          },
        },
      },
    }),
  });
  asyncDisposableStack.use(yoga);

  const executor = buildHTTPExecutor({
    endpoint: 'http://localhost:4000/graphql',
    fetch: yoga.fetch,
    File: yoga.fetchAPI.File,
    FormData: yoga.fetchAPI.FormData,
  });
  asyncDisposableStack.use(executor);
  const client = createClient({
    url: 'http://localhost:4000/graphql',
    exchanges: [executorExchange(executor)],
  });

  afterAll(() => asyncDisposableStack.disposeAsync());

  it('should handle queries correctly', async () => {
    const result = await client
      .query(
        /* GraphQL */ `
          query Greetings {
            hello
          }
        `,
        {},
      )
      .toPromise();
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      hello: 'Hello Urql Client!',
    });
  });
  testIf(!process.env['LEAK_TEST'] && !globalThis.Bun)(
    'should handle subscriptions correctly',
    async () => {
      const observable = pipe(
        client.subscription(
          /* GraphQL */ `
            subscription Alphabet {
              alphabet
            }
          `,
          {},
        ),
        toObservable,
      );

      const collectedValues: string[] = [];
      let i = 0;
      await new Promise<void>((resolve, reject) => {
        const subscription = observable.subscribe({
          next: (result: ExecutionResult) => {
            collectedValues.push(result.data?.alphabet as string);
            i++;
            if (i > 2) {
              subscription.unsubscribe();
              resolve();
            }
          },
          complete: () => {
            resolve();
          },
          error: (error: Error) => {
            reject(error);
          },
        });
      });
      expect(collectedValues).toEqual(['a', 'b', 'c']);
      expect(i).toBe(3);
    },
  );
  test('should handle file uploads correctly', async () => {
    const query = /* GraphQL */ `
      mutation readFile($file: File!) {
        readFile(file: $file)
      }
    `;
    const result = await client
      .mutation(query, {
        file: new yoga.fetchAPI.File(['Hello World'], 'file.txt', { type: 'text/plain' }),
      })
      .toPromise();
    expect(result.error).toBeFalsy();
    expect(result.data).toEqual({
      readFile: 'Hello World',
    });
  });
});
