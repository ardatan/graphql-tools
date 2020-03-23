import { GraphQLSchema, GraphQLFieldResolver } from 'graphql';

import {
  IAddResolversToSchemaOptions,
  IResolvers,
  IResolverValidationOptions,
} from '../Interfaces';

import addResolversToSchema from './addResolversToSchema';
import addSchemaLevelResolver from './addSchemaLevelResolver';
import assertResolversPresent from './assertResolversPresent';

export { addResolversToSchema, addSchemaLevelResolver, assertResolversPresent };
export { default as attachDirectiveResolvers } from './attachDirectiveResolvers';
export { default as attachConnectorsToContext } from './attachConnectorsToContext';
export { default as buildSchemaFromTypeDefinitions } from './buildSchemaFromTypeDefinitions';
export { chainResolvers } from './chainResolvers';
export { default as checkForResolveTypeResolver } from './checkForResolveTypeResolver';
export { default as concatenateTypeDefs } from './concatenateTypeDefs';
export { default as decorateWithLogger } from './decorateWithLogger';
export { default as extendResolversFromInterfaces } from './extendResolversFromInterfaces';
export {
  extractExtensionDefinitions,
  filterExtensionDefinitions,
} from './extensionDefinitions';
export { default as SchemaError } from './SchemaError';
export * from './makeExecutableSchema';

// These functions are preserved for backwards compatibility.
// They are not simply rexported with new (old) names so as to allow
// typedoc to annotate them.
export function addResolveFunctionsToSchema(
  schemaOrOptions: GraphQLSchema | IAddResolversToSchemaOptions,
  legacyInputResolvers?: IResolvers,
  legacyInputValidationOptions?: IResolverValidationOptions,
): GraphQLSchema {
  return addResolversToSchema(
    schemaOrOptions,
    legacyInputResolvers,
    legacyInputValidationOptions,
  );
}

export function addSchemaLevelResolveFunction(
  schema: GraphQLSchema,
  fn: GraphQLFieldResolver<any, any>,
): void {
  addSchemaLevelResolver(schema, fn);
}

export function assertResolveFunctionsPresent(
  schema: GraphQLSchema,
  resolverValidationOptions: IResolverValidationOptions = {},
): void {
  assertResolversPresent(schema, resolverValidationOptions);
}
