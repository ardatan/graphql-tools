import { readFileSync } from 'fs';
import { join } from 'path';
import { IResolvers } from '@graphql-tools/utils';

export const typeDefs = readFileSync(join(__dirname, './accounts.graphql'), 'utf8');

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
