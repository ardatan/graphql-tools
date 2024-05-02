import { GraphQLFieldResolver, GraphQLSchema, OperationTypeNode } from 'graphql';
import {
  delegateToSchema,
  getSubschema,
  getUnpathedErrors,
  ICreateProxyingResolverOptions,
  isExternalObject,
  resolveExternalValue,
  StitchingInfo,
  Subschema,
  SubschemaConfig,
} from '@graphql-tools/delegate';
import {
  calculateSelectionsScore,
  extractUnavailableFields,
} from '@graphql-tools/stitch';
import { getResponseKeyFromInfo, getRootTypeMap } from '@graphql-tools/utils';

export function generateProxyingResolvers<TContext extends Record<string, any>>(
  subschemaConfig: SubschemaConfig<any, any, any, TContext>,
): Record<string, Record<string, GraphQLFieldResolver<any, any>>> {
  const targetSchema = subschemaConfig.schema;
  const createProxyingResolver =
    subschemaConfig.createProxyingResolver ?? defaultCreateProxyingResolver;

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
  proxyingResolver: GraphQLFieldResolver<any, any>,
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
          return resolveExternalValue(
            parent[responseKey],
            unpathedErrors,
            subschema,
            context,
            info,
          );
        }
      }
    }

    return proxyingResolver(parent, args, context, info);
  };
}

function getStitchingInfo(schema: GraphQLSchema): StitchingInfo | undefined {
  return schema.extensions?.['stitchingInfo'] as StitchingInfo;
}

export function defaultCreateProxyingResolver<TContext extends Record<string, any>>({
  subschemaConfig,
  operation,
}: ICreateProxyingResolverOptions<TContext>): GraphQLFieldResolver<any, any> {
  return function proxyingResolver(_parent, _args, context, info) {
    const fieldNode = info.fieldNodes[0];
    let currentSubschema: SubschemaConfig<any, any, any, any> | Subschema<any, any, any, any> =
      subschemaConfig;
    let currentScore = Infinity;
    if (fieldNode.selectionSet) {
      const stitchingInfo = getStitchingInfo(info.schema);
      if (stitchingInfo) {
        for (const [, subschema] of stitchingInfo.subschemaMap) {
          const operationTypeInSubschema = subschema.transformedSchema.getRootType(operation || OperationTypeNode.QUERY);
          if (operationTypeInSubschema) {
            const operationFieldMap = operationTypeInSubschema.getFields();
            const operationField = operationFieldMap[fieldNode.name.value];
            if (operationField) {
              const unavailableFields = extractUnavailableFields(
                subschema.transformedSchema,
                operationField,
                fieldNode,
                () => true,
              );
              const score = calculateSelectionsScore(unavailableFields).size;
              if (score < currentScore) {
                currentSubschema = subschema;
                currentScore = score;
              }
            }
          }
        }
      }
    }
    return delegateToSchema({
      schema: currentSubschema,
      operation,
      context,
      info,
    });
  };
}
