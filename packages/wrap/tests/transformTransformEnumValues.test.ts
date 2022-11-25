import { wrapSchema, TransformEnumValues } from '@graphql-tools/wrap';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLEnumType, parse, printType } from 'graphql';
import { execute, isIncrementalResult } from '@graphql-tools/executor';
import { stitchSchemas } from '@graphql-tools/stitch';
import { delegateToSchema } from '@graphql-tools/delegate';

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

  test('transforms default values', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        enum TestEnum {
          ONE
          TWO
          THREE
        }

        type Query {
          testEnum(argument: TestEnum = ONE): TestEnum
        }
      `,
      resolvers: {
        Query: {
          testEnum: (_root, { argument }) => argument,
        },
        TestEnum: {
          ONE: 1,
          TWO: 2,
          THREE: 3,
        },
      },
    });

    const subschema = {
      schema,
      transforms: [
        new TransformEnumValues((_typeName, externalValue, valueConfig) => {
          switch (externalValue) {
            case 'ONE':
              return ['UNO', valueConfig];
            case 'TWO':
              return ['DOS', valueConfig];
            case 'THREE':
              return ['TRES', valueConfig];
          }
        }),
      ],
    };
    const transformedSchema = wrapSchema(subschema);

    const queryType = transformedSchema.getQueryType()!;
    expect(printType(queryType)).toBe(`type Query {
  testEnum(argument: TestEnum = UNO): TestEnum
}`);

    const query = /* GraphQL */ `
      {
        testEnum
      }
    `;
    const result = await execute({
      schema: transformedSchema,
      document: parse(query),
    });

    if (isIncrementalResult(result)) throw Error('result is incremental');
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      testEnum: 'UNO',
    });
  });
  test('works fine with stitching resolvers', async () => {
    const images = [
      {
        id: 1,
        type: 'png',
      },
      {
        id: 2,
        type: 'jpg',
      },
    ];
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        enum ImageType {
          png
          jpg
        }
        type Image {
          id: ID!
          type: ImageType!
        }
        type Query {
          image(id: ID!): Image
        }
      `,
      resolvers: {
        Query: {
          image: (_root, { id }) => images.find(image => image.id === parseInt(id)),
        },
      },
    });

    const subschema = {
      schema,
      transforms: [
        new TransformEnumValues((_typeName, externalValue, valueConfig) => [externalValue.toUpperCase(), valueConfig]),
      ],
    };
    const stitchedSchema = stitchSchemas({
      subschemas: [subschema],
      typeDefs: /* GraphQL */ `
        extend type Query {
          newImageField(id: ID!): Image
        }
        extend type Image {
          path: String!
          newTypeField: ImageType!
        }
      `,
      resolvers: {
        Image: {
          path: {
            selectionSet: '{ id type }',
            resolve: parent => `/${parent.id}.${parent.type}`,
          },
          newTypeField: {
            selectionSet: '{ type }',
            resolve: parent => parent.type,
          },
        },
        Query: {
          newImageField: (_root, args, context, info) =>
            delegateToSchema({
              schema: subschema,
              fieldName: 'image',
              args,
              context,
              info,
            }),
        },
      },
    });

    const query = /* GraphQL */ `
      {
        image(id: 1) {
          id
          type
          path
          newTypeField
        }
        newImageField(id: 2) {
          id
          type
          path
          newTypeField
        }
      }
    `;
    const result = await execute({
      schema: stitchedSchema,
      document: parse(query),
    });

    if (isIncrementalResult(result)) throw Error('result is incremental');
    expect(result).toEqual({
      data: {
        image: {
          id: '1',
          type: 'PNG',
          path: '/1.PNG',
          newTypeField: 'PNG',
        },
        newImageField: {
          id: '2',
          type: 'JPG',
          path: '/2.JPG',
          newTypeField: 'JPG',
        },
      },
    });
  });
});
