import { IResolvers } from '@graphql-tools/utils';

export const typeDefs = /* GraphQL */ `
  type Query @extends {
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

export const resolvers: IResolvers = {
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
