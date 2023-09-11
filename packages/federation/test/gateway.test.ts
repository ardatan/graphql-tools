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
import * as accounts from './fixtures/gateway/accounts';
import * as inventory from './fixtures/gateway/inventory';
import * as products from './fixtures/gateway/products';
import * as reviews from './fixtures/gateway/reviews';
import '../../testing/to-be-similar-gql-doc';
import { federationToStitchingSDL, stitchingDirectives } from '@graphql-tools/stitching-directives';

const services = {
  accounts,
  inventory,
  products,
  reviews,
};

interface ServiceInput {
  name: string;
  typeDefs: string;
  schema: GraphQLSchema;
}

interface BuiltGateway {
  executor(document: DocumentNode): Promise<ExecutionResult>;
  serviceCallCounts: Record<string, number>;
}

interface TestScenario {
  name: string;
  buildSubgraphSchema(options: { typeDefs: string; resolvers: IResolvers }): GraphQLSchema;
  buildGateway(serviceInputs: ServiceInput[]): Promise<BuiltGateway>;
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

  const buildStitchingGateway = async (serviceInputs: ServiceInput[]): Promise<BuiltGateway> => {
    const serviceCallCounts: Record<string, number> = {};
    const subschemas: SubschemaConfig[] = await Promise.all(
      serviceInputs.map(async ({ schema, name }) => {
        serviceCallCounts[name] = 0;
        const subschema = await getSubschemaForFederationWithSchema(schema);
        const executor = createDefaultExecutor(schema);
        return {
          ...subschema,
          executor: async executionRequest => {
            serviceCallCounts[name]++;
            return executor(executionRequest);
          },
        };
      }),
    );
    let gatewaySchema = stitchSchemas({
      subschemas,
    });
    gatewaySchema = filterInternalFieldsAndTypes(gatewaySchema);

    return {
      executor: doc =>
        normalizedExecutor({
          schema: gatewaySchema,
          document: doc,
        }) as Promise<ExecutionResult>,
      serviceCallCounts,
    };
  };
  const {
    buildSubgraphSchema: buildApolloSubgraph,
  }: typeof import('@apollo/subgraph') = require('@apollo/subgraph');
  const {
    ApolloGateway,
    LocalGraphQLDataSource,
  }: typeof import('@apollo/gateway') = require('@apollo/gateway');
  const buildApolloGateway = async (serviceInputs: ServiceInput[]): Promise<BuiltGateway> => {
    const serviceCallCounts: Record<string, number> = {};
    const gateway = new ApolloGateway({
      serviceList: serviceInputs.map(({ name }) => ({
        name,
        url: `http://www.${name}.com`,
      })),
      buildService({ name }) {
        const schema = serviceInputs.find(({ name: n }) => n === name)!.schema;
        serviceCallCounts[name] = 0;
        const source = new LocalGraphQLDataSource(schema);
        return {
          process(opts) {
            serviceCallCounts[name]++;
            return source.process(opts);
          },
        };
      },
    });
    await gateway.load();
    return {
      executor: (document: DocumentNode) =>
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
        } as any) as Promise<ExecutionResult>,
      serviceCallCounts,
    };
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

  const buildApolloGatewayWithSupergraph = async (serviceInputs: ServiceInput[]) => {
    const serviceCallCounts = {};
    const gateway = new ApolloGateway({
      supergraphSdl,
      buildService({ name }) {
        const schema = serviceInputs.find(({ name: n }) => n === name)!.schema;
        serviceCallCounts[name] = 0;
        const source = new LocalGraphQLDataSource(schema);
        return {
          process(opts) {
            serviceCallCounts[name]++;
            return source.process(opts);
          },
        };
      },
    });
    await gateway.load();
    return {
      executor: (document: DocumentNode) =>
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
        } as any) as Promise<ExecutionResult>,
      serviceCallCounts,
    };
  };

  const buildStitchingGatewayWithSupergraph = async (serviceInputs: ServiceInput[]) => {
    const serviceCallCounts: Record<string, number> = {};
    const gatewaySchema = getStitchedSchemaFromSupergraphSdl({
      supergraphSdl,
      onExecutor({ subgraphName }) {
        serviceCallCounts[subgraphName] = 0;
        const schema = serviceInputs.find(({ name }) => name === subgraphName)!.schema;
        const executor = createDefaultExecutor(schema);
        return function subschemaExecutor(executionRequest) {
          serviceCallCounts[subgraphName]++;
          const errors = validate(schema, executionRequest.document);
          if (errors.length > 0) {
            return {
              errors,
            };
          }
          return executor(executionRequest);
        };
      },
    });

    return {
      executor: async (document: DocumentNode) => {
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
      },
      serviceCallCounts,
    };
  };
  const buildStitchingGatewayByConversion = async (serviceInputs: ServiceInput[]) => {
    const { stitchingDirectivesTransformer } = stitchingDirectives();
    const serviceCallCounts: Record<string, number> = {};
    const subschemas: SubschemaConfig[] = serviceInputs.map(({ typeDefs, schema, name }) => {
      const executor = createDefaultExecutor(schema);
      const stitchingSdl = federationToStitchingSDL(typeDefs);
      const subschemaSchema = buildSchema(stitchingSdl, {
        assumeValidSDL: true,
        assumeValid: true,
      });
      serviceCallCounts[name] = 0;
      return {
        schema: subschemaSchema,
        executor(executionRequest) {
          serviceCallCounts[name]++;
          const errors = validate(schema, executionRequest.document);
          if (errors.length > 0) {
            return {
              errors,
            };
          }
          return executor(executionRequest);
        },
      };
    });
    let gatewaySchema = stitchSchemas({
      subschemas,
      subschemaConfigTransforms: [stitchingDirectivesTransformer],
    });
    gatewaySchema = filterInternalFieldsAndTypes(gatewaySchema);
    return {
      executor: async (document: DocumentNode) => {
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
      },
      serviceCallCounts,
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
      let builtGateway: BuiltGateway;
      beforeEach(async () => {
        const serviceInputs: ServiceInput[] = [];
        for (const name in services) {
          const service = services[name];
          serviceInputs.push({
            name,
            typeDefs: service.typeDefs,
            schema: buildSubgraphSchema(service),
          });
        }
        builtGateway = await buildGateway(serviceInputs);
      });
      it('should generate the correct schema', async () => {
        const result = await builtGateway.executor(parse(getIntrospectionQuery()));
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
        const result = await builtGateway.executor(exampleQuery);
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
        /*
        expect(builtGateway.serviceCallCounts).toMatchObject({
          accounts: 2,
          inventory: 2,
          products: 2,
          reviews: 2,
        });
        */
      });
    });
  }
});
