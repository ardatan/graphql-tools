const { gql } = require('graphql-tag');
const { makeExecutableSchema } = require('@graphql-tools/schema');

const typeDefs = gql`
  type Query {
    me: User
    users: [User]
    topProducts(first: Int): [Product]
  }
  type User {
    id: ID!
    name: String
    username: String
    reviews: [Review]
  }
  type Product {
    upc: String!
    weight: Int
    price: Int
    name: String
    inStock: Boolean
    shippingEstimate: Int
    reviews: [Review]
  }
  type Review {
    id: ID!
    body: String
    author: User
    product: Product
  }
`;

const resolvers = {
  Query: {
    me() {
      return users[0];
    },
    users() {
      return users;
    },
    topProducts(_, args) {
      return args.first ? products.slice(0, args.first) : products;
    },
  },
  User: {
    reviews(user) {
      return reviews.filter(review => review.authorID === user.id);
    },
    username(user) {
      const found = usernames.find(username => username.id === user.id);
      return found ? found.username : null;
    },
  },
  Product: {
    shippingEstimate(object) {
      // free for expensive items
      if (object.price > 1000) return 0;
      // estimate is based on weight
      return object.weight * 0.5;
    },
    reviews(product) {
      return reviews.filter(review => review.productUpc === product.upc);
    },
    inStock(product) {
      return inventory.find(inv => inv.upc === product.upc)?.inStock;
    },
  },
  Review: {
    author(review) {
      return users.find(user => user.id === review.authorID);
    },
    product(review) {
      return products.find(product => review.productUpc === product.upc);
    },
  },
};

module.exports = () =>
  makeExecutableSchema({
    typeDefs,
    resolvers,
  });

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

const inventory = [
  { upc: '1', inStock: true },
  { upc: '2', inStock: false },
  { upc: '3', inStock: true },
];

const listSize = parseInt(process.env.PRODUCTS_SIZE || '3');

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
const products = Array(listSize)
  .fill({})
  .map((_, index) => definedProducts[index % 3]);

const usernames = [
  { id: '1', username: '@ada' },
  { id: '2', username: '@complete' },
];

const reviews = [
  {
    id: '1',
    authorID: '1',
    productUpc: '1',
    body: 'Love it!',
  },
  {
    id: '2',
    authorID: '1',
    productUpc: '2',
    body: 'Too expensive.',
  },
  {
    id: '3',
    authorID: '2',
    productUpc: '3',
    body: 'Could be better.',
  },
  {
    id: '4',
    authorID: '2',
    productUpc: '1',
    body: 'Prefer something else.',
  },
];
