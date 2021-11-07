import { wrapSchema, RenameRootTypes } from '@graphql-tools/wrap';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from '@graphql-tools/mock';
import { graphql } from 'graphql';

describe('RenameRootTypes', () => {
  test('should work', async () => {
    let subschema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        schema {
          query: QueryRoot
          mutation: MutationRoot
        }

        type QueryRoot {
          foo: String!
        }

        type MutationRoot {
          doSomething: DoSomethingPayload!
        }

        type DoSomethingPayload {
          query: QueryRoot!
        }
      `,
    });

    subschema = addMocksToSchema({ schema: subschema });

    const schema = wrapSchema({
      schema: subschema,
      transforms: [new RenameRootTypes(name => (name === 'QueryRoot' ? 'Query' : name))],
    });

    const result = await graphql({
      schema,
      source: `
        mutation {
          doSomething {
            query {
              foo
            }
          }
        }
      `,
    });

    expect(result).toEqual({
      data: {
        doSomething: {
          query: {
            foo: 'Hello World',
          },
        },
      },
    });
  });
});
