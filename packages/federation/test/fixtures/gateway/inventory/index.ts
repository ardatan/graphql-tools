import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inspect } from 'cross-inspect';
import { IResolvers } from '@graphql-tools/utils';

export const typeDefs = readFileSync(join(__dirname, './inventory.graphql'), 'utf8');

export const resolvers: IResolvers = {
  Product: {
    __resolveReference(object) {
      return {
        ...object,
        ...inventory.find(product => product.upc === object.upc),
      };
    },
    shippingEstimate(object) {
      if (object.price == null || object.weight == null) {
        throw new Error(`${inspect(object)} doesn't have required fields; "price" and "weight".`);
      }
      // free for expensive items
      if (object.price > 1000) return 0;
      // estimate is based on weight
      return object.weight * 0.5;
    },
  },
};

const inventory = [
  { upc: '1', inStock: true },
  { upc: '2', inStock: false },
  { upc: '3', inStock: true },
];
