import { readFileSync } from 'fs';
import { join } from 'path';
import { IResolvers } from '@graphql-tools/utils';

export const typeDefs = readFileSync(join(__dirname, './products.graphql'), 'utf8');

const listSize = parseInt(process.env['PRODUCTS_SIZE'] || '3');

const categories = [
  {
    id: 'c_1',
    name: 'Furniture',
  },
  {
    id: 'c_2',
    name: 'Kitchen',
  },
];

const definedProducts = [
  {
    upc: '1',
    name: 'Table',
    price: 899,
    weight: 100,
    categories: [categories[0]],
  },
  {
    upc: '2',
    name: 'Couch',
    price: 1299,
    weight: 1000,
    categories: [categories[0]],
  },
  {
    upc: '3',
    name: 'Chair',
    price: 54,
    weight: 50,
    categories: [categories[0]],
  },
  {
    upc: '4',
    name: 'Knife',
    price: 54,
    weight: 50,
    categories: [categories[1]],
  },
  {
    id: 'p_5',
    name: 'Spoon',
    price: 54,
    weight: 50,
    categories: [categories[1]],
  },
];
const products = [...Array(listSize)].map((_, index) => definedProducts[index % 3]);

export const resolvers: IResolvers = {
  Product: {
    __resolveReference(object) {
      return products.find(product => product.upc === object.upc);
    },
  },
  Category: {
    __resolveReference(object) {
      return {
        ...object,
        ...categories.find(category => category.id === object.id),
      };
    },
  },
  Query: {
    topProducts(_, args) {
      return args.first ? products.slice(0, args.first) : products;
    },
  },
};
