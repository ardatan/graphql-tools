import { makeExecutableSchema } from '@graphql-tools/schema';
import { inspect, isAsyncIterable } from '@graphql-tools/utils';
import { Repeater } from '@repeaterjs/repeater';
import { parse } from 'graphql';
import { normalizedExecutor } from '../normalizedExecutor';
function assertAsyncIterable(input: unknown): asserts input is AsyncIterable<any> {
  if (!isAsyncIterable(input)) {
    throw new Error(`Expected AsyncIterable. but received: ${inspect(input)}`);
  }
}
describe('Defer Stream cancellation', () => {
  let active = false;
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        countdownStream(from: Int!): [Int]
      }
    `,
    resolvers: {
      Query: {
        countdownStream: (_, { from }) =>
          new Repeater(async (push, stop) => {
            active = true;
            stop.then(() => {
              active = false;
            });
            for (let i = from; i >= 0; i--) {
              if (active) {
                await new Promise(resolve => setTimeout(resolve, 100));
                await push(i);
              }
            }
          }),
      },
    },
  });
  it('should cancel the resolved async iterable cancelled immediately', async () => {
    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          countdownStream(from: 10) @stream(initialCount: 0) {
            value
          }
        }
      `),
    });
    assertAsyncIterable(result);
    const resultIterator = result[Symbol.asyncIterator]();
    await resultIterator.return?.();
    expect(active).toBe(false);
  });
  it('should cancel the resolved async iterable after cancelled immediately when the empty initialValue is received', async () => {
    const results = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          countdownStream(from: 5) @stream
        }
      `),
    });

    assertAsyncIterable(results);

    // eslint-disable-next-line no-unreachable-loop
    for await (const result of results) {
      expect(result).toEqual({
        data: {
          countdownStream: [],
        },
        hasNext: true,
      });
      break;
    }
    expect(active).toBe(false);
  });
  it('should cancel the resolved async iterable that never yields after cancelled immediately when the empty initialValue is received', async () => {
    const results = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          countdownStream(from: 0) @stream
        }
      `),
    });

    assertAsyncIterable(results);

    // eslint-disable-next-line no-unreachable-loop
    for await (const result of results) {
      expect(result).toEqual({
        data: {
          countdownStream: [],
        },
        hasNext: true,
      });
      break;
    }
    expect(active).toBe(false);
  });
  it('should cancel the resolved async iterable after cancelled immediately when the empty initialValue and a subsequent value is received', async () => {
    const results = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          countdownStream(from: 3) @stream
        }
      `),
    });

    assertAsyncIterable(results);

    let i = 0;
    // eslint-disable-next-line no-labels
    stream: for await (const result of results) {
      switch (i) {
        case 0:
          expect(result).toEqual({
            data: {
              countdownStream: [],
            },
            hasNext: true,
          });
          break;
        case 1:
          expect(result).toEqual({
            incremental: [
              {
                items: [3],
                path: ['countdownStream', 0],
              },
            ],
            hasNext: true,
          });
          // eslint-disable-next-line no-labels
          break stream;
      }
      i++;
    }
    expect(active).toBe(false);
  });
  it('should cancel the resolved async iterable after cancelled immediately when the initialValue with a single element', async () => {
    const results = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          countdownStream(from: 3) @stream(initialCount: 1)
        }
      `),
    });

    assertAsyncIterable(results);

    // eslint-disable-next-line no-unreachable-loop
    for await (const result of results) {
      expect(result).toEqual({
        data: {
          countdownStream: [3],
        },
        hasNext: true,
      });
      break;
    }
    expect(active).toBe(false);
  });
});
