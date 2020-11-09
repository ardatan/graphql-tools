import { getNamedType, GraphQLOutputType, GraphQLList } from 'graphql';
import { delegateToSchema, MergedTypeResolver, MergedTypeConfig } from '@graphql-tools/delegate';
import { batchDelegateToSchema } from '@graphql-tools/batch-delegate';

export function makeDefaultMergedTypeResolver(mergedTypeConfig: MergedTypeConfig): MergedTypeResolver {
  if (mergedTypeConfig.key != null) {
    return (originalResult, context, info, subschema, selectionSet) =>
      batchDelegateToSchema({
        schema: subschema,
        operation: 'query',
        fieldName: mergedTypeConfig.fieldName,
        returnType: new GraphQLList(
          getNamedType(info.schema.getType(originalResult.__typename) ?? info.returnType) as GraphQLOutputType
        ),
        key: mergedTypeConfig.key(originalResult),
        argsFromKeys: mergedTypeConfig.argsFromKeys,
        valuesFromResults: mergedTypeConfig.valuesFromResults,
        selectionSet,
        context,
        info,
        skipTypeMerging: true,
      });
  } else if (mergedTypeConfig.fieldName != null) {
    return (originalResult, context, info, subschema, selectionSet) =>
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
  }
}
