const { parse } = require('graphql');

module.exports = parse(/* GraphQL */ `
  type Query {
    hello: String
  }
`);
