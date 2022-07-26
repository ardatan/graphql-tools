const { buildSchema } = require('@graphql-tools/graphql');

module.exports = buildSchema(`
  type Query {
    hello: String
  }
`);
