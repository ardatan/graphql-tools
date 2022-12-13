import { IResolvers } from '@graphql-tools/utils';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';

export const typeDefs = /* GraphQL */ `
  extend type Query {
    topProducts(first: Int): [Product]
  }

  type Product @key(fields: "upc") {
    upc: String!
    name: String
    price: Int
    weight: Int
  }
`;

const listSize = parseInt(process.env['PRODUCTS_SIZE'] || '3');

const definedProducts = [
  {
    upc: '1',
    name: 'Table',
    price: 899,
    weight: 100,
  },
  {
    upc: '2',
    name: 'Couch',
    price: 1299,
    weight: 1000,
  },
  {
    upc: '3',
    name: 'Chair',
    price: 54,
    weight: 50,
  },
];
const products = [...Array(listSize)].map((_, index) => definedProducts[index % 3]);

const resolvers: IResolvers = {
  Product: {
    __resolveReference(object) {
      return products.find(product => product.upc === object.upc);
    },
  },
  Query: {
    topProducts(_, args) {
      return args.first ? products.slice(0, args.first) : products;
    },
  },
};

export const schema = buildSubgraphSchema([
  {
    typeDefs: parse(typeDefs),
    resolvers: resolvers as any,
  },
]);
