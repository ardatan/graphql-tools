import { readFileSync } from 'fs';
import { join } from 'path';
import { IResolvers } from '@graphql-tools/utils';

export const typeDefs = readFileSync(join(__dirname, './reviews.graphql'), 'utf8');

export const resolvers: IResolvers = {
  Review: {
    __resolveReference(object) {
      return reviews.find(review => review.id === object.id);
    },
    author(review) {
      return { __typename: 'User', id: review.authorID };
    },
  },
  User: {
    reviews(user) {
      return reviews.filter(review => review.authorID === user.id);
    },
    numberOfReviews(user) {
      return reviews.filter(review => review.authorID === user.id).length;
    },
    username(user) {
      const found = usernames.find(username => username.id === user.id);
      return found ? found.username : null;
    },
  },
  Product: {
    reviews(product) {
      return reviews.filter(review => review.product.upc === product.upc);
    },
  },
};

const usernames = [
  { id: '1', username: '@ada' },
  { id: '2', username: '@complete' },
];
const reviews = [
  {
    id: '1',
    authorID: '1',
    product: { upc: '1' },
    body: 'Love it!',
  },
  {
    id: '2',
    authorID: '1',
    product: { upc: '2' },
    body: 'Too expensive.',
  },
  {
    id: '3',
    authorID: '2',
    product: { upc: '3' },
    body: 'Could be better.',
  },
  {
    id: '4',
    authorID: '2',
    product: { upc: '1' },
    body: 'Prefer something else.',
  },
];
