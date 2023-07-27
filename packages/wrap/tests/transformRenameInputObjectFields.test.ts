import { parse } from 'graphql';
import { delegateToSchema } from '@graphql-tools/delegate';
import { execute, isIncrementalResult } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { assertSome } from '@graphql-tools/utils';
import { RenameInputObjectFields, wrapSchema } from '@graphql-tools/wrap';

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
    const result = await execute({
      schema: transformedSchema,
      document: parse(query),
      variableValues: variables,
    });
    if (isIncrementalResult(result)) throw Error('result is incremental');
    assertSome(result.data);
    const testData: any = result.data['test'];
    expect(testData.field1).toBe('field1');
    expect(testData.field2).toBe('field2');
  });

  test('renaming with delegation works', async () => {
    const schema1 = makeExecutableSchema({
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
    const schema2 = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: Foo
        }
        type Foo {
          bar: String
        }
      `,
      resolvers: {
        Query: {
          foo: () => ({ bar: 'bar' }),
        },
      },
    });

    const subschema1 = {
      schema: schema1,
      transforms: [
        new RenameInputObjectFields((typeName, fieldName) => {
          if (typeName === 'InputObject' && fieldName === 'field2') {
            return 'field3';
          }
        }),
      ],
    };
    const stitchedSchema = stitchSchemas({
      subschemas: [subschema1, schema2],
      typeDefs: /* GraphQL */ `
        extend type Foo {
          test: OutputObject
        }
      `,
      resolvers: {
        Foo: {
          test: {
            selectionSet: '{ bar }',
            resolve: (_root, _args, context, info) =>
              delegateToSchema({
                schema: subschema1,
                fieldName: 'test',
                args: {
                  argument: {
                    field1: 'field1',
                    field3: 'field3',
                  },
                },
                context,
                info,
              }),
          },
        },
      },
    });
    const result = await execute({
      schema: stitchedSchema,
      document: parse(/* GraphQL */ `
        {
          foo {
            test {
              field1
              field2
            }
          }
        }
      `),
    });
    if (isIncrementalResult(result)) throw Error('result is incremental');

    assertSome(result.data);
    const testData: any = result.data['foo']['test'];
    expect(testData.field1).toBe('field1');
    expect(testData.field2).toBe('field3');
  });
});
