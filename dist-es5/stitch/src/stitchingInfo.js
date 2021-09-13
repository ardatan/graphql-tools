import { __assign, __read, __values } from "tslib";
import { GraphQLSchema, Kind, isObjectType, getNamedType, print, isInterfaceType, isLeafType, isInputObjectType, isUnionType, } from 'graphql';
import { collectFields, parseSelectionSet, isSome } from '@graphql-tools/utils';
import { createMergedTypeResolver } from './createMergedTypeResolver';
import { createDelegationPlanBuilder } from './createDelegationPlanBuilder';
export function createStitchingInfo(subschemaMap, typeCandidates, mergeTypes) {
    var mergedTypes = createMergedTypes(typeCandidates, mergeTypes);
    return {
        subschemaMap: subschemaMap,
        fieldNodesByType: Object.create(null),
        fieldNodesByField: Object.create(null),
        dynamicSelectionSetsByField: Object.create(null),
        mergedTypes: mergedTypes,
    };
}
function createMergedTypes(typeCandidates, mergeTypes) {
    var _a, _b;
    var mergedTypes = Object.create(null);
    var _loop_1 = function (typeName) {
        var e_1, _c, e_2, _d;
        if (typeCandidates[typeName].length > 1 &&
            (isObjectType(typeCandidates[typeName][0].type) || isInterfaceType(typeCandidates[typeName][0].type))) {
            var typeCandidatesWithMergedTypeConfig = typeCandidates[typeName].filter(function (typeCandidate) {
                return typeCandidate.transformedSubschema != null &&
                    typeCandidate.transformedSubschema.merge != null &&
                    typeName in typeCandidate.transformedSubschema.merge;
            });
            if (mergeTypes === true ||
                (typeof mergeTypes === 'function' && mergeTypes(typeCandidates[typeName], typeName)) ||
                (Array.isArray(mergeTypes) && mergeTypes.includes(typeName)) ||
                typeCandidatesWithMergedTypeConfig.length) {
                var targetSubschemas = [];
                var typeMaps = new Map();
                var supportedBySubschemas = Object.create({});
                var selectionSets = new Map();
                var fieldSelectionSets = new Map();
                var resolvers = new Map();
                var _loop_2 = function (typeCandidate) {
                    var subschema = typeCandidate.transformedSubschema;
                    if (subschema == null) {
                        return "continue";
                    }
                    typeMaps.set(subschema, subschema.transformedSchema.getTypeMap());
                    var mergedTypeConfig = (_a = subschema === null || subschema === void 0 ? void 0 : subschema.merge) === null || _a === void 0 ? void 0 : _a[typeName];
                    if (mergedTypeConfig == null) {
                        return "continue";
                    }
                    if (mergedTypeConfig.selectionSet) {
                        var selectionSet_1 = parseSelectionSet(mergedTypeConfig.selectionSet, { noLocation: true });
                        selectionSets.set(subschema, selectionSet_1);
                    }
                    if (mergedTypeConfig.fields) {
                        var parsedFieldSelectionSets = Object.create(null);
                        for (var fieldName in mergedTypeConfig.fields) {
                            if (mergedTypeConfig.fields[fieldName].selectionSet) {
                                var rawFieldSelectionSet = mergedTypeConfig.fields[fieldName].selectionSet;
                                parsedFieldSelectionSets[fieldName] = rawFieldSelectionSet
                                    ? parseSelectionSet(rawFieldSelectionSet, { noLocation: true })
                                    : undefined;
                            }
                        }
                        fieldSelectionSets.set(subschema, parsedFieldSelectionSets);
                    }
                    var resolver = (_b = mergedTypeConfig.resolve) !== null && _b !== void 0 ? _b : createMergedTypeResolver(mergedTypeConfig);
                    if (resolver == null) {
                        return "continue";
                    }
                    var keyFn = mergedTypeConfig.key;
                    resolvers.set(subschema, keyFn
                        ? function (originalResult, context, info, subschema, selectionSet) {
                            var key = keyFn(originalResult);
                            return resolver(originalResult, context, info, subschema, selectionSet, key);
                        }
                        : resolver);
                    targetSubschemas.push(subschema);
                    var type = subschema.transformedSchema.getType(typeName);
                    var fieldMap = type.getFields();
                    var selectionSet = selectionSets.get(subschema);
                    for (var fieldName in fieldMap) {
                        var field = fieldMap[fieldName];
                        var fieldType = getNamedType(field.type);
                        if (selectionSet && isLeafType(fieldType) && selectionSetContainsTopLevelField(selectionSet, fieldName)) {
                            continue;
                        }
                        if (!(fieldName in supportedBySubschemas)) {
                            supportedBySubschemas[fieldName] = [];
                        }
                        supportedBySubschemas[fieldName].push(subschema);
                    }
                };
                try {
                    for (var _e = (e_1 = void 0, __values(typeCandidates[typeName])), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var typeCandidate = _f.value;
                        _loop_2(typeCandidate);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_c = _e.return)) _c.call(_e);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                var sourceSubschemas = typeCandidates[typeName]
                    .map(function (typeCandidate) { return typeCandidate === null || typeCandidate === void 0 ? void 0 : typeCandidate.transformedSubschema; })
                    .filter(isSome);
                var targetSubschemasBySubschema = new Map();
                var _loop_3 = function (subschema) {
                    var filteredSubschemas = targetSubschemas.filter(function (s) { return s !== subschema; });
                    if (filteredSubschemas.length) {
                        targetSubschemasBySubschema.set(subschema, filteredSubschemas);
                    }
                };
                try {
                    for (var sourceSubschemas_1 = (e_2 = void 0, __values(sourceSubschemas)), sourceSubschemas_1_1 = sourceSubschemas_1.next(); !sourceSubschemas_1_1.done; sourceSubschemas_1_1 = sourceSubschemas_1.next()) {
                        var subschema = sourceSubschemas_1_1.value;
                        _loop_3(subschema);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (sourceSubschemas_1_1 && !sourceSubschemas_1_1.done && (_d = sourceSubschemas_1.return)) _d.call(sourceSubschemas_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                mergedTypes[typeName] = {
                    typeName: typeName,
                    targetSubschemas: targetSubschemasBySubschema,
                    typeMaps: typeMaps,
                    selectionSets: selectionSets,
                    fieldSelectionSets: fieldSelectionSets,
                    uniqueFields: Object.create({}),
                    nonUniqueFields: Object.create({}),
                    resolvers: resolvers,
                };
                mergedTypes[typeName].delegationPlanBuilder = createDelegationPlanBuilder(mergedTypes[typeName]);
                for (var fieldName in supportedBySubschemas) {
                    if (supportedBySubschemas[fieldName].length === 1) {
                        mergedTypes[typeName].uniqueFields[fieldName] = supportedBySubschemas[fieldName][0];
                    }
                    else {
                        mergedTypes[typeName].nonUniqueFields[fieldName] = supportedBySubschemas[fieldName];
                    }
                }
            }
        }
    };
    for (var typeName in typeCandidates) {
        _loop_1(typeName);
    }
    return mergedTypes;
}
export function completeStitchingInfo(stitchingInfo, resolvers, schema) {
    var e_3, _a, e_4, _b, e_5, _c, e_6, _d, e_7, _e, e_8, _f;
    var fieldNodesByType = stitchingInfo.fieldNodesByType, fieldNodesByField = stitchingInfo.fieldNodesByField, dynamicSelectionSetsByField = stitchingInfo.dynamicSelectionSetsByField, mergedTypes = stitchingInfo.mergedTypes;
    // must add __typename to query and mutation root types to handle type merging with nested root types
    // cannot add __typename to subscription root types, but they cannot be nested
    var rootTypes = [schema.getQueryType(), schema.getMutationType()];
    try {
        for (var rootTypes_1 = __values(rootTypes), rootTypes_1_1 = rootTypes_1.next(); !rootTypes_1_1.done; rootTypes_1_1 = rootTypes_1.next()) {
            var rootType = rootTypes_1_1.value;
            if (rootType) {
                fieldNodesByType[rootType.name] = [
                    parseSelectionSet('{ __typename }', { noLocation: true }).selections[0],
                ];
            }
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (rootTypes_1_1 && !rootTypes_1_1.done && (_a = rootTypes_1.return)) _a.call(rootTypes_1);
        }
        finally { if (e_3) throw e_3.error; }
    }
    var selectionSetsByField = Object.create(null);
    for (var typeName in mergedTypes) {
        var mergedTypeInfo = mergedTypes[typeName];
        if (mergedTypeInfo.selectionSets == null && mergedTypeInfo.fieldSelectionSets == null) {
            continue;
        }
        try {
            for (var _g = (e_4 = void 0, __values(mergedTypeInfo.selectionSets)), _h = _g.next(); !_h.done; _h = _g.next()) {
                var _j = __read(_h.value, 2), subschemaConfig = _j[0], selectionSet = _j[1];
                var schema_1 = subschemaConfig.transformedSchema;
                var type = schema_1.getType(typeName);
                var fields = type.getFields();
                for (var fieldName in fields) {
                    var field = fields[fieldName];
                    var fieldType = getNamedType(field.type);
                    if (selectionSet && isLeafType(fieldType) && selectionSetContainsTopLevelField(selectionSet, fieldName)) {
                        continue;
                    }
                    updateSelectionSetMap(selectionSetsByField, typeName, fieldName, selectionSet, true);
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
            }
            finally { if (e_4) throw e_4.error; }
        }
        try {
            for (var _k = (e_5 = void 0, __values(mergedTypeInfo.fieldSelectionSets)), _l = _k.next(); !_l.done; _l = _k.next()) {
                var _m = __read(_l.value, 2), selectionSetFieldMap = _m[1];
                for (var fieldName in selectionSetFieldMap) {
                    var selectionSet = selectionSetFieldMap[fieldName];
                    updateSelectionSetMap(selectionSetsByField, typeName, fieldName, selectionSet, true);
                }
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_l && !_l.done && (_c = _k.return)) _c.call(_k);
            }
            finally { if (e_5) throw e_5.error; }
        }
    }
    for (var typeName in resolvers) {
        var type = schema.getType(typeName);
        if (type === undefined || isLeafType(type) || isInputObjectType(type) || isUnionType(type)) {
            continue;
        }
        var resolver = resolvers[typeName];
        for (var fieldName in resolver) {
            var field = resolver[fieldName];
            if (typeof field.selectionSet === 'function') {
                if (!(typeName in dynamicSelectionSetsByField)) {
                    dynamicSelectionSetsByField[typeName] = Object.create(null);
                }
                if (!(fieldName in dynamicSelectionSetsByField[typeName])) {
                    dynamicSelectionSetsByField[typeName][fieldName] = [];
                }
                dynamicSelectionSetsByField[typeName][fieldName].push(field.selectionSet);
            }
            else if (field.selectionSet) {
                var selectionSet = parseSelectionSet(field.selectionSet, { noLocation: true });
                updateSelectionSetMap(selectionSetsByField, typeName, fieldName, selectionSet);
            }
        }
    }
    var variableValues = Object.create(null);
    var fragments = Object.create(null);
    var fieldNodeMap = Object.create(null);
    for (var typeName in selectionSetsByField) {
        var type = schema.getType(typeName);
        for (var fieldName in selectionSetsByField[typeName]) {
            try {
                for (var _o = (e_6 = void 0, __values(selectionSetsByField[typeName][fieldName])), _p = _o.next(); !_p.done; _p = _o.next()) {
                    var selectionSet = _p.value;
                    var fieldNodesByResponseKey = collectFields(schema, fragments, variableValues, type, selectionSet, new Map(), new Set());
                    try {
                        for (var fieldNodesByResponseKey_1 = (e_7 = void 0, __values(fieldNodesByResponseKey)), fieldNodesByResponseKey_1_1 = fieldNodesByResponseKey_1.next(); !fieldNodesByResponseKey_1_1.done; fieldNodesByResponseKey_1_1 = fieldNodesByResponseKey_1.next()) {
                            var _q = __read(fieldNodesByResponseKey_1_1.value, 2), fieldNodes = _q[1];
                            try {
                                for (var fieldNodes_1 = (e_8 = void 0, __values(fieldNodes)), fieldNodes_1_1 = fieldNodes_1.next(); !fieldNodes_1_1.done; fieldNodes_1_1 = fieldNodes_1.next()) {
                                    var fieldNode = fieldNodes_1_1.value;
                                    var key = print(fieldNode);
                                    if (fieldNodeMap[key] == null) {
                                        fieldNodeMap[key] = fieldNode;
                                        updateArrayMap(fieldNodesByField, typeName, fieldName, fieldNode);
                                    }
                                    else {
                                        updateArrayMap(fieldNodesByField, typeName, fieldName, fieldNodeMap[key]);
                                    }
                                }
                            }
                            catch (e_8_1) { e_8 = { error: e_8_1 }; }
                            finally {
                                try {
                                    if (fieldNodes_1_1 && !fieldNodes_1_1.done && (_f = fieldNodes_1.return)) _f.call(fieldNodes_1);
                                }
                                finally { if (e_8) throw e_8.error; }
                            }
                        }
                    }
                    catch (e_7_1) { e_7 = { error: e_7_1 }; }
                    finally {
                        try {
                            if (fieldNodesByResponseKey_1_1 && !fieldNodesByResponseKey_1_1.done && (_e = fieldNodesByResponseKey_1.return)) _e.call(fieldNodesByResponseKey_1);
                        }
                        finally { if (e_7) throw e_7.error; }
                    }
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_p && !_p.done && (_d = _o.return)) _d.call(_o);
                }
                finally { if (e_6) throw e_6.error; }
            }
        }
    }
    return stitchingInfo;
}
function updateSelectionSetMap(map, typeName, fieldName, selectionSet, includeTypename) {
    if (includeTypename) {
        var typenameSelectionSet = parseSelectionSet('{ __typename }', { noLocation: true });
        updateArrayMap(map, typeName, fieldName, selectionSet, typenameSelectionSet);
        return;
    }
    updateArrayMap(map, typeName, fieldName, selectionSet);
}
function updateArrayMap(map, typeName, fieldName, value, initialValue) {
    var _a;
    if (map[typeName] == null) {
        var initialItems = initialValue === undefined ? [value] : [initialValue, value];
        map[typeName] = (_a = {},
            _a[fieldName] = initialItems,
            _a);
    }
    else if (map[typeName][fieldName] == null) {
        var initialItems = initialValue === undefined ? [value] : [initialValue, value];
        map[typeName][fieldName] = initialItems;
    }
    else {
        map[typeName][fieldName].push(value);
    }
}
export function addStitchingInfo(stitchedSchema, stitchingInfo) {
    return new GraphQLSchema(__assign(__assign({}, stitchedSchema.toConfig()), { extensions: __assign(__assign({}, stitchedSchema.extensions), { stitchingInfo: stitchingInfo }) }));
}
export function selectionSetContainsTopLevelField(selectionSet, fieldName) {
    return selectionSet.selections.some(function (selection) { return selection.kind === Kind.FIELD && selection.name.value === fieldName; });
}
