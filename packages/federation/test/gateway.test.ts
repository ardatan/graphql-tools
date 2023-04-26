import * as Accounts from './fixtures/gateway/accounts';
import * as Products from './fixtures/gateway/products';
import * as Reviews from './fixtures/gateway/reviews';
import * as Inventory from './fixtures/gateway/inventory';
import { SubschemaConfig } from '@graphql-tools/delegate';
import { DocumentNode, GraphQLSchema, parse, print, versionInfo } from 'graphql';
import { stitchSchemas } from '@graphql-tools/stitch';
import { normalizedExecutor } from '@graphql-tools/executor';
import {
  buildSubgraphSchema as buildToolsSubgraphSchema,
  getSubschemaForFederationWithSchema,
} from '@graphql-tools/federation';
import { ExecutionResult, IResolvers } from '@graphql-tools/utils';

interface ServiceInput {
  typeDefs: string;
  schema: GraphQLSchema;
}

interface TestScenario {
  name: string;
  buildSubgraphSchema(options: { typeDefs: string; resolvers: IResolvers }): GraphQLSchema;
  buildGateway(services: ServiceInput[]): Promise<(document: DocumentNode) => Promise<ExecutionResult>>;
}

const exampleQuery = parse(/* GraphQL */ `
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
`);

describe('Federation', () => {
  if (versionInfo.major < 16) {
    it('should work', () => {});
    return;
  }

  const buildStitchingGateway = async (services: ServiceInput[]) => {
    const subschemas: SubschemaConfig[] = await Promise.all(
      services.map(({ schema }) => getSubschemaForFederationWithSchema(schema))
    );
    const gatewaySchema = stitchSchemas({
      subschemas,
    });

    return (document: DocumentNode) =>
      normalizedExecutor({
        schema: gatewaySchema,
        document,
      }) as Promise<ExecutionResult>;
  };
  const { buildSubgraphSchema: buildApolloSubgraph }: typeof import('@apollo/subgraph') = require('@apollo/subgraph');
  const { ApolloGateway, LocalGraphQLDataSource }: typeof import('@apollo/gateway') = require('@apollo/gateway');
  const buildApolloGateway = async (services: ServiceInput[]) => {
    const gateway = new ApolloGateway({
      serviceList: services.map((_, i) => ({
        name: `service${i}`,
        url: `http://www.service-${i}.com`,
      })),
      buildService({ name }) {
        const [, i] = name.split('service');
        return new LocalGraphQLDataSource(services[parseInt(i)].schema);
      },
    });
    await gateway.load();
    return (document: DocumentNode) =>
      gateway.executor({
        document,
        request: {
          query: print(document),
        },
        cache: {
          get: async () => undefined,
          set: async () => {},
          delete: async () => true,
        },
        schema: gateway.schema!,
        context: {},
      } as any) as Promise<ExecutionResult>;
  };
  const scenarios: TestScenario[] = [
    {
      name: 'Tools Gateway vs. Tools Subgraph',
      buildSubgraphSchema: buildToolsSubgraphSchema,
      buildGateway: buildStitchingGateway,
    },
    {
      name: 'Tools Gateway vs. Apollo Subgraph',
      buildSubgraphSchema: options =>
        buildApolloSubgraph([
          {
            typeDefs: parse(options.typeDefs),
            resolvers: options.resolvers as any,
          },
        ]),
      buildGateway: buildStitchingGateway,
    },
    {
      name: 'Apollo Gateway vs. Tools Subgraph',
      buildSubgraphSchema: buildToolsSubgraphSchema,
      buildGateway: buildApolloGateway,
    },
  ];
  for (const { name, buildSubgraphSchema, buildGateway } of scenarios) {
    describe(name, () => {
      it('should give the correct result', async () => {
        const services = [Accounts, Products, Reviews, Inventory];

        const serviceInputs = services.map(service => ({
          typeDefs: service.typeDefs,
          schema: buildSubgraphSchema(service),
        }));

        const gatewayExecutor = await buildGateway(serviceInputs);

        const result = await gatewayExecutor(exampleQuery);

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
  }
});
