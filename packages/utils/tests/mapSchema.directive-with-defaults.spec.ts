import { GraphQLSchema } from 'graphql';
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
