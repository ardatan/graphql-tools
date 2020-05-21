const { makeExecutableSchema } = require('@graphql-tools/schema');
const { doc } = require('./type-defs');

const schema = makeExecutableSchema({
  typeDefs: [doc],
});

exports.schema = schema;
