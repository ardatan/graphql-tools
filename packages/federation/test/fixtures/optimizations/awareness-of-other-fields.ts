import { buildSubgraphSchema } from '../../../src';

const users = [
  {
    id: '1',
    name: 'Alice',
    age: 21,
    bankAccount: '1000',
    currency: 'USD',
  },
  {
    id: '2',
    name: 'Bob',
    age: 32,
    bankAccount: '2000',
    currency: 'EUR',
  },
];

function projectData(data: any, fields: string[]) {
  return fields.reduce((acc, field) => {
    acc[field] = data[field];
    return acc;
  }, {});
}

export const Aschema = buildSubgraphSchema({
  typeDefs: /* GraphQL */ `
    type User @key(fields: "id") {
      id: ID
      name: String! @shareable
      age: Int!
    }
  `,
  resolvers: {
    User: {
      __resolveReference({ id }) {
        return projectData(
          users.find(user => user.id === id),
          ['id', 'name', 'age'],
        );
      },
    },
  },
});

export const Bschema = buildSubgraphSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      user(id: ID!): User
    }

    type User @key(fields: "id") {
      id: ID!
    }
  `,
  resolvers: {
    Query: {
      user(_, { id }) {
        return { id };
      },
    },
    User: {
      __resolveReference({ id }) {
        return { id };
      },
    },
  },
});

export const Cschema = buildSubgraphSchema({
  typeDefs: /* GraphQL */ `
    type User @key(fields: "id") {
      id: ID
      name: String! @external
      nickname: String! @requires(fields: "name")
    }
  `,
  resolvers: {
    User: {
      __resolveReference({ id, name }) {
        return { id, name };
      },
      nickname(user) {
        if (!user.name) throw new Error('Name is required');
        return user.name.substring(0, 3);
      },
    },
  },
});

export const Dschema = buildSubgraphSchema({
  typeDefs: /* GraphQL */ `
    type User @key(fields: "id") {
      id: ID
      bankAccount: String! @external
      currency: String! @external
      money: String! @requires(fields: "bankAccount currency")
    }
  `,
  resolvers: {
    User: {
      __resolveReference({ id, bankAccount, currency }) {
        return { id, bankAccount, currency };
      },
      money(user) {
        if (!user.bankAccount || !user.currency)
          throw new Error('Bank account and currency are required');
        return `${user.bankAccount} ${user.currency}`;
      },
    },
  },
});

export const Eschema = buildSubgraphSchema({
  typeDefs: /* GraphQL */ `
    type User @key(fields: "id") {
      id: ID
      bankAccount: String!
      currency: String!
      name: String @shareable
    }
  `,
  resolvers: {
    User: {
      __resolveReference({ id }) {
        return projectData(
          users.find(user => user.id === id),
          ['id', 'name', 'bankAccount', 'currency'],
        );
      },
    },
  },
});
