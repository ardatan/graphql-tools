import {
  DocumentNode,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLDirective,
  specifiedDirectives,
  extendSchema,
  isSchema,
  ASTNode,
  GraphQLNamedType,
} from 'graphql';

import { SchemaDirectiveVisitor, cloneDirective, mergeDeep, IResolvers, rewireTypes } from '@graphql-tools/utils';

import {
  addResolversToSchema,
  addSchemaLevelResolver,
  addErrorLoggingToSchema,
  addCatchUndefinedToSchema,
  assertResolversPresent,
  attachDirectiveResolvers,
  buildDocumentFromTypeDefinitions,
  extendResolversFromInterfaces,
} from '@graphql-tools/schema';

import { buildTypeCandidates, buildTypeMap } from './typeCandidates';
import { createMergeInfo, completeMergeInfo, addMergeInfo } from './mergeInfo';
import { MergeTypeCandidate, IStitchSchemasOptions, MergeInfo } from './types';
import { SubschemaConfig, isSubschemaConfig } from '@graphql-tools/delegate';

export function stitchSchemas({
  subschemas = [],
  types = [],
  typeDefs,
  schemas = [],
  onTypeConflict,
  resolvers = {},
  schemaDirectives,
  inheritResolversFromInterfaces = false,
  mergeTypes = false,
  mergeDirectives,
  logger,
  allowUndefinedInResolve = true,
  resolverValidationOptions = {},
  directiveResolvers,
  parseOptions = {},
}: IStitchSchemasOptions): GraphQLSchema {
  if (typeof resolverValidationOptions !== 'object') {
    throw new Error('Expected `resolverValidationOptions` to be an object');
  }

  const typeCandidates: Record<string, Array<MergeTypeCandidate>> = Object.create(null);
  const extensions: Array<DocumentNode> = [];
  const directives: Array<GraphQLDirective> = [];
  const schemaDefs = Object.create(null);
  const operationTypeNames = {
    query: 'Query',
    mutation: 'Mutation',
    subscription: 'Subscription',
  };

  let schemaLikeObjects: Array<GraphQLSchema | SubschemaConfig | DocumentNode | GraphQLNamedType> = [...subschemas];
  if (typeDefs) {
    schemaLikeObjects.push(buildDocumentFromTypeDefinitions(typeDefs, parseOptions));
  }
  if (types != null) {
    schemaLikeObjects = schemaLikeObjects.concat(types);
  }
  schemas.forEach(schemaLikeObject => {
    if (isSchema(schemaLikeObject) || isSubschemaConfig(schemaLikeObject)) {
      schemaLikeObjects.push(schemaLikeObject);
    } else if (typeof schemaLikeObject === 'string' || isDocumentNode(schemaLikeObject)) {
      schemaLikeObjects.push(buildDocumentFromTypeDefinitions(schemaLikeObject, parseOptions));
    } else if (Array.isArray(schemaLikeObject)) {
      schemaLikeObjects = schemaLikeObjects.concat(schemaLikeObject);
    } else {
      throw new Error('Invalid schema passed');
    }
  });

  buildTypeCandidates({
    schemaLikeObjects,
    typeCandidates,
    extensions,
    directives,
    schemaDefs,
    operationTypeNames,
    mergeDirectives,
  });

  let mergeInfo: MergeInfo;

  mergeInfo = createMergeInfo(typeCandidates, mergeTypes);

  const typeMap = buildTypeMap({
    typeCandidates,
    mergeTypes,
    mergeInfo,
    onTypeConflict,
    operationTypeNames,
  });

  const { typeMap: newTypeMap, directives: newDirectives } = rewireTypes(typeMap, directives, { skipPruning: true });

  let schema = new GraphQLSchema({
    query: newTypeMap[operationTypeNames.query] as GraphQLObjectType,
    mutation: newTypeMap[operationTypeNames.mutation] as GraphQLObjectType,
    subscription: newTypeMap[operationTypeNames.subscription] as GraphQLObjectType,
    types: Object.keys(newTypeMap).map(key => newTypeMap[key]),
    directives: newDirectives.length
      ? specifiedDirectives.slice().concat(newDirectives.map(directive => cloneDirective(directive)))
      : undefined,
    astNode: schemaDefs.schemaDef,
    extensionASTNodes: schemaDefs.schemaExtensions,
    extensions: null,
  });

  extensions.forEach(extension => {
    schema = extendSchema(schema, extension, {
      commentDescriptions: true,
    });
  });

  // We allow passing in an array of resolver maps, in which case we merge them
  const resolverMap: IResolvers = Array.isArray(resolvers) ? resolvers.reduce(mergeDeep, {}) : resolvers;

  const finalResolvers = inheritResolversFromInterfaces
    ? extendResolversFromInterfaces(schema, resolverMap)
    : resolverMap;

  mergeInfo = completeMergeInfo(mergeInfo, finalResolvers);

  addResolversToSchema({
    schema,
    resolvers: finalResolvers,
    resolverValidationOptions,
    inheritResolversFromInterfaces: false,
  });

  assertResolversPresent(schema, resolverValidationOptions);

  addMergeInfo(schema, mergeInfo);

  if (!allowUndefinedInResolve) {
    addCatchUndefinedToSchema(schema);
  }

  if (logger != null) {
    addErrorLoggingToSchema(schema, logger);
  }

  if (typeof finalResolvers['__schema'] === 'function') {
    // TODO a bit of a hack now, better rewrite generateSchema to attach it there.
    // not doing that now, because I'd have to rewrite a lot of tests.
    addSchemaLevelResolver(schema, finalResolvers['__schema']);
  }

  if (directiveResolvers != null) {
    attachDirectiveResolvers(schema, directiveResolvers);
  }

  if (schemaDirectives != null) {
    SchemaDirectiveVisitor.visitSchemaDirectives(schema, schemaDirectives);
  }

  return schema;
}

export function isDocumentNode(object: any): object is DocumentNode {
  return (object as ASTNode).kind !== undefined;
}
