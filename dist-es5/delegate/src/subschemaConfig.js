import { __assign, __read, __spreadArray } from "tslib";
export function isSubschemaConfig(value) {
    return Boolean(value === null || value === void 0 ? void 0 : value.schema);
}
export function cloneSubschemaConfig(subschemaConfig) {
    var _a, _b;
    var newSubschemaConfig = __assign(__assign({}, subschemaConfig), { transforms: subschemaConfig.transforms != null ? __spreadArray([], __read(subschemaConfig.transforms), false) : undefined });
    if (newSubschemaConfig.merge != null) {
        newSubschemaConfig.merge = __assign({}, subschemaConfig.merge);
        for (var typeName in newSubschemaConfig.merge) {
            var mergedTypeConfig = (newSubschemaConfig.merge[typeName] = __assign({}, ((_b = (_a = subschemaConfig.merge) === null || _a === void 0 ? void 0 : _a[typeName]) !== null && _b !== void 0 ? _b : {})));
            if (mergedTypeConfig.entryPoints != null) {
                mergedTypeConfig.entryPoints = mergedTypeConfig.entryPoints.map(function (entryPoint) { return (__assign({}, entryPoint)); });
            }
            if (mergedTypeConfig.fields != null) {
                var fields = (mergedTypeConfig.fields = __assign({}, mergedTypeConfig.fields));
                for (var fieldName in fields) {
                    fields[fieldName] = __assign({}, fields[fieldName]);
                }
            }
        }
    }
    return newSubschemaConfig;
}
