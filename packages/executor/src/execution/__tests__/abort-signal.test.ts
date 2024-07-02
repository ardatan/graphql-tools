import { parse } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createDeferred, isAsyncIterable } from '@graphql-tools/utils';
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
  it('pending subscription execution is canceled', async () => {
    const controller = new AbortController();
    const rootResolverGotInvokedD = createDeferred<void>();
    const requestGotCancelledD = createDeferred<void>();
    let aResolverGotInvoked = false;

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          _: Boolean
        }
        type Subscription {
          a: A!
        }

        type A {
          a: String!
        }
      `,
      resolvers: {
        Subscription: {
          a: {
            async *subscribe() {
              yield 1;
            },
            async resolve() {
              rootResolverGotInvokedD.resolve();
              await requestGotCancelledD.promise;
              return { a: 'a' };
            },
          },
        },
        A: {
          a() {
            aResolverGotInvoked = true;
            return 'a';
          },
        },
      },
    });
    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        subscription {
          a {
            a
          }
        }
      `),
      signal: controller.signal,
    });
    assertAsyncIterable(result);
    const iterator = result![Symbol.asyncIterator]();
    const $next = iterator.next();
    await rootResolverGotInvokedD.promise;
    controller.abort();
    await expect($next).rejects.toMatchInlineSnapshot(`DOMException {}`);
    expect(aResolverGotInvoked).toEqual(false);
  });
  it('should stop the serial mutation execution', async () => {
    const controller = new AbortController();

    let didInvokeFirstFn = false;
    let didInvokeSecondFn = false;
    let didInvokeThirdFn = false;
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
          first() {
            didInvokeFirstFn = true;
            return Promise.resolve(true);
          },
          second() {
            didInvokeSecondFn = true;
            controller.abort();
            return true;
          },
          third() {
            didInvokeThirdFn = true;
            return true;
          },
        },
      },
    });
    const result$ = normalizedExecutor({
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
    await expect(result$).rejects.toMatchInlineSnapshot(`DOMException {}`);
    expect(didInvokeFirstFn).toBe(true);
    expect(didInvokeSecondFn).toBe(true);
    expect(didInvokeThirdFn).toBe(false);
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
  it('stops pending stream execution for incremental delivery (@stream)', async () => {
    const controller = new AbortController();
    const d = createDeferred<void>();
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
        pending: [{ id: '0', path: ['counter'] }],
        hasNext: true,
      },
    });

    const next$ = iter.next();
    controller.abort();
    await expect(next$).rejects.toMatchInlineSnapshot(`DOMException {}`);
    expect(isReturnInvoked).toEqual(true);
  });
  it('stops pending stream execution for parallel sources incremental delivery (@stream)', async () => {
    const controller = new AbortController();
    const d1 = createDeferred<void>();
    const d2 = createDeferred<void>();

    let isReturn1Invoked = false;
    let isReturn2Invoked = false;

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          counter1: [Int!]!
          counter2: [Int!]!
        }
      `,
      resolvers: {
        Query: {
          counter1: () => ({
            [Symbol.asyncIterator]() {
              return this;
            },
            next() {
              return d1.promise.then(() => ({ done: true }));
            },
            return() {
              isReturn1Invoked = true;
              d1.resolve();
              return Promise.resolve({ done: true });
            },
          }),
          counter2: () => ({
            [Symbol.asyncIterator]() {
              return this;
            },
            next() {
              return d2.promise.then(() => ({ done: true }));
            },
            return() {
              isReturn2Invoked = true;
              d2.resolve();
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
          counter1 @stream
          counter2 @stream
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
          counter1: [],
          counter2: [],
        },
        pending: [
          { id: '0', path: ['counter1'] },
          { id: '1', path: ['counter2'] },
        ],
        hasNext: true,
      },
    });

    const next$ = iter.next();
    controller.abort();
    await expect(next$).rejects.toMatchInlineSnapshot(`DOMException {}`);
    expect(isReturn1Invoked).toEqual(true);
    expect(isReturn2Invoked).toEqual(true);
  });
  it('stops pending stream execution for incremental delivery (@defer)', async () => {
    const aResolverGotInvokedD = createDeferred<void>();
    const requestGotCancelledD = createDeferred<void>();
    let bResolverGotInvoked = false;

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          root: A!
        }
        type A {
          a: B!
        }
        type B {
          b: String
        }
      `,
      resolvers: {
        Query: {
          async root() {
            return { a: 'a' };
          },
        },
        A: {
          async a() {
            aResolverGotInvokedD.resolve();
            await requestGotCancelledD.promise;
            return { b: 'b' };
          },
        },
        B: {
          b: obj => {
            bResolverGotInvoked = true;
            return obj.b;
          },
        },
      },
    });
    const controller = new AbortController();
    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          root {
            ... @defer {
              a {
                b
              }
            }
          }
        }
      `),
      signal: controller.signal,
    });

    if (!isAsyncIterable(result)) {
      throw new Error('Result is not an async iterable');
    }

    const iterator = result[Symbol.asyncIterator]();
    const next = await iterator.next();
    expect(next.value).toMatchInlineSnapshot(`
{
  "data": {
    "root": {},
  },
  "hasNext": true,
  "pending": [
    {
      "id": "0",
      "path": [
        "root",
      ],
    },
  ],
}
`);
    const next$ = iterator.next();
    await aResolverGotInvokedD.promise;
    controller.abort();
    requestGotCancelledD.resolve();
    await expect(next$).rejects.toThrow('This operation was aborted');
    expect(bResolverGotInvoked).toBe(false);
  });
  it('stops pending stream execution for never-returning incremental delivery (@defer)', async () => {
    const aResolverGotInvokedD = createDeferred<void>();
    const requestGotCancelledD = createDeferred<void>();
    let bResolverGotInvoked = false;

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          root: A!
        }
        type A {
          a: B!
        }
        type B {
          b: String
        }
      `,
      resolvers: {
        Query: {
          async root() {
            return {};
          },
        },
        A: {
          async a() {
            aResolverGotInvokedD.resolve();
            await requestGotCancelledD.promise;
            return {};
          },
        },
        B: {
          b() {
            bResolverGotInvoked = true;
            return new Promise(() => {});
          },
        },
      },
    });
    const controller = new AbortController();
    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          root {
            ... @defer {
              a {
                b
              }
            }
          }
        }
      `),
      signal: controller.signal,
    });

    if (!isAsyncIterable(result)) {
      throw new Error('Result is not an async iterable');
    }

    const iterator = result[Symbol.asyncIterator]();
    const next = await iterator.next();
    expect(next.value).toMatchInlineSnapshot(`
{
  "data": {
    "root": {},
  },
  "hasNext": true,
  "pending": [
    {
      "id": "0",
      "path": [
        "root",
      ],
    },
  ],
}
`);
    const next$ = iterator.next();
    await aResolverGotInvokedD.promise;
    controller.abort();
    await expect(next$).rejects.toThrow('This operation was aborted');
    expect(bResolverGotInvoked).toBe(false);
  });
  it('stops promise execution', async () => {
    const controller = new AbortController();
    const d = createDeferred<void>();

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
