import { cloneSubschemaConfig } from '@graphql-tools/delegate';
export function splitMergedTypeEntryPointsTransformer(subschemaConfig) {
    var _a, _b, _c, _d;
    if (!subschemaConfig.merge)
        return [subschemaConfig];
    var maxEntryPoints = Object.values(subschemaConfig.merge).reduce(function (max, mergedTypeConfig) {
        var _a, _b;
        return Math.max(max, (_b = (_a = mergedTypeConfig === null || mergedTypeConfig === void 0 ? void 0 : mergedTypeConfig.entryPoints) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0);
    }, 0);
    if (maxEntryPoints === 0)
        return [subschemaConfig];
    var subschemaPermutations = [];
    for (var i = 0; i < maxEntryPoints; i += 1) {
        var subschemaPermutation = cloneSubschemaConfig(subschemaConfig);
        var mergedTypesCopy = (_a = subschemaPermutation.merge) !== null && _a !== void 0 ? _a : Object.create(null);
        var currentMerge = mergedTypesCopy;
        if (i > 0) {
            subschemaPermutation.merge = currentMerge = Object.create(null);
        }
        for (var typeName in mergedTypesCopy) {
            var mergedTypeConfig = mergedTypesCopy[typeName];
            var mergedTypeEntryPoint = (_b = mergedTypeConfig === null || mergedTypeConfig === void 0 ? void 0 : mergedTypeConfig.entryPoints) === null || _b === void 0 ? void 0 : _b[i];
            if (mergedTypeEntryPoint) {
                if ((_d = (_c = mergedTypeConfig.selectionSet) !== null && _c !== void 0 ? _c : mergedTypeConfig.fieldName) !== null && _d !== void 0 ? _d : mergedTypeConfig.resolve) {
                    throw new Error("Merged type " + typeName + " may not define entryPoints in addition to selectionSet, fieldName, or resolve");
                }
                Object.assign(mergedTypeConfig, mergedTypeEntryPoint);
                delete mergedTypeConfig.entryPoints;
                if (i > 0) {
                    delete mergedTypeConfig.canonical;
                    if (mergedTypeConfig.fields != null) {
                        for (var mergedFieldName in mergedTypeConfig.fields) {
                            var mergedFieldConfig = mergedTypeConfig.fields[mergedFieldName];
                            delete mergedFieldConfig.canonical;
                        }
                    }
                }
                currentMerge[typeName] = mergedTypeConfig;
            }
        }
        subschemaPermutations.push(subschemaPermutation);
    }
    return subschemaPermutations;
}
