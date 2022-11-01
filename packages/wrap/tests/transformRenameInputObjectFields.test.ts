import { wrapSchema, RenameInputObjectFields } from '@graphql-tools/wrap';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { execute, isIncrementalResult } from '@graphql-tools/executor';
import { parse } from 'graphql';
import { assertSome } from '@graphql-tools/utils';

describe('RenameInputObjectFields', () => {
  test('renaming with arguments works', async () => {
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
        new RenameInputObjectFields((typeName, fieldName) => {
          if (typeName === 'InputObject' && fieldName === 'field2') {
            return 'field3';
          }
        }),
      ],
    });

    const query = /* GraphQL */ `
      {
        test(argument: { field1: "field1", field3: "field2" }) {
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
    const testData: any = result.data['test'];
    expect(testData.field1).toBe('field1');
    expect(testData.field2).toBe('field2');
  });

  test('renaming with non-null arguments works', async () => {
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
          test(argument: InputObject!): OutputObject
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
        new RenameInputObjectFields((typeName, fieldName) => {
          if (typeName === 'InputObject' && fieldName === 'field2') {
            return 'field3';
          }
        }),
      ],
    });

    const query = /* GraphQL */ `
      {
        test(argument: { field1: "field1", field3: "field2" }) {
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
    const testData: any = result.data['test'];
    expect(testData.field1).toBe('field1');
    expect(testData.field2).toBe('field2');
  });

  test('renaming with variables works', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        input InputObject {
          field1: String
          field2: String
          nfield: [InputObject!]
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
        new RenameInputObjectFields((typeName: string, fieldName: string) => {
          if (typeName === 'InputObject' && fieldName === 'field2') {
            return 'field3';
          }
        }),
      ],
    });

    const query = /* GraphQL */ `
      query ($argument: InputObject) {
        test(argument: $argument) {
          field1
          field2
        }
      }
    `;
    const variables = {
      argument: {
        field1: 'field1',
        field3: 'field2',
        nfield: [
          {
            field1: 'field1',
            field3: 'field2',
          },
        ],
      },
    };
    const result = await execute({ schema: transformedSchema, document: parse(query), variableValues: variables });
    if (isIncrementalResult(result)) throw Error('result is incremental');
    assertSome(result.data);
    const testData: any = result.data['test'];
    expect(testData.field1).toBe('field1');
    expect(testData.field2).toBe('field2');
  });
});
