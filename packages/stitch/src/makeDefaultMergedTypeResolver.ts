import { getNamedType, GraphQLOutputType, GraphQLList } from 'graphql';
import { delegateToSchema, MergedTypeResolver, MergedTypeConfig } from '@graphql-tools/delegate';
import { batchDelegateToSchema } from '@graphql-tools/batch-delegate';

export function makeDefaultMergedTypeResolver(mergedTypeConfig: MergedTypeConfig): MergedTypeResolver {
  let resolver: MergedTypeResolver;

  if (mergedTypeConfig.key != null) {
    resolver = (originalResult, context, info, subschema, selectionSet, key?) =>
      batchDelegateToSchema({
        schema: subschema,
        operation: 'query',
        fieldName: mergedTypeConfig.fieldName,
        returnType: new GraphQLList(
          getNamedType(info.schema.getType(originalResult.__typename) ?? info.returnType) as GraphQLOutputType
        ),
        key: key ?? mergedTypeConfig.key(originalResult),
        argsFromKeys: mergedTypeConfig.argsFromKeys,
        valuesFromResults: mergedTypeConfig.valuesFromResults,
        selectionSet,
        context,
        info,
        skipTypeMerging: true,
      });

    if (mergedTypeConfig.eagerReturn != null) {
      return (originalResult, context, info, subschema, selectionSet) => {
        const key = mergedTypeConfig.key(originalResult);
        const eagerResult: any = mergedTypeConfig.eagerReturn(
          originalResult,
          context,
          info,
          subschema,
          selectionSet,
          key
        );
        return eagerResult !== undefined
          ? eagerResult
          : resolver(originalResult, context, info, subschema, selectionSet, key);
      };
    }
  } else if (mergedTypeConfig.fieldName != null) {
    resolver = (originalResult, context, info, subschema, selectionSet) =>
      delegateToSchema({
        schema: subschema,
        operation: 'query',
        fieldName: mergedTypeConfig.fieldName,
        returnType: getNamedType(
          info.schema.getType(originalResult.__typename) ?? info.returnType
        ) as GraphQLOutputType,
        args: mergedTypeConfig.args(originalResult),
        selectionSet,
        context,
        info,
        skipTypeMerging: true,
      });

    if (mergedTypeConfig.eagerReturn != null) {
      return (originalResult, context, info, subschema, selectionSet) => {
        const eagerResult: any = mergedTypeConfig.eagerReturn(originalResult, context, info, subschema, selectionSet);
        return eagerResult !== undefined
          ? eagerResult
          : resolver(originalResult, context, info, subschema, selectionSet);
      };
    }
  }

  return resolver;
}
