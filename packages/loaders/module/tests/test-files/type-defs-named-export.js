const { parse } = require('graphql');

module.exports = {
  typeDefs: parse(/* GraphQL */ `
    type Query {
      hello: String
    }
  `),
  favoriteNumber: 42,
};
