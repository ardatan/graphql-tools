import { IResolvers } from '@graphql-tools/utils';

export const typeDefs = /* GraphQL */ `
  type Query @extends {
    me: User
    users: [User]
  }

  type User @key(fields: "id") {
    id: ID!
    name: String
    birthDate: String
    username: String
  }
`;

export const resolvers: IResolvers = {
  Query: {
    me() {
      return users[0];
    },
    users() {
      return users;
    },
  },
  User: {
    __resolveReference(object) {
      return users.find(user => user.id === object.id);
    },
  },
};

const users = [
  {
    id: '1',
    name: 'Ada Lovelace',
    birthDate: '1815-12-10',
    username: '@ada',
  },
  {
    id: '2',
    name: 'Alan Turing',
    birthDate: '1912-06-23',
    username: '@complete',
  },
];
