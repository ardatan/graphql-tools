const { parse } = require('graphql')

module.exports = parse(`
  type Query {
    hello: String
  }
`)
