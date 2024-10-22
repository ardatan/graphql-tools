import { GraphQLSchema, parse, print, versionInfo } from 'graphql';
import { kebabCase } from 'lodash';
import { buildSubgraphSchema } from '@apollo/subgraph';
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

it('prevents recursively depending fields in case of multiple keys', async () => {
  const authors = [
    {
      __typename: 'Author',
      id: '1',
      name: 'John Doe',
    },
    {
      __typename: 'Author',
      id: '2',
      name: 'Jane Doe',
    },
    {
      __typename: 'Author',
      id: '3',
      name: 'Max Mustermann',
    },
  ];
  const books = [
    {
      __typename: 'Book',
      id: '1',
      upc: '1_upc',
      author: authors[0],
    },
    {
      __typename: 'Book',
      id: '2',
      upc: '2_upc',
      authorId: '2',
      author: authors[1],
    },
    {
      __typename: 'Book',
      id: '3',
      upc: '3_upc',
      author: authors[2],
    },
  ];
  const booksSchema = buildSubgraphSchema({
    typeDefs: parse(/* GraphQL */ `
      type Book @key(fields: "id") @key(fields: "upc") {
        id: ID!
        upc: ID!
      }
    `),
    resolvers: {
      Book: {
        __resolveReference(reference: { id?: string; upc?: string }) {
          if (reference.id) {
            return books.find(book => book.id === reference.id);
          }
          if (reference.upc && reference.upc !== '3_upc') {
            return books.find(book => book.upc === reference.upc);
          }
          return null;
        },
      },
    },
  });
  const multiLocationMgmt = buildSubgraphSchema({
    typeDefs: parse(/* GraphQL */ `
      type BookContainer { # the type that is used in a collection
        id: ID!
        # ... other stuff here
        source: Book!
      }

      type Book @key(fields: "upc") {
        upc: ID!
      }

      type Query {
        viewer: Viewer
      }

      type Viewer {
        booksContainer: BooksContainerResult
      }

      type BooksContainerResult {
        edges: [BooksContainerEdge!]!
        pageInfo: PageInfo!
      }

      type BooksContainerEdge {
        node: BookContainer!
        cursor: String!
      }

      type PageInfo {
        endCursor: String
      }
    `),
    resolvers: {
      Query: {
        viewer() {
          return {
            booksContainer: {
              edges: [
                {
                  node: {
                    id: '1',
                    source: {
                      upc: '1_upc',
                    },
                  },
                  cursor: '1',
                },
                {
                  node: {
                    id: '2',
                    source: {
                      upc: '2_upc',
                    },
                  },
                  cursor: '2',
                },
                {
                  node: {
                    id: '3',
                    source: {
                      upc: '3_upc',
                    },
                  },
                  cursor: '3',
                },
              ],
              pageInfo: {
                endCursor: '3',
              },
            },
          };
        },
      },
    },
  });
  const authorsSchema = buildSubgraphSchema({
    typeDefs: parse(/* GraphQL */ `
      type Author @key(fields: "id") {
        id: ID!
        name: String!
      }
      type Book @key(fields: "id") {
        id: ID!
        author: Author
      }
    `),
    resolvers: {
      Book: {
        __resolveReference(reference: { id?: string }) {
          if (!reference) {
            throw new Error('No reference');
          }
          if (!reference.id) {
            throw new Error('No id');
          }
          return books.find(book => book.id === reference.id);
        },
      },
    },
  });

  const { IntrospectAndCompose, LocalGraphQLDataSource } = await import('@apollo/gateway');
  const introspectAndCompose = await new IntrospectAndCompose({
    subgraphs: [
      { name: 'books', url: 'books' },
      { name: 'other-service', url: 'other-service' },
      { name: 'authors', url: 'authors' },
    ],
  }).initialize({
    healthCheck() {
      return Promise.resolve();
    },
    update() {},
    getDataSource({ name }) {
      switch (kebabCase(name)) {
        case 'books':
          return new LocalGraphQLDataSource(booksSchema);
        case 'other-service':
          return new LocalGraphQLDataSource(multiLocationMgmt);
        case 'authors':
          return new LocalGraphQLDataSource(authorsSchema);
      }
      throw new Error(`Unknown subgraph ${name}`);
    },
  });
  const supergraphSdl = introspectAndCompose.supergraphSdl;
  await introspectAndCompose.cleanup();
  let subgraphCallsMap = {};
  function createTracedExecutor(subgraphName: string, schema: GraphQLSchema): Executor {
    const executor = createDefaultExecutor(schema);
    return function tracedExecutor(execReq) {
      subgraphCallsMap[subgraphName] ||= [];
      subgraphCallsMap[subgraphName].push({
        query: print(execReq.document),
        variables: execReq.variables,
      });
      return executor(execReq);
    };
  }
  const gwSchema = getStitchedSchemaFromSupergraphSdl({
    supergraphSdl,
    onSubschemaConfig(subschemaConfig) {
      const subgraphName = kebabCase(subschemaConfig.name);
      switch (subgraphName) {
        case 'books':
          subschemaConfig.executor = createTracedExecutor(subgraphName, booksSchema);
          break;
        case 'other-service':
          subschemaConfig.executor = createTracedExecutor(subgraphName, multiLocationMgmt);
          break;
        case 'authors':
          subschemaConfig.executor = createTracedExecutor(subgraphName, authorsSchema);
          break;
        default:
          throw new Error(`Unknown subgraph ${subgraphName}`);
      }
    },
  });
  const result = await normalizedExecutor({
    schema: gwSchema,
    document: parse(/* GraphQL */ `
      query {
        viewer {
          booksContainer(input: $input) {
            edges {
              cursor
              node {
                source {
                  # Book(upc=)
                  upc
                }
              }
            }
            pageInfo {
              endCursor
            }
          }
        }
      }
    `),
  });
  expect(result).toEqual({
    data: {
      viewer: {
        booksContainer: {
          edges: [
            { cursor: '1', node: { source: { upc: '1_upc' } } },
            { cursor: '2', node: { source: { upc: '2_upc' } } },
            { cursor: '3', node: { source: { upc: '3_upc' } } },
          ],
          pageInfo: { endCursor: '3' },
        },
      },
    },
  });
  expect(Object.keys(subgraphCallsMap)).toEqual(['other-service']);
  expect(subgraphCallsMap['other-service'].length).toBe(1);
  subgraphCallsMap = {};
  const result2 = await normalizedExecutor({
    schema: gwSchema,
    document: parse(/* GraphQL */ `
      query {
        viewer {
          booksContainer(input: $input) {
            edges {
              cursor
              node {
                source {
                  # Book(upc=)
                  upc
                  author {
                    name
                  }
                }
              }
            }
            pageInfo {
              endCursor
            }
          }
        }
      }
    `),
  });
  expect(result2).toEqual({
    data: {
      viewer: {
        booksContainer: {
          edges: [
            { cursor: '1', node: { source: { upc: '1_upc', author: { name: 'John Doe' } } } },
            { cursor: '2', node: { source: { upc: '2_upc', author: { name: 'Jane Doe' } } } },
            { cursor: '3', node: { source: { upc: '3_upc', author: null } } },
          ],
          pageInfo: { endCursor: '3' },
        },
      },
    },
  });
});
