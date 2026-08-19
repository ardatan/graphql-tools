import { buildSchema, parse } from 'graphql';

export default function (_, { customLoaderContext: { loaderType }, fooFieldName }) {
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
}
