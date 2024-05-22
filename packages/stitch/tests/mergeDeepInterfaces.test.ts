import { graphql } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { assertSome, ExecutionResult, IResolvers } from '@graphql-tools/utils';
import { stitchSchemas } from '../src/stitchSchemas.js';

const localSchemaGQL = /* GraphQL */ `
  interface TransactionDecorator {
    id: ID!
    decorationKey: String!
    decorationType: DecorationType!
  }

  interface Transaction {
    id: ID!
    demoTypes: [DemoType]!
    decorators: [TransactionDecorator]!
  }

  enum DecorationType {
    CategoryDecorator
    Document
  }

  type CardTransaction implements Transaction {
    id: ID!
    decorators: [TransactionDecorator]!
    demoTypes: [DemoType]!
  }
  type SEPACreditTransferTransaction implements Transaction {
    id: ID!
    demoTypes: [DemoType]!
    decorators: [TransactionDecorator]!
  }

  type CategoryDecorator implements TransactionDecorator {
    id: ID!
    decorationKey: String!
    decorationType: DecorationType!
  }

  type DocumentDecorator implements TransactionDecorator {
    id: ID!
    decorationKey: String!
    decorationType: DecorationType!
  }

  type DemoType {
    id: ID!
    name: String
  }

  type Review {
    id: ID!
    body: String!
    # product: Product
    user: User
    transaction: Transaction
  }

  type User {
    id: ID!
    reviews: [Review]!
  }

  type Query {
    reviews(ids: [ID!]!): [Review]!
    _users(ids: [ID!]!): [User]!
    _transactions(ids: [ID!]!): [Transaction]!
    _decoratedTransaction(ids: [ID!]!): [Transaction]!
    demoTypesByIds(ids: [ID!]!): [DemoType]!
    categoryDecoratorsByIds(ids: [ID!]!): [CategoryDecorator]!
    documentDecoratorsByIds(ids: [ID!]!): [DocumentDecorator]!
    transactionDecoratorsById(id: ID!): TransactionDecorator
    transactionDecoratorsByIds(ids: [ID!]!): [TransactionDecorator]!
    _decorators(ids: [ID!]!): [TransactionDecorator]!
  }
`;
const decorators = [
  {
    id: '1',
    txId: 'tx1',
    decorationKey: 'dtx1',
    decorationType: 'CategoryDecorator',
    __typename: 'CategoryDecorator',
  },
  {
    id: '2',
    txId: 'tx2',
    decorationKey: 'dtx2',
    decorationType: 'CategoryDecorator',
    __typename: 'CategoryDecorator',
  },
  {
    id: '3',
    txId: 'tx3',
    decorationKey: 'dtx3',
    decorationType: 'DocumentDecorator',
    __typename: 'DocumentDecorator',
  },
  {
    id: '4',
    txId: 'tx1',
    decorationKey: 'dtx4',
    decorationType: 'DocumentDecorator',
    __typename: 'DocumentDecorator',
  },
];

const reviews = [{ id: 'tx1', productUpc: '1', userId: '1', body: 'love it' }];

const localResolvers: IResolvers = {
  Transaction: {
    decorators: ({ id }: { id: string }) => {
      console.log('Transaction decorators');
      return decorators.filter(d => d.txId === id);
    },
  },
  Review: {
    user: review => ({ id: review.userId }),
  },
  User: {
    reviews: user => reviews.filter(r => r.userId === user.id),
  },
  Query: {
    reviews: (_, { ids }: { ids: string[] }) => {
      const result = ids.map(id => reviews.find(r => r.id === id) || null);
      console.log('result', result);
      return result;
    },
    _users: (_, { ids }: { ids: string[] }) => ids.map(id => ({ id })),
    _transactions: (_, { ids }: { ids: string[] }) =>
      ids.map(id => allTransactions.find(t => t.id === id) || null),
    _decoratedTransaction: (root, { ids }: { ids: string[] }) => {
      console.log('root', root);
      console.log('ids', ids);
      return root;
    },
    _decorators: (_, { ids }: { ids: string[] }, __, info) => {
      const deco = ids.map(id => decorators.find(d => d.txId === id));
      console.log('deco result', info, ids, deco);
      return deco;
    },
    transactionDecoratorsById: (_, { id }) => {
      const decoResult = decorators.find(m => m.txId === id) || null;
      console.log('single', id, decoResult);
      return decoResult;
    },
    transactionDecoratorsByIds: (_, { ids }: { ids: string[] }) => {
      const decoResult = ids.map(id => decorators.find(m => m.txId === id) || null);
      console.log('transactionDecoratorsByIds', ids, decoResult);
      return decoResult;
    },
    categoryDecoratorsByIds: (_root, { ids }: { ids: string[] }) => {
      console.log('ex');
      return ids.map(
        id =>
          decorators.find(m => m.txId === id && m.decorationType === 'CategoryDecorator') || null,
      );
    },
    documentDecoratorsByIds: (_root, { ids }: { ids: string[] }) => {
      console.log('ex');
      return ids.map(
        id =>
          decorators.find(m => m.txId === id && m.decorationType === 'DocumentDecorator') || null,
      );
    },
  },
};

const tx1 = {
  id: 'tx1',
  accountId: 'Luca',
  reference: 'transaction 1',
  __typename: 'SEPACreditTransferTransaction',
};

const tx2 = {
  id: 'tx2',
  accountId: 'Luca',
  reference: 'transaction 2',
  __typename: 'CardTransaction',
};

const tx3 = {
  id: 'tx3',
  accountId: 'Rafaela',
  reference: 'transaction 3',
  __typename: 'SEPACreditTransferTransaction',
};

const tx4 = {
  id: 'tx4',
  accountId: 'Rafaela',
  reference: 'transaction 4',
  __typename: 'CardTransaction',
};

const allTransactions = [tx1, tx2, tx3, tx4];

const edges = [
  { node: tx1, cursor: 'tx1' },
  { node: tx2, cursor: 'tx2' },
];

const transactions = [
  {
    totalCount: 2,
    edges: edges,
  },
];

const lucaAccount = {
  id: 'Luca',
  name: 'luca',
  transactions,
};

const rafaelaAccount = {
  id: 'Rafaela',
  name: 'rafa',
  transactions,
};

const accounts = [lucaAccount, rafaelaAccount];

const users = [
  { id: '1', username: 'hanshotfirst' },
  { id: '2', username: 'bigvader23' },
];

const findAccountById = (id: string) => accounts.find(account => account.id === id);
const transactionsByAccount = (id: string) => allTransactions.filter(tx => tx.accountId === id);
const findTransactionById = (id: string) => allTransactions.find(tx => tx.id === id);

const remoteResolvers: IResolvers = {
  Account: {
    transactions: root => {
      return root.transactions;
    },
  },
  Query: {
    users: (_root, { ids }: { ids: string[] }) => {
      console.log('query remote users', ids);
      const result = ids.map(id => users.find(u => u.id === id) || null);
      console.log('result', result);
      return result;
    },
    account: (_root, { id }) => {
      const transactions = transactionsByAccount(id);
      const final = {
        ...findAccountById(id),
        transactions: {
          totalCount: transactions.length,
          edges: transactions.map(tx => {
            return { node: tx, cursor: tx.id };
          }),
        },
      };
      return final;
    },
    transaction: (_root, { id }) => {
      return findTransactionById(id);
    },
    transactions: (_root, { ids }: { ids: string[] }) => {
      const result = {
        totalCount: allTransactions.length,
        edges: ids
          .map(id => allTransactions.find(t => t.id === id))
          .map(tx => ({ node: tx, cursor: tx?.id })),
      };
      return result;
    },
  },
};

const remoteSchemaGQL = /* GraphQL */ `
  type Account {
    id: ID!
    name: String!
    transactions(first: Int! = 2, after: String): TransactionConnection
  }

  interface TransactionDecorator {
    id: ID!
  }

  interface Transaction {
    id: ID!
    reference: String!
    accountId: String!
  }

  type TransactionConnection implements Connection {
    totalCount: Int!
    edges: [TransactionEdge]!
  }

  type TransactionEdge implements Edge {
    node: Transaction!
    cursor: String!
  }
  type CardTransaction implements Transaction {
    id: ID!
    accountId: String!
    reference: String!
  }
  type SEPACreditTransferTransaction implements Transaction {
    id: ID!
    accountId: String!
    reference: String!
  }

  interface Edge {
    cursor: String!
  }

  interface Connection {
    totalCount: Int!
    edges: [Edge]!
  }

  type User {
    id: ID!
    username: String!
  }

  type Query {
    users(ids: [ID!]!): [User]!
    account(id: ID!): Account
    transaction(id: ID!): Transaction!
    transactions(ids: [ID!]!, first: Int! = 2, after: String): TransactionConnection!
  }
`;

const localSchema = makeExecutableSchema({
  typeDefs: localSchemaGQL,
  resolvers: localResolvers,
  inheritResolversFromInterfaces: true,
});
const remoteSchema = makeExecutableSchema({
  typeDefs: remoteSchemaGQL,
  resolvers: remoteResolvers,
});

describe('merged deep interfaces', () => {
  const stitchedSchema = stitchSchemas({
    subschemas: [
      {
        schema: localSchema,
        batch: true,
        merge: {
          SEPACreditTransferTransaction: {
            selectionSet: '{ id }',
            fieldName: '_transactions',
            key: ({ id }) => {
              console.log('x id', id);
              return id;
            },
            argsFromKeys: ids => {
              console.log('x', ids);
              return { ids };
            },
          },
          CardTransaction: {
            selectionSet: '{ id }',
            fieldName: '_transactions',
            key: ({ id }) => {
              console.log('x id', id);
              return id;
            },
            argsFromKeys: ids => {
              console.log('x', ids);
              return { ids };
            },
          },
          User: {
            selectionSet: '{ id }',
            fieldName: '_users',
            key: ({ id }) => id,
            argsFromKeys: ids => ({ ids }),
          },
        },
      },
      {
        schema: remoteSchema,
      },
    ],
  });

  test('should resolve the list of types of the interface', async () => {
    const result: ExecutionResult<any> = await graphql({
      schema: stitchedSchema,
      source: /* GraphQL */ `
        query {
          transactions(ids: ["tx1", "tx2", "tx3"]) {
            edges {
              node {
                __typename
                id
                ... on CardTransaction {
                  id
                  accountId
                  decorators {
                    __typename
                    id
                  }
                }
                ... on SEPACreditTransferTransaction {
                  id
                  accountId
                  decorators {
                    __typename
                    id
                  }
                }
              }
            }
          }
        }
      `,
    });
    console.log('result', JSON.stringify(result, null, 2));
    assertSome(result.data);
    expect(result.data.transactions.edges).toEqual([
      {
        node: {
          __typename: 'SEPACreditTransferTransaction',
          id: 'tx1',
          accountId: 'Luca',
          decorators: [
            {
              __typename: 'CategoryDecorator',
              id: '1',
            },
            {
              __typename: 'DocumentDecorator',
              id: '4',
            },
          ],
        },
      },
      {
        node: {
          __typename: 'CardTransaction',
          id: 'tx2',
          accountId: 'Luca',
          decorators: [
            {
              __typename: 'CategoryDecorator',
              id: '2',
            },
          ],
        },
      },
      {
        node: {
          __typename: 'SEPACreditTransferTransaction',
          id: 'tx3',
          accountId: 'Rafaela',
          decorators: [
            {
              __typename: 'DocumentDecorator',
              id: '3',
            },
          ],
        },
      },
    ]);
  });
});
