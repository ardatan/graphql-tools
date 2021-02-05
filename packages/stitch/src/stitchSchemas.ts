import {
  DocumentNode,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLDirective,
  specifiedDirectives,
  extendSchema,
} from 'graphql';

import { SchemaDirectiveVisitor, mergeDeep, IResolvers, pruneSchema } from '@graphql-tools/utils';

import {
  addResolversToSchema,
  addSchemaLevelResolver,
  addErrorLoggingToSchema,
  addCatchUndefinedToSchema,
  assertResolversPresent,
  attachDirectiveResolvers,
  extendResolversFromInterfaces,
} from '@graphql-tools/schema';

import { SubschemaConfig, isSubschemaConfig, Subschema, defaultMergedResolver } from '@graphql-tools/delegate';

import { IStitchSchemasOptions, SubschemaConfigTransform } from './types';

import { buildTypeCandidates, buildTypes } from './typeCandidates';
import { createStitchingInfo, completeStitchingInfo, addStitchingInfo } from './stitchingInfo';
import {
  defaultSubschemaConfigTransforms,
  isolateComputedFieldsTransformer,
  splitMergedTypeAccessTransformer,
} from './subschemaConfigTransforms';

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
  updateResolversInPlace,
}: IStitchSchemasOptions): GraphQLSchema {
  if (typeof resolverValidationOptions !== 'object') {
    throw new Error('Expected `resolverValidationOptions` to be an object');
  }

  let transformedSubschemas: Array<Subschema> = [];
  const subschemaMap: Map<GraphQLSchema | SubschemaConfig, Subschema> = new Map();
  const originalSubschemaMap: Map<Subschema, GraphQLSchema | SubschemaConfig> = new Map();

  subschemas.forEach(subschemaOrSubschemaArray => {
    if (Array.isArray(subschemaOrSubschemaArray)) {
      subschemaOrSubschemaArray.forEach(s => {
        transformedSubschemas = transformedSubschemas.concat(
          applySubschemaConfigTransforms(subschemaConfigTransforms, s, subschemaMap, originalSubschemaMap)
        );
      });
    } else {
      transformedSubschemas = transformedSubschemas.concat(
        applySubschemaConfigTransforms(
          subschemaConfigTransforms,
          subschemaOrSubschemaArray,
          subschemaMap,
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

  let stitchingInfo = createStitchingInfo(subschemaMap, typeCandidates, mergeTypes);

  const { typeMap: newTypeMap, directives: newDirectives } = buildTypes({
    typeCandidates,
    directives,
    stitchingInfo,
    operationTypeNames,
    onTypeConflict,
    mergeTypes,
    typeMergingOptions,
  });

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

  stitchingInfo = completeStitchingInfo(stitchingInfo, finalResolvers, schema);

  schema = addResolversToSchema({
    schema,
    defaultFieldResolver: defaultMergedResolver,
    resolvers: finalResolvers,
    resolverValidationOptions,
    inheritResolversFromInterfaces: false,
    updateResolversInPlace,
  });

  if (Object.keys(resolverValidationOptions).length > 0) {
    assertResolversPresent(schema, resolverValidationOptions);
  }

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

  if (pruningOptions) {
    schema = pruneSchema(schema, pruningOptions);
  }

  return schema;
}

const subschemaConfigTransformerPresets = [isolateComputedFieldsTransformer, splitMergedTypeAccessTransformer];

function applySubschemaConfigTransforms(
  subschemaConfigTransforms: Array<SubschemaConfigTransform>,
  subschemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig,
  subschemaMap: Map<GraphQLSchema | SubschemaConfig, Subschema>,
  originalSubschemaMap: Map<Subschema, GraphQLSchema | SubschemaConfig>
): Array<Subschema> {
  const subschemaConfig = isSubschemaConfig(subschemaOrSubschemaConfig)
    ? subschemaOrSubschemaConfig
    : { schema: subschemaOrSubschemaConfig };

  let transformedSubschemaConfigs: Array<SubschemaConfig> = [subschemaConfig];
  subschemaConfigTransforms.concat(subschemaConfigTransformerPresets).forEach(subschemaConfigTransform => {
    const mapped: Array<SubschemaConfig | Array<SubschemaConfig>> = transformedSubschemaConfigs.map(ssConfig =>
      subschemaConfigTransform(ssConfig)
    );
    transformedSubschemaConfigs = mapped.flat();
  });

  const transformedSubschemas = transformedSubschemaConfigs.map(ssConfig => new Subschema(ssConfig));

  const baseSubschema = transformedSubschemas[0];

  subschemaMap.set(subschemaOrSubschemaConfig, baseSubschema);

  transformedSubschemas.forEach(subschema => originalSubschemaMap.set(subschema, subschemaOrSubschemaConfig));

  return transformedSubschemas;
}
