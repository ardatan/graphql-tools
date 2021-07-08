import { getNamedType, GraphQLOutputType, GraphQLList, print } from 'graphql';
import { delegateToSchema, MergedTypeResolver, MergedTypeResolverOptions } from '@graphql-tools/delegate';
import { batchDelegateToSchema } from '@graphql-tools/batch-delegate';

const cache1 = new WeakMap<any, Map<string, any>>();

export function createMergedTypeResolver<TContext = any>(
  mergedTypeResolverOptions: MergedTypeResolverOptions
): MergedTypeResolver<TContext> | undefined {
  const { fieldName, argsFromKeys, valuesFromResults, args } = mergedTypeResolverOptions;

  if (argsFromKeys != null) {
    return (originalResult, context, info, subschema, selectionSet, key) => {
      const ctx = context ?? info.fieldNodes;
      let cache2 = cache1.get(ctx);
      if (!cache2) {
        cache2 = new Map();
        cache1.set(ctx, cache2);
      }
      const cache2Key = JSON.stringify({ originalResult, selectionSet: print(selectionSet), key });
      let result = cache2.get(cache2Key);
      if (!result) {
        result = batchDelegateToSchema({
          schema: subschema,
          operation: 'query',
          fieldName,
          returnType: new GraphQLList(
            getNamedType(info.schema.getType(originalResult.__typename) ?? info.returnType) as GraphQLOutputType
          ),
          key,
          argsFromKeys,
          valuesFromResults,
          selectionSet,
          context,
          info,
          skipTypeMerging: true,
        });
        cache2.set(cache2Key, result);
      }
      return result;
    };
  }

  if (args != null) {
    return (originalResult, context, info, subschema, selectionSet) =>
      delegateToSchema({
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
        skipTypeMerging: true,
      });
  }

  return undefined;
}
