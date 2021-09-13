import { getNamedType, GraphQLList } from 'graphql';
import { delegateToSchema } from '@graphql-tools/delegate';
import { batchDelegateToSchema } from '@graphql-tools/batch-delegate';
export function createMergedTypeResolver(mergedTypeResolverOptions) {
    var fieldName = mergedTypeResolverOptions.fieldName, argsFromKeys = mergedTypeResolverOptions.argsFromKeys, valuesFromResults = mergedTypeResolverOptions.valuesFromResults, args = mergedTypeResolverOptions.args;
    if (argsFromKeys != null) {
        return function mergedBatchedTypeResolver(originalResult, context, info, subschema, selectionSet, key) {
            var _a;
            return batchDelegateToSchema({
                schema: subschema,
                operation: 'query',
                fieldName: fieldName,
                returnType: new GraphQLList(getNamedType((_a = info.schema.getType(originalResult.__typename)) !== null && _a !== void 0 ? _a : info.returnType)),
                key: key,
                argsFromKeys: argsFromKeys,
                valuesFromResults: valuesFromResults,
                selectionSet: selectionSet,
                context: context,
                info: info,
                skipTypeMerging: true,
            });
        };
    }
    if (args != null) {
        return function mergedTypeResolver(originalResult, context, info, subschema, selectionSet) {
            var _a;
            return delegateToSchema({
                schema: subschema,
                operation: 'query',
                fieldName: fieldName,
                returnType: getNamedType((_a = info.schema.getType(originalResult.__typename)) !== null && _a !== void 0 ? _a : info.returnType),
                args: args(originalResult),
                selectionSet: selectionSet,
                context: context,
                info: info,
                skipTypeMerging: true,
            });
        };
    }
    return undefined;
}
