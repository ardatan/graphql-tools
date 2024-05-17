import { buildSchema, GraphQLObjectType, parse } from 'graphql';
import { normalizedExecutor } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { stitchingDirectives } from '../src';

describe('Reproductions for issues', () => {
  it('issue #4554', () => {
    const { allStitchingDirectivesTypeDefs, stitchingDirectivesTransformer } =
      stitchingDirectives();
    const schema1 = buildSchema(/* GraphQL */ `
      ${allStitchingDirectivesTypeDefs}
      scalar ItemId
      scalar ItemId2
      scalar AField

      type Query {
        item(itemId: ItemId!, itemId2: ItemId2!): Item!
      }
      type Item @key(selectionSet: "{ itemId itemId2 }") {
        itemId: ItemId!
        itemId2: ItemId2!
        aField: AField
      }
    `);

    const schema2 = buildSchema(/* GraphQL */ `
      ${allStitchingDirectivesTypeDefs}
      scalar ItemId
      scalar ItemId2
      scalar AField

      type Query {
        _item(input: ItemInput!): Item
      }

      input ItemInput {
        itemId: ItemId!
        itemId2: ItemId2!
        aField: AField
      }

      type Item @key(selectionSet: "{ itemId itemId2 }") {
        itemId: ItemId!
        itemId2: ItemId2!

        giftOptionsList: [GiftOptions] @computed(selectionSet: "{ itemId aField }")
      }

      type GiftOptions {
        someOptions: [String]
      }
    `);
    const stitchedSchema = stitchSchemas({
      subschemas: [schema1, schema2],
      subschemaConfigTransforms: [stitchingDirectivesTransformer],
    });
    const giftOptionsType = stitchedSchema.getType('GiftOptions') as GraphQLObjectType;
    expect(giftOptionsType).toBeDefined();
    const giftOptionsTypeFields = giftOptionsType.getFields();
    expect(giftOptionsTypeFields['someOptions']).toBeDefined();
  });

  it('issue #4956', async () => {
    const userData = [
      { id: '1', name: 'Tom' },
      { id: '2', name: 'Mary' },
    ];

    const userSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        directive @key(selectionSet: String!) on OBJECT
        directive @computed(selectionSet: String!) on FIELD_DEFINITION
        directive @merge(
          argsExpr: String
          keyArg: String
          keyField: String
          key: [String!]
          additionalArgs: String
        ) on FIELD_DEFINITION
        directive @canonical on OBJECT | INTERFACE | INPUT_OBJECT | UNION | ENUM | SCALAR | FIELD_DEFINITION | INPUT_FIELD_DEFINITION

        type Service {
          sdl: String!
        }

        type User {
          id: ID!
          name: String!
        }

        type Query {
          _service: Service!
          users: [User!]!
        }
      `,
      resolvers: {
        Query: {
          users: () => userData,
          _service: (_, __, ___, info) => {
            return {
              sdl: printSchemaWithDirectives(info.schema),
            };
          },
        },
      },
    });

    const userExtendedSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        directive @key(selectionSet: String!) on OBJECT
        directive @computed(selectionSet: String!) on FIELD_DEFINITION
        directive @merge(
          argsExpr: String
          keyArg: String
          keyField: String
          key: [String!]
          additionalArgs: String
        ) on FIELD_DEFINITION
        directive @canonical on OBJECT | INTERFACE | INPUT_OBJECT | UNION | ENUM | SCALAR | FIELD_DEFINITION | INPUT_FIELD_DEFINITION

        type Service {
          sdl: String!
        }

        type ComplexType {
          someProperty: Boolean
        }

        type User {
          id: ID!
          isSomeComplexType: ComplexType @computed(selectionSet: "{ name }")
        }

        type Query {
          _entities(representations: [_Any!]!): [_Entity]! @merge
          _service: Service!
          _dummy: String!
        }

        scalar _Any

        union _Entity = User
      `,
      resolvers: {
        Query: {
          _dummy: () => 'OK',
          _entities: (_root, args) => {
            return args.representations;
          },
          _service: (_, __, ___, info) => {
            return {
              sdl: printSchemaWithDirectives(info.schema),
            };
          },
        },
        User: {
          isSomeComplexType: source => {
            if (source.name === 'Tom') {
              return { someProperty: true };
            }
            return { someProperty: false };
          },
        },
      },
    });
    const { stitchingDirectivesTransformer } = stitchingDirectives();
    const stitchedSchema = stitchSchemas({
      subschemas: [userSchema, userExtendedSchema],
      subschemaConfigTransforms: [stitchingDirectivesTransformer],
    });
    const result = await normalizedExecutor({
      schema: stitchedSchema,
      document: parse(/* GraphQL */ `
        query {
          users {
            id
            name
            isSomeComplexType {
              someProperty
            }
          }
        }
      `),
    });
    expect(result).toMatchObject({
      data: {
        users: [
          {
            id: '1',
            name: 'Tom',
            isSomeComplexType: {
              someProperty: true,
            },
          },
          {
            id: '2',
            name: 'Mary',
            isSomeComplexType: {
              someProperty: false,
            },
          },
        ],
      },
    });
  });
});
