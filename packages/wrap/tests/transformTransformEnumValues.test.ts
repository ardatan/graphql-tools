import { wrapSchema, TransformEnumValues } from '@graphql-tools/wrap';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLEnumType, parse } from 'graphql';
import { execute, isIncrementalResult } from '@graphql-tools/executor';

function assertGraphQLEnumType(input: unknown): asserts input is GraphQLEnumType {
  if (input instanceof GraphQLEnumType) {
    return;
  }
  throw new Error('Expected GraphQLEnumType.');
}

describe('TransformEnumValues', () => {
  test('works', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        enum TestEnum {
          ONE
        }

        type Query {
          test(argument: TestEnum): TestEnum
        }
      `,
      resolvers: {
        Query: {
          test: (_root, { argument }) => argument,
        },
      },
    });

    const transformedSchema = wrapSchema({
      schema,
      transforms: [new TransformEnumValues((_typeName, _externalValue, valueConfig) => ['UNO', valueConfig])],
    });

    const query = /* GraphQL */ `
      {
        test(argument: UNO)
      }
    `;

    const result = await execute({
      schema: transformedSchema,
      document: parse(query),
    });
    if (isIncrementalResult(result)) throw Error('result is incremental');
    expect(result.errors).toBeUndefined();
  });

  test('allows modification of external and internal values', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        enum TestEnum {
          ONE
        }

        type Query {
          test(argument: TestEnum): TestEnum
        }
      `,
      resolvers: {
        Query: {
          test: (_root, { argument }) => argument,
        },
      },
    });

    const transformedSchema = wrapSchema({
      schema,
      transforms: [
        new TransformEnumValues((_typeName, _externalValue, valueConfig) => [
          'UNO',
          {
            ...valueConfig,
            value: 'ONE',
          },
        ]),
      ],
    });

    const query = /* GraphQL */ `
      {
        test(argument: UNO)
      }
    `;

    const result = await execute({
      schema: transformedSchema,
      document: parse(query),
    });
    if (isIncrementalResult(result)) throw Error('result is incremental');
    expect(result.errors).toBeUndefined();
    const TestEnum = transformedSchema.getType('TestEnum');
    assertGraphQLEnumType(TestEnum);
    expect(TestEnum.getValue('UNO')?.value).toBe('ONE');
  });

  test('works with variables', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        enum TestEnum {
          ONE
        }

        type Query {
          test(argument: TestEnum): TestEnum
        }
      `,
      resolvers: {
        Query: {
          test: (_root, { argument }) => argument,
        },
      },
    });

    const transformedSchema = wrapSchema({
      schema,
      transforms: [new TransformEnumValues((_typeName, _externalValue, valueConfig) => ['UNO', valueConfig])],
    });

    const query = /* GraphQL */ `
      query Test($test: TestEnum) {
        test(argument: $test)
      }
    `;

    const result = await execute({
      schema: transformedSchema,
      document: parse(query),
      variableValues: {
        test: 'UNO',
      },
    });
    if (isIncrementalResult(result)) throw Error('result is incremental');
    expect(result.errors).toBeUndefined();
  });
});
