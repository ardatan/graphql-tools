const { parse } = require('@graphql-tools/graphql');

module.exports = parse(/* GraphQL */ `
  type Query {
    hello: String
  }
`);
