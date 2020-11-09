import { getNamedType, GraphQLOutputType, GraphQLList } from 'graphql';
import { delegateToSchema, MergedTypeResolver, MergedTypeConfig } from '@graphql-tools/delegate';
import { batchDelegateToSchema } from '@graphql-tools/batch-delegate';

export function createMergedTypeResolver(mergedTypeConfig: MergedTypeConfig): MergedTypeResolver {
  let resolver: MergedTypeResolver;

  const { fieldName, key: keyFn, argsFromKeys, valuesFromResults, args, resolve } = mergedTypeConfig;

  if (resolve != null) {
    resolver = resolve;
  } else {
    if (keyFn != null) {
      resolver = (originalResult, context, info, subschema, selectionSet, key) =>
        batchDelegateToSchema({
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
    } else {
      resolver = (originalResult, context, info, subschema, selectionSet) =>
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
  }

  if (keyFn && resolver) {
    return (originalResult, context, info, subschema, selectionSet) => {
      const key = keyFn(originalResult);
      return resolver(originalResult, context, info, subschema, selectionSet, key);
    };
  }

  return resolver;
}
