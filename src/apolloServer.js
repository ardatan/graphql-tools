import { makeExecutableSchema } from './schemaGenerator';
import { mockServer } from './mock';
import graphQLHTTP from 'express-graphql';
import { GraphQLSchema } from 'graphql';


export default function apolloServer({
  schema, // required
  resolvers, // required if mocks is not false and schema is not GraphQLSchema
  connectors, // required if mocks is not false and schema is not GraphQLSchema
  logger,
  mocks = false,
  allowUndefinedInResolve = false,
  formatError, // pass through
  graphiql = true, // pass through
  validationRules, // pass through
  context, // pass through
  rootValue, // pass through
}) {
  // TODO: throw an error if more than one arg is passed
  // TODO: throw an error if that argument is not an object
  if (!schema) {
    throw new Error('schema is required');
  }
  if (!logger) {
    // eslint-disable-next-line no-param-reassign
    logger = { log: (x) => console.log(x) };
  }
  if (!context) {
    // eslint-disable-next-line no-param-reassign
    context = {};
  }
  let executableSchema;
  if (mocks) {
    const myMocks = mocks || {};
    executableSchema = mockServer(schema, myMocks);
  } else {
    // this is just basics, makeExecutableSchema should catch the rest
    // TODO: should be able to provide a GraphQLschema and still use resolvers
    // and connectors if you want, but at the moment this is not possible.
    if (schema instanceof GraphQLSchema) {
      executableSchema = makeExecutableSchema({
        schema,
        resolvers: {},
        connectors: {},
        logger,
        allowUndefinedInResolve,
      });
    } else {
      if (!resolvers) {
        throw new Error('resolvers is required option if mocks is not provided');
      }
      if (!connectors) {
        throw new Error('connectors is a required option if mocks is not provided');
      }
      executableSchema = makeExecutableSchema({
        typeDefs: schema,
        resolvers,
        connectors,
        logger,
        allowUndefinedInResolve,
      });
    }
  }

  return (req, res, next) => {
    return graphQLHTTP({
      schema: executableSchema,
      context,
      formatError,
      rootValue,
      validationRules,
      graphiql,
    })(req, res, next);
  };
}

export { apolloServer };
