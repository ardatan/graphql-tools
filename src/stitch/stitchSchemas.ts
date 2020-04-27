import {
  DocumentNode,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLDirective,
  specifiedDirectives,
  extendSchema,
} from 'graphql';

import { mergeDeep } from '../utils/mergeDeep';

import {
  SchemaLikeObject,
  IResolvers,
  IStitchSchemasOptions,
  MergeTypeCandidate,
  MergeInfo,
  IResolversParameter,
} from '../Interfaces';
import { addResolversToSchema } from '../addResolvers/index';
import {
  SchemaDirectiveVisitor,
  cloneDirective,
  rewireTypes,
} from '../utils/index';

import { addSchemaLevelResolver } from '../generate/addSchemaLevelResolver';
import {
  addErrorLoggingToSchema,
  addCatchUndefinedToSchema,
} from '../generate/decorate';
import { assertResolversPresent } from '../generate/assertResolversPresent';
import { attachDirectiveResolvers } from '../generate/attachDirectiveResolvers';
import { buildDocumentFromTypeDefinitions } from '../generate/buildSchemaFromTypeDefinitions';

import { buildTypeCandidates, buildTypeMap } from './typeCandidates';
import { createMergeInfo, completeMergeInfo, addMergeInfo } from './mergeInfo';

export function stitchSchemas({
  subschemas = [],
  types = [],
  typeDefs,
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
  const typeCandidates: Record<
    string,
    Array<MergeTypeCandidate>
  > = Object.create(null);
  const extensions: Array<DocumentNode> = [];
  const directives: Array<GraphQLDirective> = [];
  const schemaDefs = Object.create(null);
  const operationTypeNames = {
    query: 'Query',
    mutation: 'Mutation',
    subscription: 'Subscription',
  };

  const schemaLikeObjects: Array<SchemaLikeObject> = [...subschemas];
  if (typeDefs) {
    schemaLikeObjects.push(
      buildDocumentFromTypeDefinitions(typeDefs, parseOptions),
    );
  }
  if (types != null) {
    schemaLikeObjects.push(types);
  }

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

  if (subschemas.length) {
    mergeInfo = createMergeInfo(allSchemas, typeCandidates, mergeTypes);
  }

  const finalResolvers = getFinalResolvers(resolvers, mergeInfo);

  if (subschemas.length) {
    mergeInfo = completeMergeInfo(mergeInfo, finalResolvers);
  }

  const typeMap = buildTypeMap({
    typeCandidates,
    mergeTypes,
    mergeInfo,
    onTypeConflict,
    operationTypeNames,
  });

  const {
    typeMap: newTypeMap,
    directives: newDirectives,
  } = rewireTypes(typeMap, directives, { skipPruning: true });

  let schema = new GraphQLSchema({
    query: newTypeMap[operationTypeNames.query] as GraphQLObjectType,
    mutation: newTypeMap[operationTypeNames.mutation] as GraphQLObjectType,
    subscription: newTypeMap[
      operationTypeNames.subscription
    ] as GraphQLObjectType,
    types: Object.keys(newTypeMap).map((key) => newTypeMap[key]),
    directives: newDirectives.length
      ? specifiedDirectives
          .slice()
          .concat(newDirectives.map((directive) => cloneDirective(directive)))
      : undefined,
    astNode: schemaDefs.schemaDef,
    extensionASTNodes: schemaDefs.schemaExtensions,
    extensions: null,
  });

  extensions.forEach((extension) => {
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

  if (subschemas.length) {
    addMergeInfo(schema, mergeInfo);
  }

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

function getFinalResolvers(
  resolvers: IResolversParameter,
  mergeInfo: MergeInfo,
): IResolvers {
  let finalResolvers: IResolvers;

  if (typeof resolvers === 'function') {
    finalResolvers = resolvers(mergeInfo);
  } else if (Array.isArray(resolvers)) {
    finalResolvers = resolvers.reduce(
      (left, right) =>
        mergeDeep(left, typeof right === 'function' ? right(mergeInfo) : right),
      {},
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
