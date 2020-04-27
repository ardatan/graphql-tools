const { makeExecutableSchema } = require('@graphql-tools/schema-stitching');
const { doc } = require('./type-defs');

const schema = makeExecutableSchema({
  typeDefs: [doc, `
    schema {
      query: Query
    }
  `],
});

exports.schema = schema;
