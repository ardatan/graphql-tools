import { readFileSync } from 'fs';
import { join } from 'path';
import { IResolvers } from '@graphql-tools/utils';

export const typeDefs = readFileSync(join(__dirname, './discount.graphql'), 'utf8');

export const resolvers: IResolvers = {
  Product: {
    __resolveReference(object) {
      return {
        ...object,
        discounts,
      };
    },
  },
  Category: {
    __resolveReference(object) {
      return {
        ...object,
        discounts,
      };
    },
  },
  Discount: {
    __resolveReference(object) {
      return {
        ...object,
        ...discounts.find(discount => discount.id === object.id),
      };
    },
  },
  Query: {
    discounts(_, args) {
      return discounts.slice(0, args.first);
    },
  },
};
const discounts = [
  { id: '1', discount: 10 },
  { id: '2', discount: 20 },
  { id: '3', discount: 30 },
];
