const { parse } = require('graphql')

module.exports = {
  typeDefs: parse(`
    type Query {
      hello: String
    }
  `),
  favoriteNumber: 42,
}
