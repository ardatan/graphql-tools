import { createClient } from '@urql/core';
import { executorExchange } from '../src/index.js';
import { pipe, toObservable } from 'wonka';
import { createYoga, createSchema } from 'graphql-yoga';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';

describe('URQL Yoga Exchange', () => {
  if (!process.env['TEST_BROWSER']) {
    it('skips', () => {});
    return;
  }
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
        }
      `,
      resolvers: {
        Query: {
          hello: () => 'Hello Urql Client!',
        },
        Mutation: {
          readFile: (_, args: { file: File }) => args.file.text(),
        },
        Subscription: {
          time: {
            async *subscribe() {
              while (true) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                yield new Date().toISOString();
              }
            },
            resolve: str => str,
          },
        },
      },
    }),
  });

  const client = createClient({
    url: 'http://localhost:4000/graphql',
    exchanges: [
      executorExchange(
        buildHTTPExecutor({
          fetch: yoga.fetch,
          File: yoga.fetchAPI.File,
          FormData: yoga.fetchAPI.FormData,
        })
      ),
    ],
  });

  it('should handle queries correctly', async () => {
    const result = await client
      .query(
        /* GraphQL */ `
          query Greetings {
            hello
          }
        `,
        {}
      )
      .toPromise();
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      hello: 'Hello Urql Client!',
    });
  });
  it('should handle subscriptions correctly', async () => {
    const observable = pipe(
      client.subscription(
        /* GraphQL */ `
          subscription Time {
            time
          }
        `,
        {}
      ),
      toObservable
    );

    const collectedValues: string[] = [];
    let i = 0;
    await new Promise<void>((resolve, reject) => {
      const subscription = observable.subscribe({
        next: result => {
          collectedValues.push(result.data?.time);
          i++;
          if (i > 2) {
            subscription.unsubscribe();
            resolve();
          }
        },
        complete: () => {
          resolve();
        },
        error: error => {
          reject(error);
        },
      });
    });
    expect(collectedValues.length).toBe(3);
    expect(i).toBe(3);
    const now = new Date();
    for (const value of collectedValues) {
      expect(new Date(value).getFullYear()).toBe(now.getFullYear());
    }
  });
  it('should handle file uploads correctly', async () => {
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
