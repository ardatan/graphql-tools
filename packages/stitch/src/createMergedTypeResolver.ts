import { getNamedType, GraphQLOutputType } from 'graphql';
import { delegateToSchema, MergedTypeResolver, MergedTypeResolverOptions } from '@graphql-tools/delegate';
import { batchDelegateToSchema } from '@graphql-tools/batch-delegate';

export function createMergedTypeResolver<TContext = any>(
  mergedTypeResolverOptions: MergedTypeResolverOptions
): MergedTypeResolver<TContext> | undefined {
  const { fieldName, argsFromKeys, args } = mergedTypeResolverOptions;

  if (argsFromKeys != null) {
    return function mergedBatchedTypeResolver(originalResult, context, info, subschema, selectionSet, key) {
      return batchDelegateToSchema({
        schema: subschema,
        operation: 'query',
        fieldName,
        returnType: getNamedType(
          info.schema.getType(originalResult.__typename) ?? info.returnType
        ) as GraphQLOutputType,
        key,
        argsFromKeys,
        selectionSet,
        context,
        info,
      });
    };
  }

  if (args != null) {
    return function mergedTypeResolver(originalResult, context, info, subschema, selectionSet) {
      return delegateToSchema({
        schema: subschema,
        operation: 'query',
        fieldName,
        returnType: getNamedType(
          info.schema.getType(originalResult.__typename) ?? info.returnType
        ) as GraphQLOutputType,
        args: args(originalResult),
        selectionSet,
        context,
        info,
      });
    };
  }

  return undefined;
}
