import { readFileSync } from 'fs';
import { join } from 'path';
import {
  buildClientSchema,
  buildSchema,
  DocumentNode,
  getIntrospectionQuery,
  GraphQLSchema,
  lexicographicSortSchema,
  parse,
  print,
  printSchema,
  validate,
  versionInfo,
} from 'graphql';
import { createDefaultExecutor, SubschemaConfig } from '@graphql-tools/delegate';
import { normalizedExecutor } from '@graphql-tools/executor';
import {
  buildSubgraphSchema as buildToolsSubgraphSchema,
  filterInternalFieldsAndTypes,
  getSubschemaForFederationWithSchema,
} from '@graphql-tools/federation';
import { stitchSchemas } from '@graphql-tools/stitch';
import { ExecutionResult, IResolvers } from '@graphql-tools/utils';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';
import * as Accounts from './fixtures/gateway/accounts';
import * as Inventory from './fixtures/gateway/inventory';
import * as Products from './fixtures/gateway/products';
import * as Reviews from './fixtures/gateway/reviews';
import '../../testing/to-be-similar-gql-doc';
import { federationToStitchingSDL, stitchingDirectives } from '@graphql-tools/stitching-directives';

interface ServiceInput {
  typeDefs: string;
  schema: GraphQLSchema;
}

interface TestScenario {
  name: string;
  buildSubgraphSchema(options: { typeDefs: string; resolvers: IResolvers }): GraphQLSchema;
  buildGateway(
    services: ServiceInput[],
  ): Promise<(document: DocumentNode) => Promise<ExecutionResult>>;
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
`);

describe('Federation', () => {
  if (versionInfo.major < 16) {
    it('should work', () => {});
    return;
  }

  const buildStitchingGateway = async (services: ServiceInput[]) => {
    const subschemas: SubschemaConfig[] = await Promise.all(
      services.map(({ schema }) => getSubschemaForFederationWithSchema(schema)),
    );
    let gatewaySchema = stitchSchemas({
      subschemas,
    });
    gatewaySchema = filterInternalFieldsAndTypes(gatewaySchema);

    return (document: DocumentNode) =>
      normalizedExecutor({
        schema: gatewaySchema,
        document,
      }) as Promise<ExecutionResult>;
  };
  const {
    buildSubgraphSchema: buildApolloSubgraph,
  }: typeof import('@apollo/subgraph') = require('@apollo/subgraph');
  const {
    ApolloGateway,
    LocalGraphQLDataSource,
  }: typeof import('@apollo/gateway') = require('@apollo/gateway');
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
  const buildSubgraphWithApollo = (options: { typeDefs: string; resolvers: IResolvers }) =>
    buildApolloSubgraph([
      {
        typeDefs: parse(options.typeDefs),
        resolvers: options.resolvers as any,
      },
    ]);

  const supergraphSdl = readFileSync(
    join(__dirname, './fixtures/gateway/supergraph.graphql'),
    'utf8',
  );

  const buildApolloGatewayWithSupergraph = async (services: ServiceInput[]) => {
    const gateway = new ApolloGateway({
      supergraphSdl,
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

  const buildStitchingGatewayWithSupergraph = async (services: ServiceInput[]) => {
    const gatewaySchema = getStitchedSchemaFromSupergraphSdl({
      supergraphSdl,
      onExecutor({ subgraphName }) {
        const [, i] = subgraphName.split('SERVICE');
        const executor = createDefaultExecutor(services[parseInt(i)].schema);
        return function subschemaExecutor(executionRequest) {
          const errors = validate(services[parseInt(i)].schema, executionRequest.document);
          if (errors.length > 0) {
            return {
              errors,
            };
          }
          return executor(executionRequest);
        };
      },
    });

    return async (document: DocumentNode) => {
      const errors = validate(gatewaySchema, document);
      if (errors.length > 0) {
        return {
          errors,
        };
      }
      return normalizedExecutor({
        schema: gatewaySchema,
        document,
      }) as Promise<ExecutionResult>;
    };
  };
  const buildStitchingGatewayByConversion = async (services: ServiceInput[]) => {
    const { stitchingDirectivesTransformer } = stitchingDirectives();
    const subschemas: SubschemaConfig[] = services.map(({ typeDefs, schema }, i) => {
      const executor = createDefaultExecutor(schema);
      const stitchingSdl = federationToStitchingSDL(typeDefs);
      const subschemaSchema = buildSchema(stitchingSdl, {
        assumeValidSDL: true,
        assumeValid: true,
      });
      return {
        schema: subschemaSchema,
        executor(executionRequest) {
          console.count(`Conversion: Service ${i} execution`);
          return executor(executionRequest);
        },
      };
    });
    let gatewaySchema = stitchSchemas({
      subschemas,
      subschemaConfigTransforms: [stitchingDirectivesTransformer],
    });
    gatewaySchema = filterInternalFieldsAndTypes(gatewaySchema);
    return async (document: DocumentNode) => {
      const errors = validate(gatewaySchema, document);
      if (errors.length > 0) {
        return {
          errors,
        };
      }
      return normalizedExecutor({
        schema: gatewaySchema,
        document,
      }) as Promise<ExecutionResult>;
    };
  };
  const scenarios: TestScenario[] = [
    {
      name: 'Tools Gateway vs. Tools Subgraph',
      buildSubgraphSchema: buildToolsSubgraphSchema,
      buildGateway: buildStitchingGateway,
    },
    {
      name: 'Tools Gateway vs. Apollo Subgraph',
      buildSubgraphSchema: buildSubgraphWithApollo,
      buildGateway: buildStitchingGateway,
    },
    {
      name: 'Apollo Gateway vs. Tools Subgraph',
      buildSubgraphSchema: buildToolsSubgraphSchema,
      buildGateway: buildApolloGateway,
    },
    {
      name: 'Apollo Gateway with Supergraph vs. Tools Subgraph',
      buildSubgraphSchema: buildToolsSubgraphSchema,
      buildGateway: buildApolloGatewayWithSupergraph,
    },
    {
      name: 'Tools Gateway with Supergraph vs. Apollo Subgraph',
      buildSubgraphSchema: buildSubgraphWithApollo,
      buildGateway: buildStitchingGatewayWithSupergraph,
    },
    {
      name: 'Tools Gateway with Supergraph vs. Tools Subgraph',
      buildSubgraphSchema: buildToolsSubgraphSchema,
      buildGateway: buildStitchingGatewayWithSupergraph,
    },
    {
      name: 'Tools Gateway by converting Federation to Stitching SDL vs. Tools Subgraph',
      buildSubgraphSchema: buildToolsSubgraphSchema,
      buildGateway: buildStitchingGatewayByConversion,
    },
    {
      name: 'Tools Gateway by converting Federation to Stitching SDL vs. Apollo Subgraph',
      buildSubgraphSchema: buildSubgraphWithApollo,
      buildGateway: buildStitchingGatewayByConversion,
    },
  ];
  for (const { name, buildSubgraphSchema, buildGateway } of scenarios) {
    describe(name, () => {
      let gatewayExecutor: (document: DocumentNode) => Promise<ExecutionResult>;
      beforeEach(async () => {
        const services = [Accounts, Products, Reviews, Inventory];

        const serviceInputs = services.map(service => ({
          typeDefs: service.typeDefs,
          schema: buildSubgraphSchema(service),
        }));
        gatewayExecutor = await buildGateway(serviceInputs);
      });
      it('should generate the correct schema', async () => {
        const result = await gatewayExecutor(parse(getIntrospectionQuery()));
        const schema = buildClientSchema(result.data);
        expect(printSchema(lexicographicSortSchema(schema))).toBeSimilarGqlDoc(/* GraphQL */ `
          type Product {
            inStock: Boolean
            name: String
            price: Int
            reviews: [Review]
            shippingEstimate: Int
            upc: String!
            weight: Int
          }

          type Query {
            me: User
            topProducts(first: Int): [Product]
            users: [User]
          }

          type Review {
            author: User
            body: String
            id: ID!
            product: Product
          }

          type User {
            birthDate: String
            id: ID!
            name: String
            numberOfReviews: Int
            reviews: [Review]
            username: String
          }
        `);
      });
      it('should give the correct result', async () => {
        const result = await gatewayExecutor(exampleQuery);
        expect(result).toEqual({
          data: {
            topProducts: [
              {
                inStock: true,
                name: 'Table',
                price: 899,
                reviews: [
                  {
                    author: {
                      id: '1',
                      name: 'Ada Lovelace',
                      reviews: [
                        {
                          body: 'Love it!',
                          id: '1',
                          product: {
                            inStock: true,
                            name: 'Table',
                            price: 899,
                            shippingEstimate: 50,
                            upc: '1',
                            weight: 100,
                          },
                        },
                        {
                          body: 'Too expensive.',
                          id: '2',
                          product: {
                            inStock: false,
                            name: 'Couch',
                            price: 1299,
                            shippingEstimate: 0,
                            upc: '2',
                            weight: 1000,
                          },
                        },
                      ],
                      username: '@ada',
                    },
                    body: 'Love it!',
                    id: '1',
                  },
                  {
                    author: {
                      id: '2',
                      name: 'Alan Turing',
                      reviews: [
                        {
                          body: 'Could be better.',
                          id: '3',
                          product: {
                            inStock: true,
                            name: 'Chair',
                            price: 54,
                            shippingEstimate: 25,
                            upc: '3',
                            weight: 50,
                          },
                        },
                        {
                          body: 'Prefer something else.',
                          id: '4',
                          product: {
                            inStock: true,
                            name: 'Table',
                            price: 899,
                            shippingEstimate: 50,
                            upc: '1',
                            weight: 100,
                          },
                        },
                      ],
                      username: '@complete',
                    },
                    body: 'Prefer something else.',
                    id: '4',
                  },
                ],
                shippingEstimate: 50,
                upc: '1',
                weight: 100,
              },
              {
                inStock: false,
                name: 'Couch',
                price: 1299,
                reviews: [
                  {
                    author: {
                      id: '1',
                      name: 'Ada Lovelace',
                      reviews: [
                        {
                          body: 'Love it!',
                          id: '1',
                          product: {
                            inStock: true,
                            name: 'Table',
                            price: 899,
                            shippingEstimate: 50,
                            upc: '1',
                            weight: 100,
                          },
                        },
                        {
                          body: 'Too expensive.',
                          id: '2',
                          product: {
                            inStock: false,
                            name: 'Couch',
                            price: 1299,
                            shippingEstimate: 0,
                            upc: '2',
                            weight: 1000,
                          },
                        },
                      ],
                      username: '@ada',
                    },
                    body: 'Too expensive.',
                    id: '2',
                  },
                ],
                shippingEstimate: 0,
                upc: '2',
                weight: 1000,
              },
              {
                inStock: true,
                name: 'Chair',
                price: 54,
                reviews: [
                  {
                    author: {
                      id: '2',
                      name: 'Alan Turing',
                      reviews: [
                        {
                          body: 'Could be better.',
                          id: '3',
                          product: {
                            inStock: true,
                            name: 'Chair',
                            price: 54,
                            shippingEstimate: 25,
                            upc: '3',
                            weight: 50,
                          },
                        },
                        {
                          body: 'Prefer something else.',
                          id: '4',
                          product: {
                            inStock: true,
                            name: 'Table',
                            price: 899,
                            shippingEstimate: 50,
                            upc: '1',
                            weight: 100,
                          },
                        },
                      ],
                      username: '@complete',
                    },
                    body: 'Could be better.',
                    id: '3',
                  },
                ],
                shippingEstimate: 25,
                upc: '3',
                weight: 50,
              },
            ],
            users: [
              {
                id: '1',
                name: 'Ada Lovelace',
                reviews: [
                  {
                    body: 'Love it!',
                    id: '1',
                    product: {
                      inStock: true,
                      name: 'Table',
                      price: 899,
                      reviews: [
                        {
                          author: {
                            id: '1',
                            name: 'Ada Lovelace',
                            reviews: [
                              {
                                body: 'Love it!',
                                id: '1',
                                product: {
                                  inStock: true,
                                  name: 'Table',
                                  price: 899,
                                  shippingEstimate: 50,
                                  upc: '1',
                                  weight: 100,
                                },
                              },
                              {
                                body: 'Too expensive.',
                                id: '2',
                                product: {
                                  inStock: false,
                                  name: 'Couch',
                                  price: 1299,
                                  shippingEstimate: 0,
                                  upc: '2',
                                  weight: 1000,
                                },
                              },
                            ],
                            username: '@ada',
                          },
                          body: 'Love it!',
                          id: '1',
                        },
                        {
                          author: {
                            id: '2',
                            name: 'Alan Turing',
                            reviews: [
                              {
                                body: 'Could be better.',
                                id: '3',
                                product: {
                                  inStock: true,
                                  name: 'Chair',
                                  price: 54,
                                  shippingEstimate: 25,
                                  upc: '3',
                                  weight: 50,
                                },
                              },
                              {
                                body: 'Prefer something else.',
                                id: '4',
                                product: {
                                  inStock: true,
                                  name: 'Table',
                                  price: 899,
                                  shippingEstimate: 50,
                                  upc: '1',
                                  weight: 100,
                                },
                              },
                            ],
                            username: '@complete',
                          },
                          body: 'Prefer something else.',
                          id: '4',
                        },
                      ],
                      shippingEstimate: 50,
                      upc: '1',
                      weight: 100,
                    },
                  },
                  {
                    body: 'Too expensive.',
                    id: '2',
                    product: {
                      inStock: false,
                      name: 'Couch',
                      price: 1299,
                      reviews: [
                        {
                          author: {
                            id: '1',
                            name: 'Ada Lovelace',
                            reviews: [
                              {
                                body: 'Love it!',
                                id: '1',
                                product: {
                                  inStock: true,
                                  name: 'Table',
                                  price: 899,
                                  shippingEstimate: 50,
                                  upc: '1',
                                  weight: 100,
                                },
                              },
                              {
                                body: 'Too expensive.',
                                id: '2',
                                product: {
                                  inStock: false,
                                  name: 'Couch',
                                  price: 1299,
                                  shippingEstimate: 0,
                                  upc: '2',
                                  weight: 1000,
                                },
                              },
                            ],
                            username: '@ada',
                          },
                          body: 'Too expensive.',
                          id: '2',
                        },
                      ],
                      shippingEstimate: 0,
                      upc: '2',
                      weight: 1000,
                    },
                  },
                ],
                username: '@ada',
              },
              {
                id: '2',
                name: 'Alan Turing',
                reviews: [
                  {
                    body: 'Could be better.',
                    id: '3',
                    product: {
                      inStock: true,
                      name: 'Chair',
                      price: 54,
                      reviews: [
                        {
                          author: {
                            id: '2',
                            name: 'Alan Turing',
                            reviews: [
                              {
                                body: 'Could be better.',
                                id: '3',
                                product: {
                                  inStock: true,
                                  name: 'Chair',
                                  price: 54,
                                  shippingEstimate: 25,
                                  upc: '3',
                                  weight: 50,
                                },
                              },
                              {
                                body: 'Prefer something else.',
                                id: '4',
                                product: {
                                  inStock: true,
                                  name: 'Table',
                                  price: 899,
                                  shippingEstimate: 50,
                                  upc: '1',
                                  weight: 100,
                                },
                              },
                            ],
                            username: '@complete',
                          },
                          body: 'Could be better.',
                          id: '3',
                        },
                      ],
                      shippingEstimate: 25,
                      upc: '3',
                      weight: 50,
                    },
                  },
                  {
                    body: 'Prefer something else.',
                    id: '4',
                    product: {
                      inStock: true,
                      name: 'Table',
                      price: 899,
                      reviews: [
                        {
                          author: {
                            id: '1',
                            name: 'Ada Lovelace',
                            reviews: [
                              {
                                body: 'Love it!',
                                id: '1',
                                product: {
                                  inStock: true,
                                  name: 'Table',
                                  price: 899,
                                  shippingEstimate: 50,
                                  upc: '1',
                                  weight: 100,
                                },
                              },
                              {
                                body: 'Too expensive.',
                                id: '2',
                                product: {
                                  inStock: false,
                                  name: 'Couch',
                                  price: 1299,
                                  shippingEstimate: 0,
                                  upc: '2',
                                  weight: 1000,
                                },
                              },
                            ],
                            username: '@ada',
                          },
                          body: 'Love it!',
                          id: '1',
                        },
                        {
                          author: {
                            id: '2',
                            name: 'Alan Turing',
                            reviews: [
                              {
                                body: 'Could be better.',
                                id: '3',
                                product: {
                                  inStock: true,
                                  name: 'Chair',
                                  price: 54,
                                  shippingEstimate: 25,
                                  upc: '3',
                                  weight: 50,
                                },
                              },
                              {
                                body: 'Prefer something else.',
                                id: '4',
                                product: {
                                  inStock: true,
                                  name: 'Table',
                                  price: 899,
                                  shippingEstimate: 50,
                                  upc: '1',
                                  weight: 100,
                                },
                              },
                            ],
                            username: '@complete',
                          },
                          body: 'Prefer something else.',
                          id: '4',
                        },
                      ],
                      shippingEstimate: 50,
                      upc: '1',
                      weight: 100,
                    },
                  },
                ],
                username: '@complete',
              },
            ],
          },
        });
      });
    });
  }
});
