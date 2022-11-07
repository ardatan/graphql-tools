import { wrapSchema, MapLeafValues } from '@graphql-tools/wrap';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { execute, isIncrementalResult } from '@graphql-tools/executor';
import { GraphQLSchema, parse } from 'graphql';
import { assertSome } from '@graphql-tools/utils';

describe('MapLeafValues', () => {
  let transformedSchema: GraphQLSchema;
  beforeAll(() => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        enum TestEnum {
          ONE
          TWO
          THREE
        }

        type Query {
          testEnum(argument: TestEnum): TestEnum
          testScalar(argument: Int): Int
        }
      `,
      resolvers: {
        Query: {
          testEnum: (_root, { argument }) => argument,
          testScalar: (_root, { argument }) => argument,
        },
      },
    });

    const valueIterator = (typeName: string, value: any) => {
      if (typeName === 'TestEnum') {
        return value === 'ONE' ? 'TWO' : value === 'TWO' ? 'THREE' : 'ONE';
      } else if (typeName === 'Int') {
        return value + 5;
      } else {
        return value;
      }
    };

    transformedSchema = wrapSchema({
      schema,
      transforms: [new MapLeafValues(valueIterator, valueIterator)],
    });
  });
  test('works', async () => {
    const query = /* GraphQL */ `
      {
        testEnum(argument: ONE)
        testScalar(argument: 5)
      }
    `;

    const result = await execute({
      schema: transformedSchema,
      document: parse(query),
    });
    if (isIncrementalResult(result)) throw Error('result is incremental');

    assertSome(result.data);
    expect(result.data['testEnum']).toBe('THREE');
    expect(result.data['testScalar']).toBe(15);
  });
  test('works with variables', async () => {
    const query = /* GraphQL */ `
      query MyQuery($argument: Int!) {
        testEnum(argument: ONE)
        testScalar(argument: $argument)
      }
    `;

    const result = await execute({
      schema: transformedSchema,
      document: parse(query),
      variableValues: {
        argument: 5,
      },
    });
    if (isIncrementalResult(result)) throw Error('result is incremental');
    assertSome(result.data);
    expect(result.data['testEnum']).toBe('THREE');
    expect(result.data['testScalar']).toBe(15);
  });
  test('works if optional argument is not provided', async () => {
    const query = /* GraphQL */ `
      query MyQuery {
        testEnum
        testScalar
      }
    `;

    const result = await execute({
      schema: transformedSchema,
      document: parse(query),
    });
    if (isIncrementalResult(result)) throw Error('result is incremental');
    assertSome(result.data);
    expect(result.data['testEnum']).toBe(null);
    expect(result.data['testScalar']).toBe(null);
  });
});
