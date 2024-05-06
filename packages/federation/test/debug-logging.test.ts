import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'graphql';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { createDefaultExecutor, delegationPlanInfosByContext } from '@graphql-tools/delegate';
import { normalizedExecutor } from '@graphql-tools/executor';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';
import * as accounts from './fixtures/gateway/accounts';
import * as discount from './fixtures/gateway/discount';
import * as inventory from './fixtures/gateway/inventory';
import * as products from './fixtures/gateway/products';
import * as reviews from './fixtures/gateway/reviews';

const services: Record<string, { typeDefs: string; resolvers: any }> = {
  accounts,
  inventory,
  products,
  reviews,
  discount,
};

describe('Debug Logging', () => {
  const existingFlag = process.env['EXPOSE_DELEGATION_PLAN'];
  const existingMathRandom = Math.random;
  beforeEach(() => {
    process.env['EXPOSE_DELEGATION_PLAN'] = 'true';
    let counter = 0;
    Math.random = () => 0.123456 + counter++ * 0.000001;
  });
  afterEach(() => {
    process.env['EXPOSE_DELEGATION_PLAN'] = existingFlag;
    Math.random = existingMathRandom;
  });
  const exampleQuery = /* GraphQL */ `
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
    }
  `;
  const supergraphSdl = readFileSync(
    join(__dirname, './fixtures/gateway/supergraph.graphql'),
    'utf8',
  );
  const stitchedSchema = getStitchedSchemaFromSupergraphSdl({
    supergraphSdl,
    onExecutor({ subgraphName }) {
      const schema = buildSubgraphSchema({
        typeDefs: parse(services[subgraphName].typeDefs),
        resolvers: services[subgraphName].resolvers,
      });
      return createDefaultExecutor(schema);
    },
  });
  it('should expose delegation plan correctly by context', async () => {
    const contextValue = {};
    await normalizedExecutor({
      schema: stitchedSchema,
      document: parse(exampleQuery),
      contextValue,
    });
    const delegationInfos = delegationPlanInfosByContext.get(contextValue);
    expect(delegationInfos).toBeDefined();
    expect(delegationInfos).toMatchSnapshot('delegationInfos');
  });
});
