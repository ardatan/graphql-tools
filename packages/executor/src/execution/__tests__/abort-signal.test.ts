import { parse } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { isAsyncIterable } from '@graphql-tools/utils';
import { Repeater } from '@repeaterjs/repeater';
import { assertAsyncIterable } from '../../../../loaders/url/tests/test-utils';
import { normalizedExecutor } from '../normalizedExecutor';

type Deferred<T = void> = {
  resolve: (value: T) => void;
  reject: (value: unknown) => void;
  promise: Promise<T>;
};

function createDeferred<T = void>(): Deferred<T> {
  const d = {} as Deferred<T>;
  d.promise = new Promise<T>((resolve, reject) => {
    d.resolve = resolve;
    d.reject = reject;
  });
  return d;
}

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
              return new Repeater(async (push, stop) => {
                let i = 0;
                stop.then(() => {
                  stopped = true;
                });

                while (true) {
                  await push(i++);
                  if (stopped) {
                    break;
                  }
                }
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
    let isAborted = false;

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          counter: [Int!]!
        }
      `,
      resolvers: {
        Query: {
          counter: () =>
            new Repeater(async (push, stop) => {
              let counter = 0;

              stop.then(() => {
                isAborted = true;
              });

              while (true) {
                await push(counter++);

                if (counter === 2) {
                  controller.abort();
                }

                if (isAborted) {
                  break;
                }
              }
              stop();
            }),
        },
      },
    });

    const result$ = normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          counter
        }
      `),
      signal: controller.signal,
    });
    await expect(result$).rejects.toMatchInlineSnapshot(`DOMException {}`);
    expect(isAborted).toEqual(true);
  });
  it('stops pending stream execution for incremental delivery', async () => {
    const controller = new AbortController();
    const d = createDeferred();
    let isReturnInvoked = false;

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          counter: [Int!]!
        }
      `,
      resolvers: {
        Query: {
          counter: () => ({
            [Symbol.asyncIterator]() {
              return this;
            },
            next() {
              return d.promise.then(() => ({ done: true }));
            },
            return() {
              isReturnInvoked = true;
              d.resolve();
              return Promise.resolve({ done: true });
            },
          }),
        },
      },
    });

    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          counter @stream
        }
      `),
      signal: controller.signal,
    });

    if (!isAsyncIterable(result)) {
      throw new Error('Result is not an async iterable');
    }

    const iter = result[Symbol.asyncIterator]();

    const next = await iter.next();
    expect(next).toEqual({
      done: false,
      value: {
        data: {
          counter: [],
        },
        hasNext: true,
      },
    });

    const next$ = iter.next();
    controller.abort();
    await expect(next$).rejects.toMatchInlineSnapshot(`DOMException {}`);
    expect(isReturnInvoked).toEqual(true);
  });
  it('stops promise execution', async () => {
    const controller = new AbortController();
    const d = createDeferred();

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          number: Int!
        }
      `,
      resolvers: {
        Query: {
          number: () => d.promise.then(() => 1),
        },
      },
    });

    const result$ = normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          number
        }
      `),
      signal: controller.signal,
    });

    expect(result$).toBeInstanceOf(Promise);
    controller.abort();
    await expect(result$).rejects.toMatchInlineSnapshot(`DOMException {}`);
  });
  it('does not even try to execute if the signal is already aborted', async () => {
    const controller = new AbortController();
    let resolverGotInvoked = false;
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          number: Int!
        }
      `,
      resolvers: {
        Query: {
          number: () => {
            resolverGotInvoked = true;
            return 1;
          },
        },
      },
    });
    controller.abort();
    expect(() =>
      normalizedExecutor({
        schema,
        document: parse(/* GraphQL */ `
          query {
            number
          }
        `),
        signal: controller.signal,
      }),
    ).toThrowErrorMatchingInlineSnapshot(`"This operation was aborted"`);
    expect(resolverGotInvoked).toBe(false);
  });
});
