import { buildSchema, graphql, GraphQLSchema } from 'graphql';
import { addMocksToSchema, RelayPaginationParams, relayStylePaginationMock } from '../src/index.js';

const typeDefs = /* GraphQL */ `
  type Item {
    id: ID!
    index: Int!
  }

  type ItemEdge {
    node: Item!
    cursor: String!
  }

  type PageInfo {
    hasPreviousPage: Boolean!
    hasNextPage: Boolean!
    startCursor: String!
    endCursor: String!
  }

  type ItemConnection {
    edges: [ItemEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type Query {
    items(first: Int, after: String, last: Int, before: String, oddIndexOnly: Boolean): ItemConnection!
  }
`;

const schema = buildSchema(typeDefs);

describe('relayStylePaginationMock', () => {
  describe('basic usage', () => {
    let mockedSchema: GraphQLSchema;
    beforeEach(() => {
      mockedSchema = addMocksToSchema({
        schema,
        mocks: {
          Query: {
            items: () => ({
              edges: [...new Array(5)].map((_, index) => ({ node: { index } })),
            }),
          },
        },
        resolvers: store => ({
          Query: {
            items: relayStylePaginationMock(store),
          },
        }),
      });
    });

    describe('forward pagination', () => {
      it('should work', async () => {
        const query = /* GraphQL */ `
          query PaginateItems($after: String) {
            items(first: 2, after: $after) {
              edges {
                node {
                  index
                }
              }
              pageInfo {
                endCursor
                hasNextPage
              }
              totalCount
            }
          }
        `;

        const page1 = await graphql({
          schema: mockedSchema,
          source: query,
        });

        expect(page1.errors).not.toBeDefined();
        expect(page1.data).toBeDefined();
        const page1Items = page1.data?.['items'] as any;
        expect(page1Items.totalCount).toEqual(5);
        expect(page1Items.pageInfo.hasNextPage).toBeTruthy();
        expect(page1Items.edges).toHaveLength(2);
        expect(page1Items.edges.map((e: any) => e.node.index)).toEqual([0, 1]);

        const page2 = await graphql({
          schema: mockedSchema,
          source: query,
          variableValues: {
            after: page1Items.pageInfo.endCursor,
          },
        });

        const page2Items = page2.data?.['items'] as any;
        expect(page2Items.edges.map((e: any) => e.node.index)).toEqual([2, 3]);

        const page3 = await graphql({
          schema: mockedSchema,
          source: query,
          variableValues: {
            after: page2Items.pageInfo.endCursor,
          },
        });

        const page3Items = page3.data?.['items'] as any;
        expect(page3Items.pageInfo.hasNextPage).toBeFalsy();
        expect(page3Items.edges.map((e: any) => e.node.index)).toEqual([4]);
      });
    });
    describe('backward pagination', () => {
      it('should work', async () => {
        const query = /* GraphQL */ `
          query PaginateItems($before: String) {
            items(last: 2, before: $before) {
              edges {
                cursor
                node {
                  index
                }
              }
              pageInfo {
                startCursor
                hasPreviousPage
              }
              totalCount
            }
          }
        `;

        const page1 = await graphql({
          schema: mockedSchema,
          source: query,
        });

        expect(page1.errors).not.toBeDefined();
        expect(page1.data).toBeDefined();
        const page1Items = page1.data?.['items'] as any;
        expect(page1Items.totalCount).toEqual(5);
        expect(page1Items.pageInfo.hasPreviousPage).toBeTruthy();
        expect(page1Items.edges).toHaveLength(2);
        expect(page1Items.edges.map((e: any) => e.node.index)).toEqual([3, 4]);

        const page2 = await graphql({
          schema: mockedSchema,
          source: query,
          variableValues: {
            before: page1Items.pageInfo.startCursor,
          },
        });

        const page2Items = page2.data?.['items'] as any;
        expect(page2Items.edges.map((e: any) => e.node.index)).toEqual([1, 2]);

        const page3 = await graphql({
          schema: mockedSchema,
          source: query,
          variableValues: {
            before: page2Items.pageInfo.startCursor,
          },
        });

        const page3Items = page3.data?.['items'] as any;
        expect(page3Items.pageInfo.hasPreviousPage).toBeFalsy();
        expect(page3Items.edges.map((e: any) => e.node.index)).toEqual([0]);
      });
    });
  });

  describe('with `applyOnNodes` option', () => {
    let mockedSchema: GraphQLSchema;
    beforeEach(() => {
      mockedSchema = addMocksToSchema({
        schema,
        mocks: {
          Query: {
            items: () => ({
              edges: [...new Array(5)].map((_, index) => ({ node: { index } })),
            }),
          },
        },
        resolvers: store => ({
          Query: {
            items: relayStylePaginationMock<unknown, RelayPaginationParams & { oddIndexOnly?: boolean | null }>(store, {
              applyOnNodes: (nodes, { oddIndexOnly }) => {
                if (oddIndexOnly) {
                  return nodes.filter(node => (store.get(node, 'index') as number) % 2 !== 0);
                }
                return nodes;
              },
            }),
          },
        }),
      });
    });

    it('should work', async () => {
      const query = /* GraphQL */ `
        query PaginateItems($after: String) {
          items(first: 2, after: $after, oddIndexOnly: true) {
            edges {
              cursor
              node {
                index
              }
            }
            pageInfo {
              startCursor
              hasPreviousPage
            }
            totalCount
          }
        }
      `;

      const page = await graphql({
        schema: mockedSchema,
        source: query,
      });
      expect(page.errors).not.toBeDefined();
      expect((page.data?.['items'] as any).totalCount).toEqual(2);
    });
  });
});
