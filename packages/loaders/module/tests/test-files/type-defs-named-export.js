const { parse } = require('@graphql-tools/graphql');

module.exports = {
  typeDefs: parse(/* GraphQL */ `
    type Query {
      hello: String
    }
  `),
  favoriteNumber: 42,
};
