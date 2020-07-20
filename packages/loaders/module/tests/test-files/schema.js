const { buildSchema } = require('graphql')

module.exports = buildSchema(`
  type Query {
    hello: String
  }
`)
