import {
  DocumentNode,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLDirective,
  specifiedDirectives,
  extendSchema,
  ASTNode,
} from 'graphql';

import { SchemaDirectiveVisitor, mergeDeep, IResolvers, rewireTypes, pruneSchema } from '@graphql-tools/utils';

import {
  addResolversToSchema,
  addSchemaLevelResolver,
  addErrorLoggingToSchema,
  addCatchUndefinedToSchema,
  assertResolversPresent,
  attachDirectiveResolvers,
  extendResolversFromInterfaces,
} from '@graphql-tools/schema';

import { SubschemaConfig, isSubschemaConfig, Subschema } from '@graphql-tools/delegate';

import { IStitchSchemasOptions, SubschemaConfigTransform } from './types';

import { buildTypeCandidates, buildTypeMap } from './typeCandidates';
import { createStitchingInfo, completeStitchingInfo, addStitchingInfo } from './stitchingInfo';
import { isolateComputedFields } from './isolateComputedFields';
import { defaultSubschemaConfigTransforms } from './subschemaConfigTransforms';

export function stitchSchemas({
  subschemas = [],
  types = [],
  typeDefs,
  onTypeConflict,
  mergeDirectives,
  mergeTypes = true,
  typeMergingOptions,
  subschemaConfigTransforms = defaultSubschemaConfigTransforms,
  resolvers = {},
  schemaDirectives,
  inheritResolversFromInterfaces = false,
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

  let transformedSubschemas: Array<Subschema> = [];
  const targetSubschemaMap: Map<GraphQLSchema | SubschemaConfig, Subschema> = new Map();
  const originalSubschemaMap: Map<Subschema, GraphQLSchema | SubschemaConfig> = new Map();

  subschemas.forEach(subschemaOrSubschemaArray => {
    if (Array.isArray(subschemaOrSubschemaArray)) {
      subschemaOrSubschemaArray.forEach(s => {
        transformedSubschemas = transformedSubschemas.concat(
          applySubschemaConfigTransforms(subschemaConfigTransforms, s, targetSubschemaMap, originalSubschemaMap)
        );
      });
    } else {
      transformedSubschemas = transformedSubschemas.concat(
        applySubschemaConfigTransforms(
          subschemaConfigTransforms,
          subschemaOrSubschemaArray,
          targetSubschemaMap,
          originalSubschemaMap
        )
      );
    }
  });

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

  const typeCandidates = buildTypeCandidates({
    subschemas: transformedSubschemas,
    originalSubschemaMap,
    types,
    typeDefs,
    parseOptions,
    extensions,
    directiveMap,
    schemaDefs,
    operationTypeNames,
    mergeDirectives,
  });

  Object.keys(directiveMap).forEach(directiveName => {
    directives.push(directiveMap[directiveName]);
  });

  let stitchingInfo = createStitchingInfo(targetSubschemaMap, typeCandidates, mergeTypes);

  const typeMap = buildTypeMap({
    typeCandidates,
    stitchingInfo,
    operationTypeNames,
    onTypeConflict,
    mergeTypes,
    typeMergingOptions,
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

function applySubschemaConfigTransforms(
  subschemaConfigTransforms: Array<SubschemaConfigTransform>,
  subschemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig,
  targetSubschemaMap: Map<GraphQLSchema | SubschemaConfig, Subschema>,
  originalSubschemaMap: Map<Subschema, GraphQLSchema | SubschemaConfig>
): Array<Subschema> {
  const subschemaConfig = isSubschemaConfig(subschemaOrSubschemaConfig)
    ? subschemaOrSubschemaConfig
    : { schema: subschemaOrSubschemaConfig };

  const newSubschemaConfig = subschemaConfigTransforms.reduce((acc, subschemaConfigTransform) => {
    return subschemaConfigTransform(acc);
  }, subschemaConfig);

  const transformedSubschemas = isolateComputedFields(newSubschemaConfig).map(
    subschemaConfig => new Subschema(subschemaConfig)
  );

  const baseSubschema = transformedSubschemas[0];

  targetSubschemaMap.set(subschemaOrSubschemaConfig, baseSubschema);

  transformedSubschemas.forEach(subschema => originalSubschemaMap.set(subschema, subschemaOrSubschemaConfig));

  return transformedSubschemas;
}

export function isDocumentNode(object: any): object is DocumentNode {
  return (object as ASTNode).kind !== undefined;
}
