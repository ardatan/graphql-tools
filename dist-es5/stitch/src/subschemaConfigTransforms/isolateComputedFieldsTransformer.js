import { __assign, __values } from "tslib";
import { isObjectType, isInterfaceType } from 'graphql';
import { getImplementingTypes, pruneSchema, filterSchema } from '@graphql-tools/utils';
import { TransformCompositeFields } from '@graphql-tools/wrap';
export function isolateComputedFieldsTransformer(subschemaConfig) {
    var _a, _b;
    if (subschemaConfig.merge == null) {
        return [subschemaConfig];
    }
    var baseSchemaTypes = Object.create(null);
    var isolatedSchemaTypes = Object.create(null);
    for (var typeName in subschemaConfig.merge) {
        var mergedTypeConfig = subschemaConfig.merge[typeName];
        baseSchemaTypes[typeName] = mergedTypeConfig;
        if (mergedTypeConfig.computedFields) {
            var mergeConfigFields = (_a = mergedTypeConfig.fields) !== null && _a !== void 0 ? _a : Object.create(null);
            for (var fieldName in mergedTypeConfig.computedFields) {
                var mergedFieldConfig = mergedTypeConfig.computedFields[fieldName];
                console.warn("The \"computedFields\" setting is deprecated. Update your @graphql-tools/stitching-directives package, and/or update static merged type config to \"" + typeName + ".fields." + fieldName + " = { selectionSet: '" + mergedFieldConfig.selectionSet + "', computed: true }\"");
                mergeConfigFields[fieldName] = __assign(__assign(__assign({}, ((_b = mergeConfigFields[fieldName]) !== null && _b !== void 0 ? _b : {})), mergedFieldConfig), { computed: true });
            }
            delete mergedTypeConfig.computedFields;
            mergedTypeConfig.fields = mergeConfigFields;
        }
        if (mergedTypeConfig.fields) {
            var baseFields = Object.create(null);
            var isolatedFields = Object.create(null);
            for (var fieldName in mergedTypeConfig.fields) {
                var mergedFieldConfig = mergedTypeConfig.fields[fieldName];
                if (mergedFieldConfig.computed && mergedFieldConfig.selectionSet) {
                    isolatedFields[fieldName] = mergedFieldConfig;
                }
                else if (mergedFieldConfig.computed) {
                    throw new Error("A selectionSet is required for computed field \"" + typeName + "." + fieldName + "\"");
                }
                else {
                    baseFields[fieldName] = mergedFieldConfig;
                }
            }
            var isolatedFieldCount = Object.keys(isolatedFields).length;
            var objectType = subschemaConfig.schema.getType(typeName);
            if (isolatedFieldCount && isolatedFieldCount !== Object.keys(objectType.getFields()).length) {
                baseSchemaTypes[typeName] = __assign(__assign({}, mergedTypeConfig), { fields: baseFields });
                isolatedSchemaTypes[typeName] = __assign(__assign({}, mergedTypeConfig), { fields: isolatedFields, canonical: undefined });
            }
        }
    }
    if (Object.keys(isolatedSchemaTypes).length) {
        return [
            filterBaseSubschema(__assign(__assign({}, subschemaConfig), { merge: baseSchemaTypes }), isolatedSchemaTypes),
            filterIsolatedSubschema(__assign(__assign({}, subschemaConfig), { merge: isolatedSchemaTypes })),
        ];
    }
    return [subschemaConfig];
}
function filterBaseSubschema(subschemaConfig, isolatedSchemaTypes) {
    var _a;
    var schema = subschemaConfig.schema;
    var typesForInterface = {};
    var filteredSchema = pruneSchema(filterSchema({
        schema: schema,
        objectFieldFilter: function (typeName, fieldName) { var _a, _b; return !((_b = (_a = isolatedSchemaTypes[typeName]) === null || _a === void 0 ? void 0 : _a.fields) === null || _b === void 0 ? void 0 : _b[fieldName]); },
        interfaceFieldFilter: function (typeName, fieldName) {
            if (!typesForInterface[typeName]) {
                typesForInterface[typeName] = getImplementingTypes(typeName, schema);
            }
            return !typesForInterface[typeName].some(function (implementingTypeName) { var _a, _b; return (_b = (_a = isolatedSchemaTypes[implementingTypeName]) === null || _a === void 0 ? void 0 : _a.fields) === null || _b === void 0 ? void 0 : _b[fieldName]; });
        },
    }));
    var filteredFields = {};
    for (var typeName in filteredSchema.getTypeMap()) {
        var type = filteredSchema.getType(typeName);
        if (isObjectType(type) || isInterfaceType(type)) {
            filteredFields[typeName] = { __typename: true };
            var fieldMap = type.getFields();
            for (var fieldName in fieldMap) {
                filteredFields[typeName][fieldName] = true;
            }
        }
    }
    var filteredSubschema = __assign(__assign({}, subschemaConfig), { merge: subschemaConfig.merge
            ? __assign({}, subschemaConfig.merge) : undefined, transforms: ((_a = subschemaConfig.transforms) !== null && _a !== void 0 ? _a : []).concat([
            new TransformCompositeFields(function (typeName, fieldName) { var _a; return (((_a = filteredFields[typeName]) === null || _a === void 0 ? void 0 : _a[fieldName]) ? undefined : null); }, function (typeName, fieldName) { var _a; return (((_a = filteredFields[typeName]) === null || _a === void 0 ? void 0 : _a[fieldName]) ? undefined : null); }),
        ]) });
    var remainingTypes = filteredSchema.getTypeMap();
    var mergeConfig = filteredSubschema.merge;
    if (mergeConfig) {
        for (var mergeType in mergeConfig) {
            if (!remainingTypes[mergeType]) {
                delete mergeConfig[mergeType];
            }
        }
        if (!Object.keys(mergeConfig).length) {
            delete filteredSubschema.merge;
        }
    }
    return filteredSubschema;
}
function filterIsolatedSubschema(subschemaConfig) {
    var e_1, _a, e_2, _b;
    var _c, _d, _e;
    var rootFields = {};
    for (var typeName in subschemaConfig.merge) {
        var mergedTypeConfig = subschemaConfig.merge[typeName];
        var entryPoints = (_c = mergedTypeConfig.entryPoints) !== null && _c !== void 0 ? _c : [mergedTypeConfig];
        try {
            for (var entryPoints_1 = (e_1 = void 0, __values(entryPoints)), entryPoints_1_1 = entryPoints_1.next(); !entryPoints_1_1.done; entryPoints_1_1 = entryPoints_1.next()) {
                var entryPoint = entryPoints_1_1.value;
                if (entryPoint.fieldName != null) {
                    rootFields[entryPoint.fieldName] = true;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (entryPoints_1_1 && !entryPoints_1_1.done && (_a = entryPoints_1.return)) _a.call(entryPoints_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    var interfaceFields = {};
    for (var typeName in subschemaConfig.merge) {
        var type = subschemaConfig.schema.getType(typeName);
        if (!type || !('getInterfaces' in type)) {
            throw new Error(typeName + " expected to have 'getInterfaces' method");
        }
        try {
            for (var _f = (e_2 = void 0, __values(type.getInterfaces())), _g = _f.next(); !_g.done; _g = _f.next()) {
                var int = _g.value;
                var intType = subschemaConfig.schema.getType(int.name);
                if (!intType || !('getFields' in intType)) {
                    throw new Error(int.name + " expected to have 'getFields' method");
                }
                for (var intFieldName in intType.getFields()) {
                    if ((_d = subschemaConfig.merge[typeName].fields) === null || _d === void 0 ? void 0 : _d[intFieldName]) {
                        interfaceFields[int.name] = interfaceFields[int.name] || {};
                        interfaceFields[int.name][intFieldName] = true;
                    }
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    var filteredSchema = pruneSchema(filterSchema({
        schema: subschemaConfig.schema,
        rootFieldFilter: function (operation, fieldName) { return operation === 'Query' && rootFields[fieldName] != null; },
        objectFieldFilter: function (typeName, fieldName) { var _a, _b; return ((_b = (_a = subschemaConfig.merge[typeName]) === null || _a === void 0 ? void 0 : _a.fields) === null || _b === void 0 ? void 0 : _b[fieldName]) != null; },
        interfaceFieldFilter: function (typeName, fieldName) { var _a; return ((_a = interfaceFields[typeName]) === null || _a === void 0 ? void 0 : _a[fieldName]) != null; },
    }));
    var filteredFields = {};
    for (var typeName in filteredSchema.getTypeMap()) {
        var type = filteredSchema.getType(typeName);
        if (isObjectType(type) || isInterfaceType(type)) {
            filteredFields[typeName] = { __typename: true };
            var fieldMap = type.getFields();
            for (var fieldName in fieldMap) {
                filteredFields[typeName][fieldName] = true;
            }
        }
    }
    return __assign(__assign({}, subschemaConfig), { transforms: ((_e = subschemaConfig.transforms) !== null && _e !== void 0 ? _e : []).concat([
            new TransformCompositeFields(function (typeName, fieldName) { var _a; return (((_a = filteredFields[typeName]) === null || _a === void 0 ? void 0 : _a[fieldName]) ? undefined : null); }, function (typeName, fieldName) { var _a; return (((_a = filteredFields[typeName]) === null || _a === void 0 ? void 0 : _a[fieldName]) ? undefined : null); }),
        ]) });
}
