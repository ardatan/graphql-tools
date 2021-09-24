import { graphql, print, buildSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { batchDelegateToSchema } from '@graphql-tools/batch-delegate';
import { RenameRootFields } from '@graphql-tools/wrap';
import { stitchSchemas } from '../src/stitchSchemas';

describe('merged interfaces via concrete type', () => {
  const baseSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */`
      type Product {
        id: ID!
        title: String
        extensions: ProductExtension
      }
      type ProductExtension {
        shop1: Shop1Product
      }
      type Shop1Product {
        id: ID!
      }
      type Query {
        product(id: ID!): Product
      }
    `,
    resolvers: {
      Query: {
        product(_obj, { id }) {
          return {
            id,
            title: 'Product ' + id,
            extensions: {
              shop1: { id }
            },
          };
        }
      }
    }
  });

  const shop1Schema = makeExecutableSchema({
    typeDefs: /* GraphQL */`
      type Product {
        id: ID!
        color: String
      }
      type Query {
        allProduct(ids: [ID!]!): [Product]!
      }
    `,
    resolvers: {
      Query: {
        allProduct(_obj, { ids }) {
          const colors = {
            '1': 'Copper',
            '2': 'Indigo',
          }
          return ids.map(id => ({ id, color: colors[id] || 'Navy' }));
        }
      }
    }
  });

  const shop1FacadeSchema = buildSchema(/* GraphQL */`
    type Shop1Product {
      id: ID!
      color: String
    }
    type Product {
      id: ID!
    }
    type Query {
      allProduct(ids: [ID!]!): [Product]!
      allProduct2(ids: [ID!]!): [Shop1Product]!
    }
  `);

  const shop1Executor = ({ document, variables }) => {
    const source =  typeof document === 'string' ? document : print(document);
    console.log(source, variables);
    return graphql({
      schema: shop1Schema,
      source,
      variableValues: variables,
    });
  };

  const stitchedSchema = stitchSchemas({
    subschemas: [
      {
        schema: baseSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fieldName: 'product',
            args: ({ id }) => ({ id }),
          }
        }
      },
      {
        schema: shop1FacadeSchema,
        executor: shop1Executor,
        merge: {
          Shop1Product: {
            selectionSet: '{ id }',
            key: ({ id }) => id,
            resolve: (_obj, context, info, subschemaConfig, selectionSet, key) => {
              return batchDelegateToSchema({
                schema: subschemaConfig,
                operation: 'query',
                fieldName: 'allProduct2',
                returnType: info.schema.getType('Shop1Product'),
                key,
                argsFromKeys: (ids) => ({ ids }),
                transforms: [
                  {
                    transformRequest(req) {
                      console.log(JSON.stringify(req.document.definitions[0].selectionSet));
                      return req;
                    },
                    transformResult(res) {
                      console.log(res);
                      return res;
                    }
                  }
                ],
                selectionSet,
                context,
                info,
                skipTypeMerging: true,
              });
            },
          }
        }
      },
    ],
  });


  test('lies about querying for merged types', async () => {
    const result = await graphql({
      schema: stitchedSchema,
      source: /* GraphQL */`
      query {
        product(id: "1") {
          id
          title
          extensions {
            shop1 {
              id
              color
            }
          }
        }
      }
    `});

    console.log(JSON.stringify(result, null, 2));

    //expect(result.data['placement']).toEqual({ id: '23', index: 23, name: 'Item 23' });
  });
});
