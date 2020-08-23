import { GraphQLSchema, GraphQLFieldResolver, GraphQLObjectType, GraphQLResolveInfo } from 'graphql';

import { Operation, getResponseKeyFromInfo } from '@graphql-tools/utils';
import {
  delegateToSchema,
  getSubschema,
  handleResult,
  SubschemaConfig,
  isSubschemaConfig,
  CreateProxyingResolverFn,
  ICreateProxyingResolverOptions,
  Transform,
  applySchemaTransforms,
  isExternalData,
  getErrors,
} from '@graphql-tools/delegate';

export function generateProxyingResolvers(
  subschemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig,
  transforms: Array<Transform>
): Record<string, Record<string, GraphQLFieldResolver<any, any>>> {
  let targetSchema: GraphQLSchema;
  let schemaTransforms: Array<Transform> = [];
  let createProxyingResolver: CreateProxyingResolverFn;

  if (isSubschemaConfig(subschemaOrSubschemaConfig)) {
    targetSchema = subschemaOrSubschemaConfig.schema;
    createProxyingResolver = subschemaOrSubschemaConfig.createProxyingResolver ?? defaultCreateProxyingResolver;
    if (subschemaOrSubschemaConfig.transforms != null) {
      schemaTransforms = schemaTransforms.concat(subschemaOrSubschemaConfig.transforms);
    }
  } else {
    targetSchema = subschemaOrSubschemaConfig;
    createProxyingResolver = defaultCreateProxyingResolver;
  }

  if (transforms != null) {
    schemaTransforms = schemaTransforms.concat(transforms);
  }

  const transformedSchema = applySchemaTransforms(targetSchema, schemaTransforms);

  const operationTypes: Record<Operation, GraphQLObjectType> = {
    query: targetSchema.getQueryType(),
    mutation: targetSchema.getMutationType(),
    subscription: targetSchema.getSubscriptionType(),
  };

  const resolvers = {};
  Object.keys(operationTypes).forEach((operation: Operation) => {
    const rootType = operationTypes[operation];
    if (rootType != null) {
      const typeName = rootType.name;
      const fields = rootType.getFields();

      resolvers[typeName] = {};
      Object.keys(fields).forEach(fieldName => {
        const proxyingResolver = createProxyingResolver({
          schema: subschemaOrSubschemaConfig,
          transforms,
          transformedSchema,
          operation,
          fieldName,
        });

        const finalResolver = createPossiblyNestedProxyingResolver(subschemaOrSubschemaConfig, proxyingResolver);

        if (operation === 'subscription') {
          resolvers[typeName][fieldName] = {
            subscribe: finalResolver,
            resolve: (payload: any, _: never, __: never, { fieldName: targetFieldName }: GraphQLResolveInfo) =>
              payload[targetFieldName],
          };
        } else {
          resolvers[typeName][fieldName] = {
            resolve: finalResolver,
          };
        }
      });
    }
  });

  return resolvers;
}

function createPossiblyNestedProxyingResolver(
  subschemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig,
  proxyingResolver: GraphQLFieldResolver<any, any>
): GraphQLFieldResolver<any, any> {
  return (parent, args, context, info) => {
    if (parent != null) {
      const responseKey = getResponseKeyFromInfo(info);

      // Check to see if the parent contains a proxied result
      if (isExternalData(parent)) {
        const subschema = getSubschema(parent, responseKey);
        const errors = getErrors(parent, responseKey);

        // If there is a proxied result from this subschema, return it
        // This can happen even for a root field when the root type ia
        // also nested as a field within a different type.
        if (subschemaOrSubschemaConfig === subschema && parent[responseKey] !== undefined) {
          return handleResult(parent[responseKey], errors, subschema, context, info);
        }
      }
    }

    return proxyingResolver(parent, args, context, info);
  };
}

export function defaultCreateProxyingResolver({
  schema,
  operation,
  transforms,
  transformedSchema,
}: ICreateProxyingResolverOptions): GraphQLFieldResolver<any, any> {
  return (_parent, _args, context, info) =>
    delegateToSchema({
      schema,
      operation,
      context,
      info,
      transforms,
      transformedSchema,
    });
}
