import { GraphQLSchema, parse, versionInfo } from 'graphql';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { normalizedExecutor } from '@graphql-tools/executor';
import { ExecutionRequest, Executor } from '@graphql-tools/utils';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';
import { getServiceInputs, getSupergraph } from './fixtures/gateway/supergraph';
import {
  Aschema,
  Bschema,
  Cschema,
  Dschema,
  Eschema,
} from './fixtures/optimizations/awareness-of-other-fields';

describe('Optimizations', () => {
  let serviceCallCnt: Record<string, number>;
  let schema: GraphQLSchema;
  beforeEach(async () => {
    serviceCallCnt = {};
    const serviceInputs = getServiceInputs();
    schema = getStitchedSchemaFromSupergraphSdl({
      supergraphSdl: await getSupergraph(),
      onSubschemaConfig(subschemaConfig) {
        const subgraphName = subschemaConfig.name.toLowerCase();
        const serviceInput = serviceInputs.find(input => input.name === subgraphName);
        if (!serviceInput) {
          throw new Error(`Service ${subgraphName} not found`);
        }
        const executor = createDefaultExecutor(serviceInput.schema);
        serviceCallCnt[subgraphName] = 0;
        subschemaConfig.executor = args => {
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
  it('should do deduplication', async () => {
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
      // inventory: 1, (when computed fields definition removed)
      inventory: 2,
      products: 2,
      reviews: 2,
    });
  });
});

describe('awareness-of-other-fields', () => {
  if (versionInfo.major < 16) {
    it('Skip test for older versions of GraphQL-js', () => {
      expect(true).toBe(true);
    });
    return;
  }
  let supergraphSdl: string;
  let gwSchema: GraphQLSchema;
  let subgraphCalls: { [subgraph: string]: number } = {};
  function getTracedExecutor(subgraphName: string, schema: GraphQLSchema): Executor {
    const executor = createDefaultExecutor(schema);
    return function tracedExecutor(execReq: ExecutionRequest) {
      subgraphCalls[subgraphName] = (subgraphCalls[subgraphName] || 0) + 1;
      return executor(execReq);
    };
  }
  afterEach(() => {
    subgraphCalls = {};
  });
  beforeAll(async () => {
    const { IntrospectAndCompose, LocalGraphQLDataSource } = await import('@apollo/gateway');
    return new IntrospectAndCompose({
      subgraphs: [
        { name: 'A', url: 'A' },
        { name: 'B', url: 'B' },
        { name: 'C', url: 'C' },
        { name: 'D', url: 'D' },
        { name: 'E', url: 'E' },
      ],
    })
      .initialize({
        healthCheck() {
          return Promise.resolve();
        },
        update(updatedSupergraphSdl) {
          supergraphSdl = updatedSupergraphSdl;
        },
        getDataSource({ name }) {
          switch (name) {
            case 'A':
              return new LocalGraphQLDataSource(Aschema);
            case 'B':
              return new LocalGraphQLDataSource(Bschema);
            case 'C':
              return new LocalGraphQLDataSource(Cschema);
            case 'D':
              return new LocalGraphQLDataSource(Dschema);
            case 'E':
              return new LocalGraphQLDataSource(Eschema);
          }
          throw new Error(`Unknown subgraph ${name}`);
        },
      })
      .then(result => {
        supergraphSdl = result.supergraphSdl;
      })
      .then(() => {
        gwSchema = getStitchedSchemaFromSupergraphSdl({
          supergraphSdl,
          onSubschemaConfig(subschemaConfig) {
            const subgraphName = subschemaConfig.name;
            switch (subgraphName) {
              case 'A':
                subschemaConfig.executor = getTracedExecutor(subgraphName, Aschema);
                break;
              case 'B':
                subschemaConfig.executor = getTracedExecutor(subgraphName, Bschema);
                break;
              case 'C':
                subschemaConfig.executor = getTracedExecutor(subgraphName, Cschema);
                break;
              case 'D':
                subschemaConfig.executor = getTracedExecutor(subgraphName, Dschema);
                break;
              case 'E':
                subschemaConfig.executor = getTracedExecutor(subgraphName, Eschema);
                break;
              default:
                throw new Error(`Unknown subgraph ${subgraphName}`);
            }
          },
        });
      });
  });
  it('do not call A subgraph as an extra', async () => {
    const result = await normalizedExecutor({
      schema: gwSchema,
      document: parse(/* GraphQL */ `
        query {
          user(id: 1) {
            nickname
            money
          }
        }
      `),
    });
    expect(result).toEqual({
      data: {
        user: {
          nickname: 'Ali',
          money: '1000 USD',
        },
      },
    });
    expect(subgraphCalls).toEqual({
      B: 1,
      C: 1,
      D: 1,
      E: 1,
    });
  });
});
