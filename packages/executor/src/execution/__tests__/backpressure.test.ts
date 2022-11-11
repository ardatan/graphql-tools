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
  it('should cancel the resolved async iterable', async () => {
    let active = false;
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          countdownStream: [Int]
        }
      `,
      resolvers: {
        Query: {
          countdownStream: () =>
            new Repeater(async (push, stop) => {
              let i = 5;
              active = true;
              stop.then(() => {
                active = false;
              });
              // eslint-disable-next-line no-unmodified-loop-condition
              while (active) {
                push(i--);
              }
            }),
        },
      },
    });

    const results = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          countdownStream @stream
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
});
