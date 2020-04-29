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
} from '@graphql-tools/schema';

import { buildTypeCandidates, buildTypeMap } from './typeCandidates';
import { createMergeInfo, completeMergeInfo, addMergeInfo } from './mergeInfo';
import { MergeTypeCandidate, IStitchSchemasOptions, MergeInfo, IResolversParameter } from './types';
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

  const allSchemas: Array<GraphQLSchema> = [];
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
    allSchemas,
    typeCandidates,
    extensions,
    directives,
    schemaDefs,
    operationTypeNames,
    mergeDirectives,
  });

  let mergeInfo: MergeInfo;

  mergeInfo = createMergeInfo(allSchemas, typeCandidates, mergeTypes);

  const finalResolvers = getFinalResolvers(resolvers, mergeInfo);

  mergeInfo = completeMergeInfo(mergeInfo, finalResolvers);

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

  addResolversToSchema({
    schema,
    resolvers: finalResolvers,
    resolverValidationOptions,
    inheritResolversFromInterfaces,
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

function getFinalResolvers(resolvers: IResolversParameter, mergeInfo: MergeInfo): IResolvers {
  let finalResolvers: IResolvers;

  if (typeof resolvers === 'function') {
    finalResolvers = resolvers(mergeInfo);
  } else if (Array.isArray(resolvers)) {
    finalResolvers = resolvers.reduce(
      (left, right) => mergeDeep(left, typeof right === 'function' ? right(mergeInfo) : right),
      {}
    );
    finalResolvers = resolvers.reduce<any>(mergeDeep, {});
  } else {
    finalResolvers = resolvers;
  }

  if (finalResolvers == null) {
    finalResolvers = {};
  }

  return finalResolvers;
}

export function isDocumentNode(object: any): object is DocumentNode {
  return (object as ASTNode).kind !== undefined;
}
