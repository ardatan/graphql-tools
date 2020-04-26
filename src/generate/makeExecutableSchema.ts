import {
  defaultFieldResolver,
  GraphQLSchema,
  GraphQLFieldResolver,
} from 'graphql';

import { mergeDeep } from '../utils/mergeDeep';

import { IExecutableSchemaDefinition, ILogger } from '../Interfaces';
import { SchemaDirectiveVisitor, forEachField } from '../utils/index';
import { addResolversToSchema } from '../addResolvers/addResolversToSchema';

import { attachDirectiveResolvers } from './attachDirectiveResolvers';
import { assertResolversPresent } from './assertResolversPresent';
import { addSchemaLevelResolver } from './addSchemaLevelResolver';
import { buildSchemaFromTypeDefinitions } from './buildSchemaFromTypeDefinitions';
import { decorateWithLogger } from './decorateWithLogger';

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
    ? resolvers
        .filter((resolverObj) => typeof resolverObj === 'object')
        .reduce(mergeDeep, {})
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
    addSchemaLevelResolver(
      schema,
      resolvers['__schema'] as GraphQLFieldResolver<any, any>,
    );
  }

  if (directiveResolvers != null) {
    attachDirectiveResolvers(schema, directiveResolvers);
  }

  if (schemaDirectives != null) {
    SchemaDirectiveVisitor.visitSchemaDirectives(schema, schemaDirectives);
  }

  return schema;
}

function decorateToCatchUndefined(
  fn: GraphQLFieldResolver<any, any>,
  hint: string,
): GraphQLFieldResolver<any, any> {
  const resolve = fn == null ? defaultFieldResolver : fn;
  return (root, args, ctx, info) => {
    const result = resolve(root, args, ctx, info);
    if (typeof result === 'undefined') {
      throw new Error(`Resolver for "${hint}" returned undefined`);
    }
    return result;
  };
}

export function addCatchUndefinedToSchema(schema: GraphQLSchema): void {
  forEachField(schema, (field, typeName, fieldName) => {
    const errorHint = `${typeName}.${fieldName}`;
    field.resolve = decorateToCatchUndefined(field.resolve, errorHint);
  });
}

export function addErrorLoggingToSchema(
  schema: GraphQLSchema,
  logger?: ILogger,
): void {
  if (!logger) {
    throw new Error('Must provide a logger');
  }
  if (typeof logger.log !== 'function') {
    throw new Error('Logger.log must be a function');
  }
  forEachField(schema, (field, typeName, fieldName) => {
    const errorHint = `${typeName}.${fieldName}`;
    field.resolve = decorateWithLogger(field.resolve, logger, errorHint);
  });
}
