import {
  DirectiveLocation,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
} from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { getDirective, MapperKind, mapSchema } from '../src/index.js';

function noopDirective({
  declaration,
  expectedDefault,
}: {
  declaration: string;
  expectedDefault: unknown;
}) {
  return {
    typeDefs: `directive ${declaration} on FIELD_DEFINITION`,
    transformer: (schema: GraphQLSchema): GraphQLSchema =>
      mapSchema(schema, {
        [MapperKind.OBJECT_FIELD]: fieldConfig => {
          const directive = getDirective(schema, fieldConfig, 'noop')?.[0];
          expect(directive).toEqual({ arg: expectedDefault });
          return fieldConfig;
        },
      }),
  };
}

describe('mapSchema - directives with defaults', () => {
  it('handles Boolean with default correctly', () => {
    const { typeDefs, transformer } = noopDirective({
      declaration: '@noop(arg: Boolean = true)',
      expectedDefault: true,
    });

    const schemaWithResolvers = makeExecutableSchema({
      typeDefs: [
        typeDefs,
        /* GraphQL */ `
          type Query {
            hello: String @noop
          }
        `,
      ],
      resolvers: { Query: { hello: () => 'hello world' } },
    });

    transformer(schemaWithResolvers);
  });

  it('handles String with default correctly', () => {
    const { typeDefs, transformer } = noopDirective({
      declaration: '@noop(arg: String = "DEFAULT")',
      expectedDefault: 'DEFAULT',
    });

    const schemaWithResolvers = makeExecutableSchema({
      typeDefs: [
        typeDefs,
        /* GraphQL */ `
          type Query {
            hello: String @noop
          }
        `,
      ],
      resolvers: { Query: { hello: () => 'hello world' } },
    });

    transformer(schemaWithResolvers);
  });

  it('maps a remapped enum default to the internal value', () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        enum UserRole {
          ADMIN
          MODERATOR
          USER
        }

        directive @auth(role: UserRole = USER) on FIELD_DEFINITION

        type Query {
          usersList: [ID!]! @auth
          moderatorsList: [ID!]! @auth(role: MODERATOR)
          adminsList: [ID!]! @auth(role: ADMIN)
        }
      `,
      resolvers: {
        Query: {
          usersList: () => ['u1'],
          moderatorsList: () => ['m1'],
          adminsList: () => ['a1'],
        },
        UserRole: {
          ADMIN: '0admin',
          MODERATOR: '1moderator',
          USER: '3user',
        },
      },
    });

    const roles: Record<string, unknown> = {};
    mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: fieldConfig => {
        const authDirective = getDirective(schema, fieldConfig, 'auth')?.[0];
        const fieldName = fieldConfig.astNode?.name.value;
        if (fieldName && authDirective) {
          roles[fieldName] = authDirective['role'];
        }
        return fieldConfig;
      },
    });

    expect(roles).toEqual({
      usersList: '3user',
      moderatorsList: '1moderator',
      adminsList: '0admin',
    });
  });

  it('keeps a remapped directive enum default when the internal value matches another name', () => {
    const UserRole = new GraphQLEnumType({
      name: 'UserRole',
      values: {
        ADMIN: { value: '1admin' },
        USER: { value: 'ADMIN' },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          usersList: {
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))),
          },
        },
      }),
      directives: [
        new GraphQLDirective({
          name: 'auth',
          locations: [DirectiveLocation.FIELD_DEFINITION],
          args: {
            role: {
              type: UserRole,
              defaultValue: 'ADMIN',
            },
          },
        }),
      ],
      types: [UserRole],
    });

    const mapped = mapSchema(schema);
    const roleDefault = mapped
      .getDirective('auth')
      ?.args.find(arg => arg.name === 'role')?.defaultValue;

    expect(roleDefault).toBe('ADMIN');
  });

  it('keeps the internal directive default when an enum value is renamed', () => {
    const UserRole = new GraphQLEnumType({
      name: 'UserRole',
      values: {
        ADMIN: { value: '0admin' },
        USER: { value: '3user' },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          usersList: {
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))),
          },
        },
      }),
      directives: [
        new GraphQLDirective({
          name: 'auth',
          locations: [DirectiveLocation.FIELD_DEFINITION],
          args: {
            role: {
              type: UserRole,
              defaultValue: '3user',
            },
          },
        }),
      ],
      types: [UserRole],
    });

    const mapped = mapSchema(schema, {
      [MapperKind.ENUM_VALUE]: (valueConfig, typeName, _schema, externalValue) => {
        if (typeName === 'UserRole' && externalValue === 'USER') {
          return ['MEMBER', valueConfig];
        }
        return valueConfig;
      },
    });

    const roleDefault = mapped
      .getDirective('auth')
      ?.args.find(arg => arg.name === 'role')?.defaultValue;

    expect(roleDefault).toBe('3user');
  });

  it('handles Enum with default correctly', () => {
    const { typeDefs, transformer } = noopDirective({
      declaration: '@noop(arg: ALPHABET = D)',
      expectedDefault: 'D',
    });

    const schemaWithResolvers = makeExecutableSchema({
      typeDefs: [
        typeDefs,
        /* GraphQL */ `
          type Query {
            hello: String @noop
          }

          enum ALPHABET {
            A
            B
            C
            D
          }
        `,
      ],
      resolvers: { Query: { hello: () => 'hello world' } },
    });

    transformer(schemaWithResolvers);
  });

  it('handles Int with default correctly', () => {
    const { typeDefs, transformer } = noopDirective({
      declaration: '@noop(arg: Int = 100)',
      expectedDefault: 100,
    });

    const schemaWithResolvers = makeExecutableSchema({
      typeDefs: [
        typeDefs,
        /* GraphQL */ `
          type Query {
            hello: String @noop
          }
        `,
      ],
      resolvers: { Query: { hello: () => 'hello world' } },
    });

    transformer(schemaWithResolvers);
  });

  it('handles Float with default correctly', () => {
    const { typeDefs, transformer } = noopDirective({
      declaration: '@noop(arg: Float = 0.888)',
      expectedDefault: 0.888,
    });

    const schemaWithResolvers = makeExecutableSchema({
      typeDefs: [
        typeDefs,
        /* GraphQL */ `
          type Query {
            hello: String @noop
          }
        `,
      ],
      resolvers: { Query: { hello: () => 'hello world' } },
    });

    transformer(schemaWithResolvers);
  });

  it('handles null default correctly', () => {
    const { typeDefs, transformer } = noopDirective({
      declaration: '@noop(arg: String = null)',
      expectedDefault: null,
    });

    const schemaWithResolvers = makeExecutableSchema({
      typeDefs: [
        typeDefs,
        /* GraphQL */ `
          type Query {
            hello: String @noop
          }
        `,
      ],
      resolvers: { Query: { hello: () => 'hello world' } },
    });

    transformer(schemaWithResolvers);
  });

  it('handles a list correctly', () => {
    const { typeDefs, transformer } = noopDirective({
      declaration: '@noop(arg: [String!]! = ["A", "B"])',
      expectedDefault: ['A', 'B'],
    });

    const schemaWithResolvers = makeExecutableSchema({
      typeDefs: [
        typeDefs,
        /* GraphQL */ `
          type Query {
            hello: String @noop
          }
        `,
      ],
      resolvers: { Query: { hello: () => 'hello world' } },
    });

    transformer(schemaWithResolvers);
  });

  it('handles an object correctly', () => {
    const { typeDefs, transformer } = noopDirective({
      declaration: '@noop(arg: Test = { a: "A", b: "B" })',
      expectedDefault: { a: 'A', b: 'B' },
    });

    const schemaWithResolvers = makeExecutableSchema({
      typeDefs: [
        typeDefs,
        /* GraphQL */ `
          type Query {
            hello: String @noop
          }
          input Test {
            a: String
            b: String
          }
        `,
      ],
      resolvers: {
        Query: {
          hello: () => 'hello world',
        },
      },
    });

    transformer(schemaWithResolvers);
  });
});
