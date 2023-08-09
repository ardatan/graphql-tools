import { parse } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Repeater } from '@repeaterjs/repeater';
import { assertAsyncIterable } from '../../../../loaders/url/tests/test-utils';
import { normalizedExecutor } from '../normalizedExecutor';

describe('Abort Signal', () => {
  it('should stop the subscription', async () => {
    expect.assertions(2);
    const controller = new AbortController();
    let stopped = false;
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          _: Boolean
        }
        type Subscription {
          counter: Int!
        }
      `,
      resolvers: {
        Subscription: {
          counter: {
            subscribe() {
              return new Repeater((push, stop) => {
                let i = 0;
                const interval = setInterval(() => {
                  push(i++);
                }, 300);
                stop.then(() => {
                  clearInterval(interval);
                  stopped = true;
                });
              });
            },
            resolve: (value: number) => value,
          },
        },
      },
    });
    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        subscription {
          counter
        }
      `),
      signal: controller.signal,
    });
    assertAsyncIterable(result);
    const results = [];
    for await (const value of result) {
      results.push(value.data?.counter);
      if (value.data?.counter === 4) {
        controller.abort();
      }
    }
    expect(stopped).toBe(true);
    expect(results).toEqual([0, 1, 2, 3, 4]);
  });
  it('should stop the serial mutation execution', async () => {
    const controller = new AbortController();
    const firstFn = jest.fn(() => true);
    const secondFn = jest.fn(() => {
      controller.abort();
      return true;
    });
    const thirdFn = jest.fn(() => true);
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          _: Boolean
        }
        type Mutation {
          first: Boolean
          second: Boolean
          third: Boolean
        }
      `,
      resolvers: {
        Mutation: {
          first: firstFn,
          second: secondFn,
          third: thirdFn,
        },
      },
    });
    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        mutation {
          first
          second
          third
        }
      `),
      signal: controller.signal,
    });
    expect(firstFn).toHaveBeenCalledTimes(1);
    expect(secondFn).toHaveBeenCalledTimes(1);
    expect(thirdFn).toHaveBeenCalledTimes(0);
    expect(result).toMatchObject({
      data: {
        first: true,
        second: true,
        third: null,
      },
      errors: [
        {
          message: 'Execution aborted',
          path: ['second'],
          locations: [
            {
              line: 4,
              column: 11,
            },
          ],
        },
      ],
    });
  });
  it('should stop the parallel query execution', async () => {
    let resolve$: (value: any) => void = () => {};
    const controller = new AbortController();
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          first: Boolean
          second: Boolean
          third: Boolean
        }
      `,
      resolvers: {
        Query: {
          first: async () => true,
          second: async () => {
            controller.abort();
            return true;
          },
          third: () =>
            new Promise(resolve => {
              resolve$ = resolve;
            }),
        },
      },
    });
    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          first
          second
          third
        }
      `),
      signal: controller.signal,
    });
    resolve$?.(true);
    expect(result).toMatchObject({
      data: {
        first: true,
        second: true,
        third: null,
      },
      errors: [
        {
          message: 'Execution aborted',
          path: ['second'],
          locations: [
            {
              line: 4,
              column: 11,
            },
          ],
        },
      ],
    });
  });
  it('should stop stream execution', async () => {
    const controller = new AbortController();
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          counter: [Int!]!
        }
      `,
      resolvers: {
        Query: {
          counter: () =>
            new Repeater((push, stop) => {
              let i = 0;
              const interval = setInterval(() => {
                push(i++);
              }, 300);
              stop.then(() => {
                clearInterval(interval);
              });
            }),
        },
      },
    });
    setTimeout(() => {
      controller.abort();
    }, 1000);
    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          counter
        }
      `),
      signal: controller.signal,
    });
    expect(result).toMatchObject({
      errors: [
        {
          message: 'Execution aborted',
          path: ['counter'],
          locations: [
            {
              line: 3,
              column: 11,
            },
          ],
        },
      ],
    });
  });
});
