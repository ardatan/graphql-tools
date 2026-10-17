import { parse } from 'graphql';
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
});
