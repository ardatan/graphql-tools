import { readFileSync } from 'fs';
import { join } from 'path';
import { GraphQLSchema, parse } from 'graphql';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { normalizedExecutor } from '@graphql-tools/executor';
import { buildSubgraphSchema } from '../src/subgraph';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';
import * as accounts from './fixtures/gateway/accounts';
import * as inventory from './fixtures/gateway/inventory';
import * as products from './fixtures/gateway/products';
import * as reviews from './fixtures/gateway/reviews';

describe('Optimizations', () => {
  const services = {
    accounts,
    inventory,
    products,
    reviews,
  };
  let serviceCallCnt: Record<string, number>;
  let schema: GraphQLSchema;
  beforeEach(() => {
    serviceCallCnt = {};
    schema = getStitchedSchemaFromSupergraphSdl({
      supergraphSdl: readFileSync(
        join(__dirname, 'fixtures', 'gateway', 'supergraph.graphql'),
        'utf8',
      ),
      onExecutor({ subgraphName }) {
        const schema = buildSubgraphSchema(services[subgraphName]);
        const executor = createDefaultExecutor(schema);
        serviceCallCnt[subgraphName] = 0;
        return async args => {
          serviceCallCnt[subgraphName]++;
          return executor(args);
        };
      },
    });
  });
  it('should not do extra calls with "@provides"', async () => {
    const query = /* GraphQL */ `
      query {
        topProducts {
          name
          reviews {
            body
            author {
              username
            }
          }
        }
      }
    `;
    await normalizedExecutor({
      schema,
      document: parse(query),
    });
    expect(serviceCallCnt['accounts']).toBe(0);
  });
  it.todo('should do deduplication', async () => {
    const query = /* GraphQL */ `
      fragment User on User {
        id
        username
        name
      }

      fragment Review on Review {
        id
        body
      }

      fragment Product on Product {
        inStock
        name
        price
        shippingEstimate
        upc
        weight
      }

      query TestQuery {
        users {
          ...User
          reviews {
            ...Review
            product {
              ...Product
              reviews {
                ...Review
                author {
                  ...User
                  reviews {
                    ...Review
                    product {
                      ...Product
                    }
                  }
                }
              }
            }
          }
        }
        topProducts {
          ...Product
          reviews {
            ...Review
            author {
              ...User
              reviews {
                ...Review
                product {
                  ...Product
                }
              }
            }
          }
        }
      }
    `;
    await normalizedExecutor({
      schema,
      document: parse(query),
    });
    expect(serviceCallCnt).toMatchObject({
      accounts: 2,
      inventory: 1,
      products: 2,
      reviews: 2,
    });
  });
});
