import { GraphQLFieldResolver, GraphQLObjectType, GraphQLResolveInfo, GraphQLSchema, OperationTypeNode } from 'graphql';

import { getResponseKeyFromInfo } from '@graphql-tools/utils';
import {
  delegateToSchema,
  getSubschema,
  resolveExternalValue,
  SubschemaConfig,
  ICreateProxyingResolverOptions,
  applySchemaTransforms,
  isExternalObject,
  getUnpathedErrors,
  getReceiver,
} from '@graphql-tools/delegate';

export function generateProxyingResolvers(
  subschemaConfig: SubschemaConfig,
  transformedSchema?: GraphQLSchema,
): Record<string, Record<string, GraphQLFieldResolver<any, any>>> {
  const targetSchema = subschemaConfig.schema;
  const createProxyingResolver = subschemaConfig.createProxyingResolver ?? defaultCreateProxyingResolver;

  if (transformedSchema === undefined) {
    transformedSchema = applySchemaTransforms(targetSchema, subschemaConfig);
  }

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
          subschemaConfig,
          transformedSchema,
          operation,
          fieldName,
        });

        const finalResolver = createPossiblyNestedProxyingResolver(subschemaConfig, proxyingResolver);

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
  subschemaConfig: SubschemaConfig,
  proxyingResolver: GraphQLFieldResolver<any, any>
): GraphQLFieldResolver<any, any> {
  return (parent, args, context, info) => {
    if (parent != null) {
      const responseKey = getResponseKeyFromInfo(info);

      // Check to see if the parent contains a proxied result
      if (isExternalObject(parent)) {
        const subschema = getSubschema(parent, responseKey);

        // If there is a proxied result from this subschema, return it
        // This can happen even for a root field when the root type ia
        // also nested as a field within a different type.
        if (subschemaConfig === subschema && parent[responseKey] !== undefined) {
          const unpathedErrors = getUnpathedErrors(parent);
          const receiver = getReceiver(parent, subschema);
          return resolveExternalValue(parent[responseKey], unpathedErrors, subschema, context, info, receiver);
        }
      }
    }

    return proxyingResolver(parent, args, context, info);
  };
}

export function defaultCreateProxyingResolver({
  subschemaConfig,
  operation,
  transformedSchema,
}: ICreateProxyingResolverOptions): GraphQLFieldResolver<any, any> {
  return (_parent, _args, context, info) =>
    delegateToSchema({
      schema: subschemaConfig,
      operation,
      context,
      info,
      transformedSchema,
    });
}
