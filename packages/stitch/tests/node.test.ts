import { parse } from 'graphql';
import { normalizedExecutor } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '../src/stitchSchemas';

describe('Node', () => {
  interface Node {
    __typename: string;
    id: string;
    [key: string]: any;
  }
  const nodes: Node[] = [
    {
      __typename: 'User',
      id: '1',
      name: 'Alice',
    },
    {
      __typename: 'User',
      id: '2',
      name: 'Bob',
    },
    {
      __typename: 'Post',
      id: '3',
      title: 'Hello, World!',
    },
  ];
  const nodeSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        node(id: ID!): Node
      }

      interface Node {
        id: ID!
      }

      type User implements Node {
        id: ID!
      }

      type Post implements Node {
        id: ID!
      }
    `,
    resolvers: {
      Query: {
        node: (_, { id }) => nodes.find(node => node.id.toString() === id.toString()),
      },
      Node: {
        __resolveType: () => 'User',
      },
    },
  });
  const userSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      scalar _Any
      type Query {
        _entities(representations: [_Any!]!): [_Entity]!
      }
      union _Entity = User
      interface Node {
        id: ID!
      }
      type User implements Node {
        id: ID!
        name: String!
      }
    `,
    resolvers: {
      Query: {
        _entities: (_, { representations }) =>
          representations.map(({ __typename, id }: Node) =>
            nodes.find(
              node => node.__typename === __typename && node.id.toString() === id.toString(),
            ),
          ),
      },
      User: {
        __isTypeOf: (obj: Node) => obj.__typename === 'User',
      },
    },
  });
  const postSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      scalar _Any
      union _Entity = Post
      type Query {
        _entities(representations: [_Any!]!): [_Entity]!
      }
      interface Node {
        id: ID!
      }
      type Post implements Node {
        id: ID!
        title: String!
      }
    `,
    resolvers: {
      Query: {
        _entities: (_, { representations }) =>
          representations.map(({ __typename, id }: Node) =>
            nodes.find(
              node => node.__typename === __typename && node.id.toString() === id.toString(),
            ),
          ),
      },
      Post: {
        __isTypeOf: (obj: Node) => obj.__typename === 'Post',
      },
    },
  });
  const gatewaySchema = stitchSchemas({
    subschemas: [
      { name: 'Node', schema: nodeSchema },
      {
        name: 'User',
        schema: userSchema,
        merge: {
          User: {
            selectionSet: '{ id }',
            fieldName: '_entities',
            key: root => root,
            argsFromKeys: representations => ({ representations }),
          },
        },
      },
      {
        name: 'Post',
        schema: postSchema,
        merge: {
          Post: {
            selectionSet: '{ id }',
            fieldName: '_entities',
            key: root => root,
            argsFromKeys: representations => ({ representations }),
          },
        },
      },
    ],
  });
  it('should work', async () => {
    const result = await normalizedExecutor({
      schema: gatewaySchema,
      document: parse(/* GraphQL */ `
        query {
          node(id: "1") {
            id
            ... on User {
              name
            }
          }
        }
      `),
    });
    expect(result).toEqual({
      data: {
        node: {
          id: '1',
          name: 'Alice',
        },
      },
    });
  });
});
