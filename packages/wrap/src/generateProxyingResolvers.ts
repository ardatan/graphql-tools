import { GraphQLSchema, GraphQLFieldResolver, GraphQLObjectType } from 'graphql';

import { Transform, Operation, getResponseKeyFromInfo, getErrors } from '@graphql-tools/utils';
import {
  delegateToSchema,
  getSubschema,
  handleResult,
  SubschemaConfig,
  isSubschemaConfig,
  CreateProxyingResolverFn,
} from '@graphql-tools/delegate';

export function generateProxyingResolvers(
  subschemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig,
  transforms: Array<Transform>
): Record<string, Record<string, GraphQLFieldResolver<any, any>>> {
  let targetSchema: GraphQLSchema;
  let createProxyingResolver: CreateProxyingResolverFn;

  if (isSubschemaConfig(subschemaOrSubschemaConfig)) {
    targetSchema = subschemaOrSubschemaConfig.schema;
    createProxyingResolver = subschemaOrSubschemaConfig.createProxyingResolver ?? defaultCreateProxyingResolver;
  } else {
    targetSchema = subschemaOrSubschemaConfig;
    createProxyingResolver = defaultCreateProxyingResolver;
  }

  const operationTypes: Record<Operation, GraphQLObjectType> = {
    query: targetSchema.getQueryType(),
    mutation: targetSchema.getMutationType(),
    subscription: targetSchema.getSubscriptionType(),
  };

  const resolvers = {};
  Object.keys(operationTypes).forEach((operation: Operation) => {
    const resolveField = operation === 'subscription' ? 'subscribe' : 'resolve';

    const rootType = operationTypes[operation];
    if (rootType != null) {
      const typeName = rootType.name;
      const fields = rootType.getFields();

      resolvers[typeName] = {};
      Object.keys(fields).forEach(fieldName => {
        const proxyingResolver = createProxyingResolver(subschemaOrSubschemaConfig, transforms, operation, fieldName);

        const finalResolver = createPossiblyNestedProxyingResolver(subschemaOrSubschemaConfig, proxyingResolver);

        resolvers[typeName][fieldName] = {
          [resolveField]: finalResolver,
        };
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
      const errors = getErrors(parent, responseKey);

      // Check to see if the parent contains a proxied result
      if (errors != null) {
        const subschema = getSubschema(parent, responseKey);

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

export function defaultCreateProxyingResolver(
  schema: GraphQLSchema | SubschemaConfig,
  transforms: Array<Transform>
): GraphQLFieldResolver<any, any> {
  return (_parent, _args, context, info) =>
    delegateToSchema({
      schema,
      context,
      info,
      transforms,
    });
}
