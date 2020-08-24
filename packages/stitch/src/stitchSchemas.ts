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

import { SchemaDirectiveVisitor, mergeDeep, IResolvers, rewireTypes, pruneSchema } from '@graphql-tools/utils';

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
import { createStitchingInfo, completeStitchingInfo, addStitchingInfo } from './stitchingInfo';
import { MergeTypeCandidate, IStitchSchemasOptions, StitchingInfo } from './types';
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
  schemaTransforms = [],
  parseOptions = {},
  pruningOptions,
}: IStitchSchemasOptions): GraphQLSchema {
  if (typeof resolverValidationOptions !== 'object') {
    throw new Error('Expected `resolverValidationOptions` to be an object');
  }

  schemas.forEach(schemaLikeObject => {
    if (
      !isSchema(schemaLikeObject) &&
      !isSubschemaConfig(schemaLikeObject) &&
      typeof schemaLikeObject !== 'string' &&
      !isDocumentNode(schemaLikeObject) &&
      !Array.isArray(schemaLikeObject)
    ) {
      throw new Error('Invalid schema passed');
    }
  });

  let schemaLikeObjects: Array<GraphQLSchema | SubschemaConfig | DocumentNode | GraphQLNamedType> = [...subschemas];
  schemas.forEach(schemaLikeObject => {
    if (isSchema(schemaLikeObject) || isSubschemaConfig(schemaLikeObject)) {
      schemaLikeObjects.push(schemaLikeObject);
    }
  });

  if ((typeDefs && !Array.isArray(typeDefs)) || (Array.isArray(typeDefs) && typeDefs.length)) {
    schemaLikeObjects.push(buildDocumentFromTypeDefinitions(typeDefs, parseOptions));
  }
  schemas.forEach(schemaLikeObject => {
    if (typeof schemaLikeObject === 'string' || isDocumentNode(schemaLikeObject)) {
      schemaLikeObjects.push(buildDocumentFromTypeDefinitions(schemaLikeObject, parseOptions));
    }
  });

  if (types != null) {
    schemaLikeObjects = schemaLikeObjects.concat(types);
  }
  schemas.forEach(schemaLikeObject => {
    if (Array.isArray(schemaLikeObject)) {
      schemaLikeObjects = schemaLikeObjects.concat(schemaLikeObject);
    }
  });

  const transformedSchemas: Map<GraphQLSchema | SubschemaConfig, GraphQLSchema> = new Map();
  const typeCandidates: Record<string, Array<MergeTypeCandidate>> = Object.create(null);
  const extensions: Array<DocumentNode> = [];
  const directives: Array<GraphQLDirective> = [];
  const directiveMap: Record<string, GraphQLDirective> = specifiedDirectives.reduce((acc, directive) => {
    acc[directive.name] = directive;
    return acc;
  }, Object.create(null));
  const schemaDefs = Object.create(null);
  const operationTypeNames = {
    query: 'Query',
    mutation: 'Mutation',
    subscription: 'Subscription',
  };

  buildTypeCandidates({
    schemaLikeObjects,
    transformedSchemas,
    typeCandidates,
    extensions,
    directiveMap,
    schemaDefs,
    operationTypeNames,
    mergeDirectives,
  });

  Object.keys(directiveMap).forEach(directiveName => {
    directives.push(directiveMap[directiveName]);
  });

  let stitchingInfo: StitchingInfo;

  stitchingInfo = createStitchingInfo(transformedSchemas, typeCandidates, mergeTypes);

  const typeMap = buildTypeMap({
    typeCandidates,
    mergeTypes,
    stitchingInfo,
    onTypeConflict,
    operationTypeNames,
  });

  const { typeMap: newTypeMap, directives: newDirectives } = rewireTypes(typeMap, directives);

  let schema = new GraphQLSchema({
    query: newTypeMap[operationTypeNames.query] as GraphQLObjectType,
    mutation: newTypeMap[operationTypeNames.mutation] as GraphQLObjectType,
    subscription: newTypeMap[operationTypeNames.subscription] as GraphQLObjectType,
    types: Object.keys(newTypeMap).map(key => newTypeMap[key]),
    directives: newDirectives,
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

  stitchingInfo = completeStitchingInfo(stitchingInfo, finalResolvers);

  schema = addResolversToSchema({
    schema,
    resolvers: finalResolvers,
    resolverValidationOptions,
    inheritResolversFromInterfaces: false,
  });

  assertResolversPresent(schema, resolverValidationOptions);

  schema = addStitchingInfo(schema, stitchingInfo);

  if (!allowUndefinedInResolve) {
    schema = addCatchUndefinedToSchema(schema);
  }

  if (logger != null) {
    schema = addErrorLoggingToSchema(schema, logger);
  }

  if (typeof finalResolvers['__schema'] === 'function') {
    // TODO a bit of a hack now, better rewrite generateSchema to attach it there.
    // not doing that now, because I'd have to rewrite a lot of tests.
    schema = addSchemaLevelResolver(schema, finalResolvers['__schema']);
  }

  schemaTransforms.forEach(schemaTransform => {
    schema = schemaTransform(schema);
  });

  if (directiveResolvers != null) {
    schema = attachDirectiveResolvers(schema, directiveResolvers);
  }

  if (schemaDirectives != null) {
    SchemaDirectiveVisitor.visitSchemaDirectives(schema, schemaDirectives);
  }

  return pruningOptions ? pruneSchema(schema, pruningOptions) : schema;
}

export function isDocumentNode(object: any): object is DocumentNode {
  return (object as ASTNode).kind !== undefined;
}
