import { __values } from "tslib";
import { Kind, getNamedType, } from 'graphql';
import { getFieldsNotInSubschema } from './getFieldsNotInSubschema';
import { memoize1, memoize2, memoize3, memoize5 } from '@graphql-tools/utils';
function calculateDelegationStage(mergedTypeInfo, sourceSubschemas, targetSubschemas, fieldNodes) {
    var e_1, _a, e_2, _b;
    var _c;
    var selectionSets = mergedTypeInfo.selectionSets, fieldSelectionSets = mergedTypeInfo.fieldSelectionSets, uniqueFields = mergedTypeInfo.uniqueFields, nonUniqueFields = mergedTypeInfo.nonUniqueFields;
    // 1.  calculate if possible to delegate to given subschema
    var proxiableSubschemas = [];
    var nonProxiableSubschemas = [];
    var _loop_1 = function (t) {
        var selectionSet = selectionSets.get(t);
        var fieldSelectionSetsMap = fieldSelectionSets.get(t);
        if (selectionSet != null && !subschemaTypesContainSelectionSet(mergedTypeInfo, sourceSubschemas, selectionSet)) {
            nonProxiableSubschemas.push(t);
        }
        else {
            if (fieldSelectionSetsMap == null ||
                fieldNodes.every(function (fieldNode) {
                    var fieldName = fieldNode.name.value;
                    var fieldSelectionSet = fieldSelectionSetsMap[fieldName];
                    return (fieldSelectionSet == null ||
                        subschemaTypesContainSelectionSet(mergedTypeInfo, sourceSubschemas, fieldSelectionSet));
                })) {
                proxiableSubschemas.push(t);
            }
            else {
                nonProxiableSubschemas.push(t);
            }
        }
    };
    try {
        for (var targetSubschemas_1 = __values(targetSubschemas), targetSubschemas_1_1 = targetSubschemas_1.next(); !targetSubschemas_1_1.done; targetSubschemas_1_1 = targetSubschemas_1.next()) {
            var t = targetSubschemas_1_1.value;
            _loop_1(t);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (targetSubschemas_1_1 && !targetSubschemas_1_1.done && (_a = targetSubschemas_1.return)) _a.call(targetSubschemas_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    var unproxiableFieldNodes = [];
    // 2. for each selection:
    var delegationMap = new Map();
    try {
        for (var fieldNodes_1 = __values(fieldNodes), fieldNodes_1_1 = fieldNodes_1.next(); !fieldNodes_1_1.done; fieldNodes_1_1 = fieldNodes_1.next()) {
            var fieldNode = fieldNodes_1_1.value;
            if (fieldNode.name.value === '__typename') {
                continue;
            }
            // 2a. use uniqueFields map to assign fields to subschema if one of possible subschemas
            var uniqueSubschema = uniqueFields[fieldNode.name.value];
            if (uniqueSubschema != null) {
                if (!proxiableSubschemas.includes(uniqueSubschema)) {
                    unproxiableFieldNodes.push(fieldNode);
                    continue;
                }
                var existingSubschema_1 = (_c = delegationMap.get(uniqueSubschema)) === null || _c === void 0 ? void 0 : _c.selections;
                if (existingSubschema_1 != null) {
                    existingSubschema_1.push(fieldNode);
                }
                else {
                    delegationMap.set(uniqueSubschema, {
                        kind: Kind.SELECTION_SET,
                        selections: [fieldNode],
                    });
                }
                continue;
            }
            // 2b. use nonUniqueFields to assign to a possible subschema,
            //     preferring one of the subschemas already targets of delegation
            var nonUniqueSubschemas = nonUniqueFields[fieldNode.name.value];
            if (nonUniqueSubschemas == null) {
                unproxiableFieldNodes.push(fieldNode);
                continue;
            }
            nonUniqueSubschemas = nonUniqueSubschemas.filter(function (s) { return proxiableSubschemas.includes(s); });
            if (!nonUniqueSubschemas.length) {
                unproxiableFieldNodes.push(fieldNode);
                continue;
            }
            var existingSubschema = nonUniqueSubschemas.find(function (s) { return delegationMap.has(s); });
            if (existingSubschema != null) {
                // It is okay we previously explicitly check whether the map has the element.
                delegationMap.get(existingSubschema).selections.push(fieldNode);
            }
            else {
                delegationMap.set(nonUniqueSubschemas[0], {
                    kind: Kind.SELECTION_SET,
                    selections: [fieldNode],
                });
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (fieldNodes_1_1 && !fieldNodes_1_1.done && (_b = fieldNodes_1.return)) _b.call(fieldNodes_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return {
        delegationMap: delegationMap,
        proxiableSubschemas: proxiableSubschemas,
        nonProxiableSubschemas: nonProxiableSubschemas,
        unproxiableFieldNodes: unproxiableFieldNodes,
    };
}
function getStitchingInfo(schema) {
    var _a;
    var stitchingInfo = (_a = schema.extensions) === null || _a === void 0 ? void 0 : _a['stitchingInfo'];
    if (!stitchingInfo) {
        throw new Error("Schema is not a stitched schema.");
    }
    return stitchingInfo;
}
export function createDelegationPlanBuilder(mergedTypeInfo) {
    return memoize5(function delegationPlanBuilder(schema, sourceSubschema, variableValues, fragments, fieldNodes) {
        var _a;
        var stitchingInfo = getStitchingInfo(schema);
        var targetSubschemas = mergedTypeInfo === null || mergedTypeInfo === void 0 ? void 0 : mergedTypeInfo.targetSubschemas.get(sourceSubschema);
        if (!targetSubschemas || !targetSubschemas.length) {
            return [];
        }
        var typeName = mergedTypeInfo.typeName;
        var fieldsNotInSubschema = getFieldsNotInSubschema(schema, stitchingInfo, schema.getType(typeName), (_a = mergedTypeInfo.typeMaps.get(sourceSubschema)) === null || _a === void 0 ? void 0 : _a[typeName], fieldNodes, fragments, variableValues);
        if (!fieldsNotInSubschema.length) {
            return [];
        }
        var delegationMaps = [];
        var sourceSubschemas = createSubschemas(sourceSubschema);
        var delegationStage = calculateDelegationStage(mergedTypeInfo, sourceSubschemas, targetSubschemas, fieldsNotInSubschema);
        var delegationMap = delegationStage.delegationMap;
        while (delegationMap.size) {
            delegationMaps.push(delegationMap);
            var proxiableSubschemas = delegationStage.proxiableSubschemas, nonProxiableSubschemas = delegationStage.nonProxiableSubschemas, unproxiableFieldNodes = delegationStage.unproxiableFieldNodes;
            sourceSubschemas = combineSubschemas(sourceSubschemas, proxiableSubschemas);
            delegationStage = calculateDelegationStage(mergedTypeInfo, sourceSubschemas, nonProxiableSubschemas, unproxiableFieldNodes);
            delegationMap = delegationStage.delegationMap;
        }
        return delegationMaps;
    });
}
var createSubschemas = memoize1(function createSubschemas(sourceSubschema) {
    return [sourceSubschema];
});
var combineSubschemas = memoize2(function combineSubschemas(sourceSubschemas, additionalSubschemas) {
    return sourceSubschemas.concat(additionalSubschemas);
});
var subschemaTypesContainSelectionSet = memoize3(function subschemaTypesContainSelectionSet(mergedTypeInfo, sourceSubchemas, selectionSet) {
    return typesContainSelectionSet(sourceSubchemas.map(function (sourceSubschema) { return sourceSubschema.transformedSchema.getType(mergedTypeInfo.typeName); }), selectionSet);
});
function typesContainSelectionSet(types, selectionSet) {
    var e_3, _a;
    var _b;
    var fieldMaps = types.map(function (type) { return type.getFields(); });
    var _loop_2 = function (selection) {
        if (selection.kind === Kind.FIELD) {
            var fields = fieldMaps.map(function (fieldMap) { return fieldMap[selection.name.value]; }).filter(function (field) { return field != null; });
            if (!fields.length) {
                return { value: false };
            }
            if (selection.selectionSet != null) {
                return { value: typesContainSelectionSet(fields.map(function (field) { return getNamedType(field.type); }), selection.selectionSet) };
            }
        }
        else if (selection.kind === Kind.INLINE_FRAGMENT && ((_b = selection.typeCondition) === null || _b === void 0 ? void 0 : _b.name.value) === types[0].name) {
            return { value: typesContainSelectionSet(types, selection.selectionSet) };
        }
    };
    try {
        for (var _c = __values(selectionSet.selections), _d = _c.next(); !_d.done; _d = _c.next()) {
            var selection = _d.value;
            var state_1 = _loop_2(selection);
            if (typeof state_1 === "object")
                return state_1.value;
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_3) throw e_3.error; }
    }
    return true;
}
