import { GraphQLFieldResolver } from 'graphql';

import { mergeDeep } from '../utils/mergeDeep';

import { IExecutableSchemaDefinition } from '../Interfaces';
import { SchemaDirectiveVisitor } from '../utils/index';
import { addResolversToSchema } from './addResolversToSchema';

import { attachDirectiveResolvers } from './attachDirectiveResolvers';
import { assertResolversPresent } from './assertResolversPresent';
import { addSchemaLevelResolver } from './addSchemaLevelResolver';
import { buildSchemaFromTypeDefinitions } from './buildSchemaFromTypeDefinitions';
import { addErrorLoggingToSchema } from './addErrorLoggingToSchema';
import { addCatchUndefinedToSchema } from './addCatchUndefinedToSchema';

export function makeExecutableSchema<TContext = any>({
  typeDefs,
  resolvers = {},
  logger,
  allowUndefinedInResolve = true,
  resolverValidationOptions = {},
  directiveResolvers,
  schemaDirectives,
  parseOptions = {},
  inheritResolversFromInterfaces = false,
}: IExecutableSchemaDefinition<TContext>) {
  // Validate and clean up arguments
  if (typeof resolverValidationOptions !== 'object') {
    throw new Error('Expected `resolverValidationOptions` to be an object');
  }

  if (!typeDefs) {
    throw new Error('Must provide typeDefs');
  }

  // We allow passing in an array of resolver maps, in which case we merge them
  const resolverMap: any = Array.isArray(resolvers)
    ? resolvers.filter(resolverObj => typeof resolverObj === 'object').reduce(mergeDeep, {})
    : resolvers;

  // Arguments are now validated and cleaned up

  const schema = buildSchemaFromTypeDefinitions(typeDefs, parseOptions);

  addResolversToSchema({
    schema,
    resolvers: resolverMap,
    resolverValidationOptions,
    inheritResolversFromInterfaces,
  });

  assertResolversPresent(schema, resolverValidationOptions);

  if (!allowUndefinedInResolve) {
    addCatchUndefinedToSchema(schema);
  }

  if (logger != null) {
    addErrorLoggingToSchema(schema, logger);
  }

  if (typeof resolvers['__schema'] === 'function') {
    // TODO a bit of a hack now, better rewrite generateSchema to attach it there.
    // not doing that now, because I'd have to rewrite a lot of tests.
    addSchemaLevelResolver(schema, resolvers['__schema'] as GraphQLFieldResolver<any, any>);
  }

  if (directiveResolvers != null) {
    attachDirectiveResolvers(schema, directiveResolvers);
  }

  if (schemaDirectives != null) {
    SchemaDirectiveVisitor.visitSchemaDirectives(schema, schemaDirectives);
  }

  return schema;
}
