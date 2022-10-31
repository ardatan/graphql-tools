import { wrapSchema, FilterInputObjectFields } from '@graphql-tools/wrap';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { graphql, astFromValue, Kind, GraphQLString, parse } from 'graphql';
import { assertSome } from '@graphql-tools/utils';
import { execute, isIncrementalResult } from '@graphql-tools/executor';

describe('FilterInputObjectFields', () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      input InputObject {
        field1: String
        field2: String
      }

      type OutputObject {
        field1: String
        field2: String
      }

      type Query {
        test(argument: InputObject): OutputObject
      }
    `,
    resolvers: {
      Query: {
        test: (_root, args) => {
          return args.argument;
        },
      },
    },
  });

  const transformedSchema = wrapSchema({
    schema,
    transforms: [
      new FilterInputObjectFields(
        (typeName, fieldName) => typeName !== 'InputObject' || fieldName !== 'field2',
        (typeName, inputObjectNode) => {
          if (typeName === 'InputObject') {
            const value = astFromValue('field2', GraphQLString);
            assertSome(value);
            return {
              ...inputObjectNode,
              fields: [
                ...inputObjectNode.fields,
                {
                  kind: Kind.OBJECT_FIELD,
                  name: {
                    kind: Kind.NAME,
                    value: 'field2',
                  },
                  value,
                },
              ],
            };
          }
        }
      ),
    ],
  });

  test('filtering works', async () => {
    const query = /* GraphQL */ `
      {
        test(argument: { field1: "field1" }) {
          field1
          field2
        }
      }
    `;

    const result = await execute({
      schema: transformedSchema,
      document: parse(query),
    });
    if (isIncrementalResult(result)) throw Error('result is incremental');
    assertSome(result.data);
    expect(result.errors).toBeUndefined();
    const dataTest: any = result.data['test'];
    expect(dataTest.field1).toBe('field1');
    expect(dataTest.field2).toBe('field2');
  });

  test('filtering works with non-nullable input variable', async () => {
    const query = /* GraphQL */ `
      query testQuery($field1Arg: String!) {
        test(argument: { field1: $field1Arg }) {
          field1
          field2
        }
      }
    `;

    const result = await graphql({
      schema: transformedSchema,
      source: query,
      variableValues: { field1Arg: 'field1' },
    });
    assertSome(result.data);
    expect(result.errors).toBeUndefined();
    const dataTest: any = result.data['test'];
    expect(dataTest.field1).toBe('field1');
    expect(dataTest.field2).toBe('field2');
  });
});
