const { makeExecutableSchema } = require('@graphql-tools/schema-stitching');

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type User {
      a: String
    }

    type Query {
      user: User
    }

    extend type Query {
      hello: String
    }
  `,
});

module.exports = schema;
