import { __assign, __read, __spreadArray, __values } from "tslib";
import { getNamedType, getNullableType, isInterfaceType, isListType, isObjectType, isUnionType, Kind, parseValue, print, valueFromASTUntyped, } from 'graphql';
import { cloneSubschemaConfig } from '@graphql-tools/delegate';
import { getDirective, getImplementingTypes, MapperKind, mapSchema, mergeDeep, parseSelectionSet, } from '@graphql-tools/utils';
import { defaultStitchingDirectiveOptions } from './defaultStitchingDirectiveOptions';
import { parseMergeArgsExpr } from './parseMergeArgsExpr';
import { addProperty, getProperty, getProperties } from './properties';
import { stitchingDirectivesValidator } from './stitchingDirectivesValidator';
export function stitchingDirectivesTransformer(options) {
    if (options === void 0) { options = {}; }
    var _a = __assign(__assign({}, defaultStitchingDirectiveOptions), options), keyDirectiveName = _a.keyDirectiveName, computedDirectiveName = _a.computedDirectiveName, mergeDirectiveName = _a.mergeDirectiveName, canonicalDirectiveName = _a.canonicalDirectiveName, pathToDirectivesInExtensions = _a.pathToDirectivesInExtensions;
    return function (subschemaConfig) {
        var _a, _b;
        var _c, _d, _e, _f, _g, _h, _j, _k;
        var newSubschemaConfig = cloneSubschemaConfig(subschemaConfig);
        var selectionSetsByType = Object.create(null);
        var computedFieldSelectionSets = Object.create(null);
        var mergedTypesResolversInfo = Object.create(null);
        var canonicalTypesInfo = Object.create(null);
        var schema = subschemaConfig.schema;
        // gateway should also run validation
        stitchingDirectivesValidator(options)(schema);
        function setCanonicalDefinition(typeName, fieldName) {
            var _a;
            canonicalTypesInfo[typeName] = canonicalTypesInfo[typeName] || Object.create(null);
            if (fieldName) {
                var fields = (_a = canonicalTypesInfo[typeName].fields) !== null && _a !== void 0 ? _a : Object.create(null);
                canonicalTypesInfo[typeName].fields = fields;
                fields[fieldName] = true;
            }
            else {
                canonicalTypesInfo[typeName].canonical = true;
            }
        }
        mapSchema(schema, (_a = {},
            _a[MapperKind.OBJECT_TYPE] = function (type) {
                var _a, _b;
                var keyDirective = (_a = getDirective(schema, type, keyDirectiveName, pathToDirectivesInExtensions)) === null || _a === void 0 ? void 0 : _a[0];
                if (keyDirective != null) {
                    var selectionSet = parseSelectionSet(keyDirective['selectionSet'], { noLocation: true });
                    selectionSetsByType[type.name] = selectionSet;
                }
                var canonicalDirective = (_b = getDirective(schema, type, canonicalDirectiveName, pathToDirectivesInExtensions)) === null || _b === void 0 ? void 0 : _b[0];
                if (canonicalDirective != null) {
                    setCanonicalDefinition(type.name);
                }
                return undefined;
            },
            _a[MapperKind.OBJECT_FIELD] = function (fieldConfig, fieldName, typeName) {
                var _a, _b, _c;
                var computedDirective = (_a = getDirective(schema, fieldConfig, computedDirectiveName, pathToDirectivesInExtensions)) === null || _a === void 0 ? void 0 : _a[0];
                if (computedDirective != null) {
                    var selectionSet = parseSelectionSet(computedDirective['selectionSet'], { noLocation: true });
                    if (!computedFieldSelectionSets[typeName]) {
                        computedFieldSelectionSets[typeName] = Object.create(null);
                    }
                    computedFieldSelectionSets[typeName][fieldName] = selectionSet;
                }
                var mergeDirective = (_b = getDirective(schema, fieldConfig, mergeDirectiveName, pathToDirectivesInExtensions)) === null || _b === void 0 ? void 0 : _b[0];
                if ((mergeDirective === null || mergeDirective === void 0 ? void 0 : mergeDirective['keyField']) != null) {
                    var mergeDirectiveKeyField = mergeDirective['keyField'];
                    var selectionSet_1 = parseSelectionSet("{ " + mergeDirectiveKeyField + "}", { noLocation: true });
                    var typeNames_1 = mergeDirective['types'];
                    var returnType = getNamedType(fieldConfig.type);
                    forEachConcreteType(schema, returnType, typeNames_1, function (typeName) {
                        if (typeNames_1 == null || typeNames_1.includes(typeName)) {
                            var existingSelectionSet = selectionSetsByType[typeName];
                            selectionSetsByType[typeName] = existingSelectionSet
                                ? mergeSelectionSets(existingSelectionSet, selectionSet_1)
                                : selectionSet_1;
                        }
                    });
                }
                var canonicalDirective = (_c = getDirective(schema, fieldConfig, canonicalDirectiveName, pathToDirectivesInExtensions)) === null || _c === void 0 ? void 0 : _c[0];
                if (canonicalDirective != null) {
                    setCanonicalDefinition(typeName, fieldName);
                }
                return undefined;
            },
            _a[MapperKind.INTERFACE_TYPE] = function (type) {
                var _a;
                var canonicalDirective = (_a = getDirective(schema, type, canonicalDirectiveName, pathToDirectivesInExtensions)) === null || _a === void 0 ? void 0 : _a[0];
                if (canonicalDirective) {
                    setCanonicalDefinition(type.name);
                }
                return undefined;
            },
            _a[MapperKind.INTERFACE_FIELD] = function (fieldConfig, fieldName, typeName) {
                var _a;
                var canonicalDirective = (_a = getDirective(schema, fieldConfig, canonicalDirectiveName, pathToDirectivesInExtensions)) === null || _a === void 0 ? void 0 : _a[0];
                if (canonicalDirective) {
                    setCanonicalDefinition(typeName, fieldName);
                }
                return undefined;
            },
            _a[MapperKind.INPUT_OBJECT_TYPE] = function (type) {
                var _a;
                var canonicalDirective = (_a = getDirective(schema, type, canonicalDirectiveName, pathToDirectivesInExtensions)) === null || _a === void 0 ? void 0 : _a[0];
                if (canonicalDirective) {
                    setCanonicalDefinition(type.name);
                }
                return undefined;
            },
            _a[MapperKind.INPUT_OBJECT_FIELD] = function (inputFieldConfig, fieldName, typeName) {
                var _a;
                var canonicalDirective = (_a = getDirective(schema, inputFieldConfig, canonicalDirectiveName, pathToDirectivesInExtensions)) === null || _a === void 0 ? void 0 : _a[0];
                if (canonicalDirective != null) {
                    setCanonicalDefinition(typeName, fieldName);
                }
                return undefined;
            },
            _a[MapperKind.UNION_TYPE] = function (type) {
                var _a;
                var canonicalDirective = (_a = getDirective(schema, type, canonicalDirectiveName, pathToDirectivesInExtensions)) === null || _a === void 0 ? void 0 : _a[0];
                if (canonicalDirective != null) {
                    setCanonicalDefinition(type.name);
                }
                return undefined;
            },
            _a[MapperKind.ENUM_TYPE] = function (type) {
                var _a;
                var canonicalDirective = (_a = getDirective(schema, type, canonicalDirectiveName, pathToDirectivesInExtensions)) === null || _a === void 0 ? void 0 : _a[0];
                if (canonicalDirective != null) {
                    setCanonicalDefinition(type.name);
                }
                return undefined;
            },
            _a[MapperKind.SCALAR_TYPE] = function (type) {
                var _a;
                var canonicalDirective = (_a = getDirective(schema, type, canonicalDirectiveName, pathToDirectivesInExtensions)) === null || _a === void 0 ? void 0 : _a[0];
                if (canonicalDirective != null) {
                    setCanonicalDefinition(type.name);
                }
                return undefined;
            },
            _a));
        if (subschemaConfig.merge) {
            for (var typeName in subschemaConfig.merge) {
                var mergedTypeConfig = subschemaConfig.merge[typeName];
                if (mergedTypeConfig.selectionSet) {
                    var selectionSet = parseSelectionSet(mergedTypeConfig.selectionSet, { noLocation: true });
                    if (selectionSet) {
                        if (selectionSetsByType[typeName]) {
                            selectionSetsByType[typeName] = mergeSelectionSets(selectionSetsByType[typeName], selectionSet);
                        }
                        else {
                            selectionSetsByType[typeName] = selectionSet;
                        }
                    }
                }
                if (mergedTypeConfig.fields) {
                    for (var fieldName in mergedTypeConfig.fields) {
                        var fieldConfig = mergedTypeConfig.fields[fieldName];
                        if (!fieldConfig.selectionSet)
                            continue;
                        var selectionSet = parseSelectionSet(fieldConfig.selectionSet, { noLocation: true });
                        if (selectionSet) {
                            if ((_c = computedFieldSelectionSets[typeName]) === null || _c === void 0 ? void 0 : _c[fieldName]) {
                                computedFieldSelectionSets[typeName][fieldName] = mergeSelectionSets(computedFieldSelectionSets[typeName][fieldName], selectionSet);
                            }
                            else {
                                if (computedFieldSelectionSets[typeName] == null) {
                                    computedFieldSelectionSets[typeName] = Object.create(null);
                                }
                                computedFieldSelectionSets[typeName][fieldName] = selectionSet;
                            }
                        }
                    }
                }
            }
        }
        var allSelectionSetsByType = Object.create(null);
        for (var typeName in selectionSetsByType) {
            allSelectionSetsByType[typeName] = allSelectionSetsByType[typeName] || [];
            var selectionSet = selectionSetsByType[typeName];
            allSelectionSetsByType[typeName].push(selectionSet);
        }
        for (var typeName in computedFieldSelectionSets) {
            var selectionSets = computedFieldSelectionSets[typeName];
            for (var i in selectionSets) {
                allSelectionSetsByType[typeName] = allSelectionSetsByType[typeName] || [];
                var selectionSet = selectionSets[i];
                allSelectionSetsByType[typeName].push(selectionSet);
            }
        }
        mapSchema(schema, (_b = {},
            _b[MapperKind.OBJECT_FIELD] = function objectFieldMapper(fieldConfig, fieldName) {
                var e_1, _a;
                var _b, _c;
                var mergeDirective = (_b = getDirective(schema, fieldConfig, mergeDirectiveName, pathToDirectivesInExtensions)) === null || _b === void 0 ? void 0 : _b[0];
                if (mergeDirective != null) {
                    var returnType = getNullableType(fieldConfig.type);
                    var returnsList_1 = isListType(returnType);
                    var namedType = getNamedType(returnType);
                    var mergeArgsExpr_1 = mergeDirective['argsExpr'];
                    if (mergeArgsExpr_1 == null) {
                        var key = mergeDirective['key'];
                        var keyField = mergeDirective['keyField'];
                        var keyExpr = key != null ? buildKeyExpr(key) : keyField != null ? "$key." + keyField : '$key';
                        var keyArg = mergeDirective['keyArg'];
                        var argNames = keyArg == null ? [Object.keys((_c = fieldConfig.args) !== null && _c !== void 0 ? _c : {})[0]] : keyArg.split('.');
                        var lastArgName = argNames.pop();
                        mergeArgsExpr_1 = returnsList_1 ? lastArgName + ": [[" + keyExpr + "]]" : lastArgName + ": " + keyExpr;
                        try {
                            for (var _d = __values(argNames.reverse()), _e = _d.next(); !_e.done; _e = _d.next()) {
                                var argName = _e.value;
                                mergeArgsExpr_1 = argName + ": { " + mergeArgsExpr_1 + " }";
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                    }
                    var typeNames = mergeDirective['types'];
                    forEachConcreteTypeName(namedType, schema, typeNames, function generateResolveInfo(typeName) {
                        var parsedMergeArgsExpr = parseMergeArgsExpr(mergeArgsExpr_1, allSelectionSetsByType[typeName] == null
                            ? undefined
                            : mergeSelectionSets.apply(void 0, __spreadArray([], __read(allSelectionSetsByType[typeName]), false)));
                        var additionalArgs = mergeDirective['additionalArgs'];
                        if (additionalArgs != null) {
                            parsedMergeArgsExpr.args = mergeDeep([
                                parsedMergeArgsExpr.args,
                                valueFromASTUntyped(parseValue("{ " + additionalArgs + " }", { noLocation: true })),
                            ]);
                        }
                        mergedTypesResolversInfo[typeName] = __assign({ fieldName: fieldName, returnsList: returnsList_1 }, parsedMergeArgsExpr);
                    });
                }
                return undefined;
            },
            _b));
        for (var typeName in selectionSetsByType) {
            var selectionSet = selectionSetsByType[typeName];
            var mergeConfig = (_d = newSubschemaConfig.merge) !== null && _d !== void 0 ? _d : Object.create(null);
            newSubschemaConfig.merge = mergeConfig;
            if (mergeConfig[typeName] == null) {
                newSubschemaConfig.merge[typeName] = Object.create(null);
            }
            var mergeTypeConfig = mergeConfig[typeName];
            mergeTypeConfig.selectionSet = print(selectionSet);
        }
        for (var typeName in computedFieldSelectionSets) {
            var selectionSets = computedFieldSelectionSets[typeName];
            var mergeConfig = (_e = newSubschemaConfig.merge) !== null && _e !== void 0 ? _e : Object.create(null);
            newSubschemaConfig.merge = mergeConfig;
            if (mergeConfig[typeName] == null) {
                mergeConfig[typeName] = Object.create(null);
            }
            var mergeTypeConfig = newSubschemaConfig.merge[typeName];
            var mergeTypeConfigFields = (_f = mergeTypeConfig.fields) !== null && _f !== void 0 ? _f : Object.create(null);
            mergeTypeConfig.fields = mergeTypeConfigFields;
            for (var fieldName in selectionSets) {
                var selectionSet = selectionSets[fieldName];
                var fieldConfig = (_g = mergeTypeConfigFields[fieldName]) !== null && _g !== void 0 ? _g : Object.create(null);
                mergeTypeConfigFields[fieldName] = fieldConfig;
                fieldConfig.selectionSet = print(selectionSet);
                fieldConfig.computed = true;
            }
        }
        for (var typeName in mergedTypesResolversInfo) {
            var mergedTypeResolverInfo = mergedTypesResolversInfo[typeName];
            var mergeConfig = (_h = newSubschemaConfig.merge) !== null && _h !== void 0 ? _h : Object.create(null);
            newSubschemaConfig.merge = mergeConfig;
            if (newSubschemaConfig.merge[typeName] == null) {
                newSubschemaConfig.merge[typeName] = Object.create(null);
            }
            var mergeTypeConfig = newSubschemaConfig.merge[typeName];
            mergeTypeConfig.fieldName = mergedTypeResolverInfo.fieldName;
            if (mergedTypeResolverInfo.returnsList) {
                mergeTypeConfig.key = generateKeyFn(mergedTypeResolverInfo);
                mergeTypeConfig.argsFromKeys = generateArgsFromKeysFn(mergedTypeResolverInfo);
            }
            else {
                mergeTypeConfig.args = generateArgsFn(mergedTypeResolverInfo);
            }
        }
        for (var typeName in canonicalTypesInfo) {
            var canonicalTypeInfo = canonicalTypesInfo[typeName];
            var mergeConfig = (_j = newSubschemaConfig.merge) !== null && _j !== void 0 ? _j : Object.create(null);
            newSubschemaConfig.merge = mergeConfig;
            if (newSubschemaConfig.merge[typeName] == null) {
                newSubschemaConfig.merge[typeName] = Object.create(null);
            }
            var mergeTypeConfig = newSubschemaConfig.merge[typeName];
            if (canonicalTypeInfo.canonical) {
                mergeTypeConfig.canonical = true;
            }
            if (canonicalTypeInfo.fields) {
                var mergeTypeConfigFields = (_k = mergeTypeConfig.fields) !== null && _k !== void 0 ? _k : Object.create(null);
                mergeTypeConfig.fields = mergeTypeConfigFields;
                for (var fieldName in canonicalTypeInfo.fields) {
                    if (mergeTypeConfigFields[fieldName] == null) {
                        mergeTypeConfigFields[fieldName] = Object.create(null);
                    }
                    mergeTypeConfigFields[fieldName].canonical = true;
                }
            }
        }
        return newSubschemaConfig;
    };
}
function forEachConcreteType(schema, type, typeNames, fn) {
    var e_2, _a, e_3, _b;
    if (isInterfaceType(type)) {
        try {
            for (var _c = __values(getImplementingTypes(type.name, schema)), _d = _c.next(); !_d.done; _d = _c.next()) {
                var typeName = _d.value;
                if (typeNames == null || typeNames.includes(typeName)) {
                    fn(typeName);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    else if (isUnionType(type)) {
        try {
            for (var _e = __values(type.getTypes()), _f = _e.next(); !_f.done; _f = _e.next()) {
                var typeName = _f.value.name;
                if (typeNames == null || typeNames.includes(typeName)) {
                    fn(typeName);
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
            }
            finally { if (e_3) throw e_3.error; }
        }
    }
    else if (isObjectType(type)) {
        fn(type.name);
    }
}
function generateKeyFn(mergedTypeResolverInfo) {
    return function keyFn(originalResult) {
        return getProperties(originalResult, mergedTypeResolverInfo.usedProperties);
    };
}
function generateArgsFromKeysFn(mergedTypeResolverInfo) {
    var expansions = mergedTypeResolverInfo.expansions, args = mergedTypeResolverInfo.args;
    return function generateArgsFromKeys(keys) {
        var e_4, _a, e_5, _b, e_6, _c;
        var newArgs = mergeDeep([{}, args]);
        if (expansions) {
            try {
                for (var expansions_1 = __values(expansions), expansions_1_1 = expansions_1.next(); !expansions_1_1.done; expansions_1_1 = expansions_1.next()) {
                    var expansion = expansions_1_1.value;
                    var mappingInstructions = expansion.mappingInstructions;
                    var expanded = [];
                    try {
                        for (var keys_1 = (e_5 = void 0, __values(keys)), keys_1_1 = keys_1.next(); !keys_1_1.done; keys_1_1 = keys_1.next()) {
                            var key = keys_1_1.value;
                            var newValue = mergeDeep([{}, expansion.valuePath]);
                            try {
                                for (var mappingInstructions_1 = (e_6 = void 0, __values(mappingInstructions)), mappingInstructions_1_1 = mappingInstructions_1.next(); !mappingInstructions_1_1.done; mappingInstructions_1_1 = mappingInstructions_1.next()) {
                                    var _d = mappingInstructions_1_1.value, destinationPath = _d.destinationPath, sourcePath = _d.sourcePath;
                                    if (destinationPath.length) {
                                        addProperty(newValue, destinationPath, getProperty(key, sourcePath));
                                    }
                                    else {
                                        newValue = getProperty(key, sourcePath);
                                    }
                                }
                            }
                            catch (e_6_1) { e_6 = { error: e_6_1 }; }
                            finally {
                                try {
                                    if (mappingInstructions_1_1 && !mappingInstructions_1_1.done && (_c = mappingInstructions_1.return)) _c.call(mappingInstructions_1);
                                }
                                finally { if (e_6) throw e_6.error; }
                            }
                            expanded.push(newValue);
                        }
                    }
                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                    finally {
                        try {
                            if (keys_1_1 && !keys_1_1.done && (_b = keys_1.return)) _b.call(keys_1);
                        }
                        finally { if (e_5) throw e_5.error; }
                    }
                    addProperty(newArgs, expansion.valuePath, expanded);
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (expansions_1_1 && !expansions_1_1.done && (_a = expansions_1.return)) _a.call(expansions_1);
                }
                finally { if (e_4) throw e_4.error; }
            }
        }
        return newArgs;
    };
}
function generateArgsFn(mergedTypeResolverInfo) {
    var mappingInstructions = mergedTypeResolverInfo.mappingInstructions, args = mergedTypeResolverInfo.args, usedProperties = mergedTypeResolverInfo.usedProperties;
    return function generateArgs(originalResult) {
        var e_7, _a;
        var newArgs = mergeDeep([{}, args]);
        var filteredResult = getProperties(originalResult, usedProperties);
        if (mappingInstructions) {
            try {
                for (var mappingInstructions_2 = __values(mappingInstructions), mappingInstructions_2_1 = mappingInstructions_2.next(); !mappingInstructions_2_1.done; mappingInstructions_2_1 = mappingInstructions_2.next()) {
                    var mappingInstruction = mappingInstructions_2_1.value;
                    var destinationPath = mappingInstruction.destinationPath, sourcePath = mappingInstruction.sourcePath;
                    addProperty(newArgs, destinationPath, getProperty(filteredResult, sourcePath));
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (mappingInstructions_2_1 && !mappingInstructions_2_1.done && (_a = mappingInstructions_2.return)) _a.call(mappingInstructions_2);
                }
                finally { if (e_7) throw e_7.error; }
            }
        }
        return newArgs;
    };
}
function buildKeyExpr(key) {
    var e_8, _a, _b, e_9, _c, _d;
    var mergedObject = {};
    try {
        for (var key_1 = __values(key), key_1_1 = key_1.next(); !key_1_1.done; key_1_1 = key_1.next()) {
            var keyDef = key_1_1.value;
            var _e = __read(keyDef.split(':'), 2), aliasOrKeyPath = _e[0], keyPath = _e[1];
            var aliasPath = void 0;
            if (keyPath == null) {
                keyPath = aliasPath = aliasOrKeyPath;
            }
            else {
                aliasPath = aliasOrKeyPath;
            }
            var aliasParts = aliasPath.split('.');
            var lastAliasPart = aliasParts.pop();
            if (lastAliasPart == null) {
                throw new Error("Key \"" + key + "\" is invalid, no path provided.");
            }
            var object = (_b = {}, _b[lastAliasPart] = "$key." + keyPath, _b);
            try {
                for (var _f = (e_9 = void 0, __values(aliasParts.reverse())), _g = _f.next(); !_g.done; _g = _f.next()) {
                    var aliasPart = _g.value;
                    object = (_d = {}, _d[aliasPart] = object, _d);
                }
            }
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (_g && !_g.done && (_c = _f.return)) _c.call(_f);
                }
                finally { if (e_9) throw e_9.error; }
            }
            mergedObject = mergeDeep([mergedObject, object]);
        }
    }
    catch (e_8_1) { e_8 = { error: e_8_1 }; }
    finally {
        try {
            if (key_1_1 && !key_1_1.done && (_a = key_1.return)) _a.call(key_1);
        }
        finally { if (e_8) throw e_8.error; }
    }
    return JSON.stringify(mergedObject).replace(/"/g, '');
}
function mergeSelectionSets() {
    var e_10, _a, e_11, _b;
    var selectionSets = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        selectionSets[_i] = arguments[_i];
    }
    var normalizedSelections = Object.create(null);
    try {
        for (var selectionSets_1 = __values(selectionSets), selectionSets_1_1 = selectionSets_1.next(); !selectionSets_1_1.done; selectionSets_1_1 = selectionSets_1.next()) {
            var selectionSet = selectionSets_1_1.value;
            try {
                for (var _c = (e_11 = void 0, __values(selectionSet.selections)), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var selection = _d.value;
                    var normalizedSelection = print(selection);
                    normalizedSelections[normalizedSelection] = selection;
                }
            }
            catch (e_11_1) { e_11 = { error: e_11_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                }
                finally { if (e_11) throw e_11.error; }
            }
        }
    }
    catch (e_10_1) { e_10 = { error: e_10_1 }; }
    finally {
        try {
            if (selectionSets_1_1 && !selectionSets_1_1.done && (_a = selectionSets_1.return)) _a.call(selectionSets_1);
        }
        finally { if (e_10) throw e_10.error; }
    }
    var newSelectionSet = {
        kind: Kind.SELECTION_SET,
        selections: Object.values(normalizedSelections),
    };
    return newSelectionSet;
}
function forEachConcreteTypeName(returnType, schema, typeNames, fn) {
    var e_12, _a, e_13, _b;
    if (isInterfaceType(returnType)) {
        try {
            for (var _c = __values(getImplementingTypes(returnType.name, schema)), _d = _c.next(); !_d.done; _d = _c.next()) {
                var typeName = _d.value;
                if (typeNames == null || typeNames.includes(typeName)) {
                    fn(typeName);
                }
            }
        }
        catch (e_12_1) { e_12 = { error: e_12_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_12) throw e_12.error; }
        }
    }
    else if (isUnionType(returnType)) {
        try {
            for (var _e = __values(returnType.getTypes()), _f = _e.next(); !_f.done; _f = _e.next()) {
                var type = _f.value;
                if (typeNames == null || typeNames.includes(type.name)) {
                    fn(type.name);
                }
            }
        }
        catch (e_13_1) { e_13 = { error: e_13_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
            }
            finally { if (e_13) throw e_13.error; }
        }
    }
    else if (isObjectType(returnType) && (typeNames == null || typeNames.includes(returnType.name))) {
        fn(returnType.name);
    }
}
