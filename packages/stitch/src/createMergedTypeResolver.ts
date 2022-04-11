import { getNamedType, GraphQLList, GraphQLOutputType, OperationTypeNode } from 'graphql';
import { delegateToSchema, MergedTypeResolver, MergedTypeResolverOptions } from '@graphql-tools/delegate';
import { batchDelegateToSchema } from '@graphql-tools/batch-delegate';

export function createMergedTypeResolver<TContext extends Record<string, any> = any>(
  mergedTypeResolverOptions: MergedTypeResolverOptions
): MergedTypeResolver<TContext> | undefined {
  const { fieldName, argsFromKeys, valuesFromResults, args } = mergedTypeResolverOptions;

  if (argsFromKeys != null) {
    return function mergedBatchedTypeResolver(
      _originalResult,
      context,
      info,
      subschema,
      selectionSet,
      key,
      type = getNamedType(info.returnType) as GraphQLOutputType
    ) {
      return batchDelegateToSchema({
        schema: subschema,
        operation: 'query' as OperationTypeNode,
        fieldName,
        returnType: new GraphQLList(type),
        key,
        argsFromKeys,
        valuesFromResults,
        selectionSet,
        context,
        info,
        skipTypeMerging: true,
      });
    };
  }

  if (args != null) {
    return function mergedTypeResolver(
      originalResult,
      context,
      info,
      subschema,
      selectionSet,
      _key,
      type = getNamedType(info.returnType) as GraphQLOutputType
    ) {
      return delegateToSchema({
        schema: subschema,
        operation: 'query' as OperationTypeNode,
        fieldName,
        returnType: type,
        args: args(originalResult),
        selectionSet,
        context,
        info,
        skipTypeMerging: true,
      });
    };
  }

  return undefined;
}
