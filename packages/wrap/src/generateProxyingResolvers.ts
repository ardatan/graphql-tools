import { GraphQLSchema, GraphQLFieldResolver, GraphQLObjectType, GraphQLResolveInfo, OperationTypeNode } from 'graphql';

import { getResponseKeyFromInfo } from '@graphql-tools/utils';
import {
  delegateToSchema,
  getSubschema,
  resolveExternalValue,
  SubschemaConfig,
  isSubschemaConfig,
  CreateProxyingResolverFn,
  ICreateProxyingResolverOptions,
  Transform,
  applySchemaTransforms,
  isExternalObject,
  getUnpathedErrors,
} from '@graphql-tools/delegate';

export function generateProxyingResolvers(
  subschemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig,
  transforms: Array<Transform>
): Record<string, Record<string, GraphQLFieldResolver<any, any>>> {
  let targetSchema: GraphQLSchema;
  let createProxyingResolver: CreateProxyingResolverFn;
  let subschemaConfig: SubschemaConfig;

  if (isSubschemaConfig(subschemaOrSubschemaConfig)) {
    targetSchema = subschemaOrSubschemaConfig.schema;
    subschemaConfig = subschemaOrSubschemaConfig;
    createProxyingResolver = subschemaOrSubschemaConfig.createProxyingResolver ?? defaultCreateProxyingResolver;
  } else {
    targetSchema = subschemaOrSubschemaConfig;
    createProxyingResolver = defaultCreateProxyingResolver;
  }

  const transformedSchema = applySchemaTransforms(targetSchema, subschemaConfig, transforms);

  const operationTypes: Record<OperationTypeNode, GraphQLObjectType> = {
    query: targetSchema.getQueryType(),
    mutation: targetSchema.getMutationType(),
    subscription: targetSchema.getSubscriptionType(),
  };

  const resolvers = {};
  Object.keys(operationTypes).forEach((operation: OperationTypeNode) => {
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
      if (isExternalObject(parent)) {
        const unpathedErrors = getUnpathedErrors(parent);
        const subschema = getSubschema(parent, responseKey);

        // If there is a proxied result from this subschema, return it
        // This can happen even for a root field when the root type ia
        // also nested as a field within a different type.
        if (subschemaOrSubschemaConfig === subschema && parent[responseKey] !== undefined) {
          return resolveExternalValue(parent[responseKey], unpathedErrors, subschema, context, info);
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
