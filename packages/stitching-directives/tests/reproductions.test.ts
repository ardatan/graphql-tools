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

  it.only('multiple endpoints', async () => {
    const { stitchingDirectivesTransformer, stitchingDirectivesTypeDefs } = stitchingDirectives();
    const users = [
      { id: '1', name: 'Arda Doe', age: 25 },
      { id: '2', name: 'Uri Doe', age: 35 },
    ];
    const userSchema = makeExecutableSchema({
      typeDefs: [
        stitchingDirectivesTypeDefs,
        /* GraphQL */ `
          type User {
            id: ID!
            name: String!
          }

          type Query {
            userByIdWithName(id: ID!): User @merge(keyField: "id")
            userByName(name: String!): User @merge(keyField: "name")
          }
        `,
      ],
      resolvers: {
        Query: {
          userByIdWithName: (_root, { id }) => users.find(user => user.id === id),
          userByName: (_root, { name }) => users.find(user => user.name === name),
        },
      },
    });
    const firstNameSchema = makeExecutableSchema({
      typeDefs: [
        stitchingDirectivesTypeDefs,
        /* GraphQL */ `
          type User {
            name: String!
            firstName: String!
          }

          type Query {
            userByNameWithFirstName(name: String!): User @merge(keyField: "name")
          }
        `,
      ],
      resolvers: {
        Query: {
          userByNameWithFirstName: (_root, { name }) => users.find(user => user.name === name),
        },
        User: {
          firstName: user => user.name.split(' ')[0],
        },
      },
    });
    const ageSchema = makeExecutableSchema({
      typeDefs: [
        stitchingDirectivesTypeDefs,
        /* GraphQL */ `
          type User {
            id: ID!
            age: Int!
          }

          type Query {
            userByIdWithAge(id: ID!): User @merge(keyField: "id")
          }
        `,
      ],
      resolvers: {
        Query: {
          userByIdWithAge: (_root, { id }) => users.find(user => user.id === id),
        },
      },
    });
    const stitchedSchema = stitchSchemas({
      subschemas: [userSchema, firstNameSchema, ageSchema],
      subschemaConfigTransforms: [stitchingDirectivesTransformer],
    });
    const result = await normalizedExecutor({
      schema: stitchedSchema,
      document: parse(/* GraphQL */ `
        fragment UserFields on User {
          id
          name
          firstName
          age
        }
        query {
          userByIdWithName(id: "1") {
            ...UserFields
          }
          userByName(name: "Arda Doe") {
            ...UserFields
          }
          userByNameWithFirstName(name: "Arda Doe") {
            ...UserFields
          }
          userByIdWithAge(id: "1") {
            ...UserFields
          }
        }
      `),
    });
    expect(result).toEqual({
      data: {
        userByIdWithName: {
          id: '1',
          name: 'Arda Doe',
          firstName: 'Arda',
          age: 25,
        },
        userByNameWithFirstName: {
          id: '1',
          name: 'Arda Doe',
          firstName: 'Arda',
          age: 25,
        },
        userByName: {
          id: '1',
          name: 'Arda Doe',
          firstName: 'Arda',
          age: 25,
        },
        userByIdWithAge: {
          id: '1',
          name: 'Arda Doe',
          firstName: 'Arda',
          age: 25,
        },
      },
    });
  });
});
