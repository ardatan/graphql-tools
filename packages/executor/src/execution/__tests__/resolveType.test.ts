import { GraphQLResolveInfo, parse, versionInfo } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { normalizedExecutor } from '../normalizedExecutor';

describe('resolveType', () => {
  it('should resolve types correctly with type names', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: Foo
        }
        union Foo = Bar | Baz
        type Bar {
          bar: String
        }
        type Baz {
          baz: String
        }
      `,
      resolvers: {
        Query: {
          foo: () => ({ bar: 'bar' }),
        },
        Foo: {
          __resolveType: (obj: { bar: string } | { baz: string }) => {
            if ('bar' in obj) {
              return 'Bar';
            }
            if ('baz' in obj) {
              return 'Baz';
            }
            return null;
          },
        },
      },
    });
    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          foo {
            ... on Bar {
              bar
            }
            ... on Baz {
              baz
            }
          }
        }
      `),
    });
    expect(result).toEqual({
      data: {
        foo: {
          bar: 'bar',
        },
      },
    });
  });
  if (versionInfo.major < 16) {
    it('should resolve types correctly with types', async () => {
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            foo: Foo
          }
          union Foo = Bar | Baz
          type Bar {
            bar: String
          }
          type Baz {
            baz: String
          }
        `,
        resolvers: {
          Query: {
            foo: () => ({ bar: 'bar' }),
          },
          Foo: {
            // @ts-ignore - tests for older versions
            __resolveType: (
              obj: { bar: string } | { baz: string },
              _ctx: never,
              info: GraphQLResolveInfo,
            ) => {
              if ('bar' in obj) {
                return info.schema.getType('Bar');
              }
              if ('baz' in obj) {
                return info.schema.getType('Baz');
              }
              return null;
            },
          },
        },
      });
      const result = await normalizedExecutor({
        schema,
        document: parse(/* GraphQL */ `
          query {
            foo {
              ... on Bar {
                bar
              }
              ... on Baz {
                baz
              }
            }
          }
        `),
      });
      expect(result).toEqual({
        data: {
          foo: {
            bar: 'bar',
          },
        },
      });
    });
  }
});
