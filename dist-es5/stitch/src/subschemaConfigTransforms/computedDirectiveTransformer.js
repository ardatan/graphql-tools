import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';
import { cloneSubschemaConfig } from '@graphql-tools/delegate';
export function computedDirectiveTransformer(computedDirectiveName) {
    return function (subschemaConfig) {
        var _a;
        var newSubschemaConfig = cloneSubschemaConfig(subschemaConfig);
        mapSchema(subschemaConfig.schema, (_a = {},
            _a[MapperKind.OBJECT_FIELD] = function (fieldConfig, fieldName, typeName, schema) {
                var _a, _b, _c, _d, _e;
                var mergeTypeConfig = (_a = newSubschemaConfig.merge) === null || _a === void 0 ? void 0 : _a[typeName];
                if (mergeTypeConfig == null) {
                    return undefined;
                }
                var computed = (_b = getDirective(schema, fieldConfig, computedDirectiveName)) === null || _b === void 0 ? void 0 : _b[0];
                if (computed == null) {
                    return undefined;
                }
                var selectionSet = computed['fields'] != null ? "{ " + computed['fields'] + " }" : computed['selectionSet'];
                if (selectionSet == null) {
                    return undefined;
                }
                mergeTypeConfig.fields = (_c = mergeTypeConfig.fields) !== null && _c !== void 0 ? _c : {};
                mergeTypeConfig.fields[fieldName] = (_d = mergeTypeConfig.fields[fieldName]) !== null && _d !== void 0 ? _d : {};
                var mergeFieldConfig = mergeTypeConfig.fields[fieldName];
                mergeFieldConfig.selectionSet = (_e = mergeFieldConfig.selectionSet) !== null && _e !== void 0 ? _e : selectionSet;
                mergeFieldConfig.computed = true;
                return undefined;
            },
            _a));
        return newSubschemaConfig;
    };
}
