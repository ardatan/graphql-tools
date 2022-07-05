import { GraphQLFieldResolver } from 'graphql';

import { getResponseKeyFromInfo, getRootTypeMap } from '@graphql-tools/utils';
import {
  delegateToSchema,
  getSubschema,
  resolveExternalValue,
  SubschemaConfig,
  ICreateProxyingResolverOptions,
  isExternalObject,
  getUnpathedErrors,
} from '@graphql-tools/delegate';

export function generateProxyingResolvers<TContext extends Record<string, any>>(
  subschemaConfig: SubschemaConfig<any, any, any, TContext>
): Record<string, Record<string, GraphQLFieldResolver<any, any>>> {
  const targetSchema = subschemaConfig.schema;
  const createProxyingResolver = subschemaConfig.createProxyingResolver ?? defaultCreateProxyingResolver;

  const rootTypeMap = getRootTypeMap(targetSchema);

  const resolvers = {};
  for (const [operation, rootType] of rootTypeMap.entries()) {
    const typeName = rootType.name;
    const fields = rootType.getFields();

    resolvers[typeName] = {};
    for (const fieldName in fields) {
      const proxyingResolver = createProxyingResolver({
        subschemaConfig,
        operation,
        fieldName,
      });

      const finalResolver = createPossiblyNestedProxyingResolver(subschemaConfig, proxyingResolver);

      if (operation === 'subscription') {
        resolvers[typeName][fieldName] = {
          subscribe: finalResolver,
          resolve: identical,
        };
      } else {
        resolvers[typeName][fieldName] = {
          resolve: finalResolver,
        };
      }
    }
  }

  return resolvers;
}

function identical<T>(value: T): T {
  return value;
}

function createPossiblyNestedProxyingResolver<TContext extends Record<string, any>>(
  subschemaConfig: SubschemaConfig<any, any, any, TContext>,
  proxyingResolver: GraphQLFieldResolver<any, any>
): GraphQLFieldResolver<any, TContext, any> {
  return function possiblyNestedProxyingResolver(parent, args, context, info) {
    if (parent != null) {
      const responseKey = getResponseKeyFromInfo(info);

      // Check to see if the parent contains a proxied result
      if (isExternalObject(parent)) {
        const unpathedErrors = getUnpathedErrors(parent);
        const subschema = getSubschema(parent, responseKey);

        // If there is a proxied result from this subschema, return it
        // This can happen even for a root field when the root type ia
        // also nested as a field within a different type.
        if (subschemaConfig === subschema && parent[responseKey] !== undefined) {
          return resolveExternalValue(parent[responseKey], unpathedErrors, subschema, context, info);
        }
      }
    }

    return proxyingResolver(parent, args, context, info);
  };
}

export function defaultCreateProxyingResolver<TContext extends Record<string, any>>({
  subschemaConfig,
  operation,
}: ICreateProxyingResolverOptions<TContext>): GraphQLFieldResolver<any, any> {
  return function proxyingResolver(_parent, _args, context, info) {
    return delegateToSchema({
      schema: subschemaConfig,
      operation,
      context,
      info,
    });
  };
}
