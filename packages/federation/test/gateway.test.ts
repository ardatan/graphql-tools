import * as Accounts from './fixtures/gateway/accounts';
import * as Products from './fixtures/gateway/products';
import * as Reviews from './fixtures/gateway/reviews';
import * as Inventory from './fixtures/gateway/inventory';
import { SubschemaConfig } from '@graphql-tools/delegate';
import { parse } from 'graphql';
import { stitchSchemas } from '@graphql-tools/stitch';
import { normalizedExecutor } from '@graphql-tools/executor';
import { getSubschemaForFederationWithSchema } from '@graphql-tools/federation';

describe('Gateway', () => {
  it('should give the correct result', async () => {
    const services = [Accounts, Products, Reviews, Inventory];
    const subschemas: SubschemaConfig[] = await Promise.all(
      services.map(({ schema }) => getSubschemaForFederationWithSchema(schema))
    );

    const gatewaySchema = stitchSchemas({
      subschemas,
    });

    const result = await normalizedExecutor({
      schema: gatewaySchema,
      document: parse(/* GraphQL */ `
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
              }
            }
          }
          topProducts {
            ...Product
            reviews {
              ...Review
              author {
                ...User
              }
            }
          }
        }
      `),
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "data": {
          "topProducts": [
            {
              "inStock": true,
              "name": "Table",
              "price": 899,
              "reviews": [
                {
                  "author": {
                    "id": "1",
                    "name": "Ada Lovelace",
                    "username": "@ada",
                  },
                  "body": "Love it!",
                  "id": "1",
                },
                {
                  "author": {
                    "id": "2",
                    "name": "Alan Turing",
                    "username": "@complete",
                  },
                  "body": "Prefer something else.",
                  "id": "4",
                },
              ],
              "shippingEstimate": 50,
              "upc": "1",
              "weight": 100,
            },
            {
              "inStock": false,
              "name": "Couch",
              "price": 1299,
              "reviews": [
                {
                  "author": {
                    "id": "1",
                    "name": "Ada Lovelace",
                    "username": "@ada",
                  },
                  "body": "Too expensive.",
                  "id": "2",
                },
              ],
              "shippingEstimate": 0,
              "upc": "2",
              "weight": 1000,
            },
            {
              "inStock": true,
              "name": "Chair",
              "price": 54,
              "reviews": [
                {
                  "author": {
                    "id": "2",
                    "name": "Alan Turing",
                    "username": "@complete",
                  },
                  "body": "Could be better.",
                  "id": "3",
                },
              ],
              "shippingEstimate": 25,
              "upc": "3",
              "weight": 50,
            },
          ],
          "users": [
            {
              "id": "1",
              "name": "Ada Lovelace",
              "reviews": [
                {
                  "body": "Love it!",
                  "id": "1",
                  "product": {
                    "inStock": true,
                    "name": "Table",
                    "price": 899,
                    "shippingEstimate": 50,
                    "upc": "1",
                    "weight": 100,
                  },
                },
                {
                  "body": "Too expensive.",
                  "id": "2",
                  "product": {
                    "inStock": false,
                    "name": "Couch",
                    "price": 1299,
                    "shippingEstimate": 0,
                    "upc": "2",
                    "weight": 1000,
                  },
                },
              ],
              "username": "@ada",
            },
            {
              "id": "2",
              "name": "Alan Turing",
              "reviews": [
                {
                  "body": "Could be better.",
                  "id": "3",
                  "product": {
                    "inStock": true,
                    "name": "Chair",
                    "price": 54,
                    "shippingEstimate": 25,
                    "upc": "3",
                    "weight": 50,
                  },
                },
                {
                  "body": "Prefer something else.",
                  "id": "4",
                  "product": {
                    "inStock": true,
                    "name": "Table",
                    "price": 899,
                    "shippingEstimate": 50,
                    "upc": "1",
                    "weight": 100,
                  },
                },
              ],
              "username": "@complete",
            },
          ],
        },
      }
    `);
  });
});
