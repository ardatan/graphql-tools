const { parse, buildSchema } = require('graphql');

module.exports = function (_, { customLoaderContext: { loaderType }, fooFieldName }) {
  if (loaderType === 'documents') {
    return parse(/* GraphQL */ `
      query TestQuery {
        ${fooFieldName}
      }
    `);
  } else if (loaderType === 'schema') {
    return buildSchema(/* GraphQL */ `
      type Query {
        ${fooFieldName}: String
      }
    `);
  }
  return 'I like turtles';
};
