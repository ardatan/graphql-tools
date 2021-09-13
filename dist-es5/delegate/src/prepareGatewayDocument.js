import { __assign, __read, __spreadArray, __values } from "tslib";
import { Kind, TypeInfo, getNamedType, isAbstractType, isInterfaceType, visit, visitWithTypeInfo, isObjectType, } from 'graphql';
import { implementsAbstractType, getRootTypeNames, memoize2 } from '@graphql-tools/utils';
import { getDocumentMetadata } from './getDocumentMetadata';
export function prepareGatewayDocument(originalDocument, transformedSchema, returnType, infoSchema) {
    var _a;
    var wrappedConcreteTypesDocument = wrapConcreteTypes(returnType, transformedSchema, originalDocument);
    if (infoSchema == null) {
        return wrappedConcreteTypesDocument;
    }
    var _b = getSchemaMetaData(infoSchema, transformedSchema), possibleTypesMap = _b.possibleTypesMap, reversePossibleTypesMap = _b.reversePossibleTypesMap, interfaceExtensionsMap = _b.interfaceExtensionsMap, fieldNodesByType = _b.fieldNodesByType, fieldNodesByField = _b.fieldNodesByField, dynamicSelectionSetsByField = _b.dynamicSelectionSetsByField;
    var _c = getDocumentMetadata(wrappedConcreteTypesDocument), operations = _c.operations, fragments = _c.fragments, fragmentNames = _c.fragmentNames;
    var _d = getExpandedFragments(fragments, fragmentNames, possibleTypesMap), expandedFragments = _d.expandedFragments, fragmentReplacements = _d.fragmentReplacements;
    var typeInfo = new TypeInfo(transformedSchema);
    var expandedDocument = {
        kind: Kind.DOCUMENT,
        definitions: __spreadArray(__spreadArray(__spreadArray([], __read(operations), false), __read(fragments), false), __read(expandedFragments), false),
    };
    var visitorKeyMap = {
        Document: ['definitions'],
        OperationDefinition: ['selectionSet'],
        SelectionSet: ['selections'],
        Field: ['selectionSet'],
        InlineFragment: ['selectionSet'],
        FragmentDefinition: ['selectionSet'],
    };
    return visit(expandedDocument, visitWithTypeInfo(typeInfo, (_a = {},
        _a[Kind.SELECTION_SET] = function (node) {
            return visitSelectionSet(node, fragmentReplacements, transformedSchema, typeInfo, possibleTypesMap, reversePossibleTypesMap, interfaceExtensionsMap, fieldNodesByType, fieldNodesByField, dynamicSelectionSetsByField);
        },
        _a)), 
    // visitorKeys argument usage a la https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js
    // empty keys cannot be removed only because of typescript errors
    // will hopefully be fixed in future version of graphql-js to be optional
    visitorKeyMap);
}
function visitSelectionSet(node, fragmentReplacements, schema, typeInfo, possibleTypesMap, reversePossibleTypesMap, interfaceExtensionsMap, fieldNodesByType, fieldNodesByField, dynamicSelectionSetsByField) {
    var e_1, _a, e_2, _b, e_3, _c, e_4, _d, e_5, _e, e_6, _f, e_7, _g, e_8, _h;
    var _j, _k;
    var newSelections = new Set();
    var maybeType = typeInfo.getParentType();
    if (maybeType != null) {
        var parentType = getNamedType(maybeType);
        var parentTypeName = parentType.name;
        var fieldNodes = fieldNodesByType[parentTypeName];
        if (fieldNodes) {
            try {
                for (var fieldNodes_1 = __values(fieldNodes), fieldNodes_1_1 = fieldNodes_1.next(); !fieldNodes_1_1.done; fieldNodes_1_1 = fieldNodes_1.next()) {
                    var fieldNode = fieldNodes_1_1.value;
                    newSelections.add(fieldNode);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (fieldNodes_1_1 && !fieldNodes_1_1.done && (_a = fieldNodes_1.return)) _a.call(fieldNodes_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        var interfaceExtensions = interfaceExtensionsMap[parentType.name];
        var interfaceExtensionFields = [];
        try {
            for (var _l = __values(node.selections), _m = _l.next(); !_m.done; _m = _l.next()) {
                var selection = _m.value;
                if (selection.kind === Kind.INLINE_FRAGMENT) {
                    if (selection.typeCondition != null) {
                        var possibleTypes = possibleTypesMap[selection.typeCondition.name.value];
                        if (possibleTypes == null) {
                            newSelections.add(selection);
                            continue;
                        }
                        try {
                            for (var possibleTypes_1 = (e_3 = void 0, __values(possibleTypes)), possibleTypes_1_1 = possibleTypes_1.next(); !possibleTypes_1_1.done; possibleTypes_1_1 = possibleTypes_1.next()) {
                                var possibleTypeName = possibleTypes_1_1.value;
                                var maybePossibleType = schema.getType(possibleTypeName);
                                if (maybePossibleType != null && implementsAbstractType(schema, parentType, maybePossibleType)) {
                                    newSelections.add(generateInlineFragment(possibleTypeName, selection.selectionSet));
                                }
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (possibleTypes_1_1 && !possibleTypes_1_1.done && (_c = possibleTypes_1.return)) _c.call(possibleTypes_1);
                            }
                            finally { if (e_3) throw e_3.error; }
                        }
                    }
                }
                else if (selection.kind === Kind.FRAGMENT_SPREAD) {
                    var fragmentName = selection.name.value;
                    if (!fragmentReplacements[fragmentName]) {
                        newSelections.add(selection);
                        continue;
                    }
                    try {
                        for (var _o = (e_4 = void 0, __values(fragmentReplacements[fragmentName])), _p = _o.next(); !_p.done; _p = _o.next()) {
                            var replacement = _p.value;
                            var typeName = replacement.typeName;
                            var maybeReplacementType = schema.getType(typeName);
                            if (maybeReplacementType != null && implementsAbstractType(schema, parentType, maybeType)) {
                                newSelections.add({
                                    kind: Kind.FRAGMENT_SPREAD,
                                    name: {
                                        kind: Kind.NAME,
                                        value: replacement.fragmentName,
                                    },
                                });
                            }
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (_p && !_p.done && (_d = _o.return)) _d.call(_o);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                }
                else {
                    var fieldName = selection.name.value;
                    var fieldNodes_3 = (_j = fieldNodesByField[parentTypeName]) === null || _j === void 0 ? void 0 : _j[fieldName];
                    if (fieldNodes_3 != null) {
                        try {
                            for (var fieldNodes_2 = (e_5 = void 0, __values(fieldNodes_3)), fieldNodes_2_1 = fieldNodes_2.next(); !fieldNodes_2_1.done; fieldNodes_2_1 = fieldNodes_2.next()) {
                                var fieldNode = fieldNodes_2_1.value;
                                newSelections.add(fieldNode);
                            }
                        }
                        catch (e_5_1) { e_5 = { error: e_5_1 }; }
                        finally {
                            try {
                                if (fieldNodes_2_1 && !fieldNodes_2_1.done && (_e = fieldNodes_2.return)) _e.call(fieldNodes_2);
                            }
                            finally { if (e_5) throw e_5.error; }
                        }
                    }
                    var dynamicSelectionSets = (_k = dynamicSelectionSetsByField[parentTypeName]) === null || _k === void 0 ? void 0 : _k[fieldName];
                    if (dynamicSelectionSets != null) {
                        try {
                            for (var dynamicSelectionSets_1 = (e_6 = void 0, __values(dynamicSelectionSets)), dynamicSelectionSets_1_1 = dynamicSelectionSets_1.next(); !dynamicSelectionSets_1_1.done; dynamicSelectionSets_1_1 = dynamicSelectionSets_1.next()) {
                                var selectionSetFn = dynamicSelectionSets_1_1.value;
                                var selectionSet = selectionSetFn(selection);
                                if (selectionSet != null) {
                                    try {
                                        for (var _q = (e_7 = void 0, __values(selectionSet.selections)), _r = _q.next(); !_r.done; _r = _q.next()) {
                                            var selection_1 = _r.value;
                                            newSelections.add(selection_1);
                                        }
                                    }
                                    catch (e_7_1) { e_7 = { error: e_7_1 }; }
                                    finally {
                                        try {
                                            if (_r && !_r.done && (_g = _q.return)) _g.call(_q);
                                        }
                                        finally { if (e_7) throw e_7.error; }
                                    }
                                }
                            }
                        }
                        catch (e_6_1) { e_6 = { error: e_6_1 }; }
                        finally {
                            try {
                                if (dynamicSelectionSets_1_1 && !dynamicSelectionSets_1_1.done && (_f = dynamicSelectionSets_1.return)) _f.call(dynamicSelectionSets_1);
                            }
                            finally { if (e_6) throw e_6.error; }
                        }
                    }
                    if (interfaceExtensions === null || interfaceExtensions === void 0 ? void 0 : interfaceExtensions[fieldName]) {
                        interfaceExtensionFields.push(selection);
                    }
                    else {
                        newSelections.add(selection);
                    }
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_m && !_m.done && (_b = _l.return)) _b.call(_l);
            }
            finally { if (e_2) throw e_2.error; }
        }
        if (reversePossibleTypesMap[parentType.name]) {
            newSelections.add({
                kind: Kind.FIELD,
                name: {
                    kind: Kind.NAME,
                    value: '__typename',
                },
            });
        }
        if (interfaceExtensionFields.length) {
            var possibleTypes = possibleTypesMap[parentType.name];
            if (possibleTypes != null) {
                try {
                    for (var possibleTypes_2 = __values(possibleTypes), possibleTypes_2_1 = possibleTypes_2.next(); !possibleTypes_2_1.done; possibleTypes_2_1 = possibleTypes_2.next()) {
                        var possibleType = possibleTypes_2_1.value;
                        newSelections.add(generateInlineFragment(possibleType, {
                            kind: Kind.SELECTION_SET,
                            selections: interfaceExtensionFields,
                        }));
                    }
                }
                catch (e_8_1) { e_8 = { error: e_8_1 }; }
                finally {
                    try {
                        if (possibleTypes_2_1 && !possibleTypes_2_1.done && (_h = possibleTypes_2.return)) _h.call(possibleTypes_2);
                    }
                    finally { if (e_8) throw e_8.error; }
                }
            }
        }
        return __assign(__assign({}, node), { selections: Array.from(newSelections) });
    }
    return node;
}
function generateInlineFragment(typeName, selectionSet) {
    return {
        kind: Kind.INLINE_FRAGMENT,
        typeCondition: {
            kind: Kind.NAMED_TYPE,
            name: {
                kind: Kind.NAME,
                value: typeName,
            },
        },
        selectionSet: selectionSet,
    };
}
var getSchemaMetaData = memoize2(function (sourceSchema, targetSchema) {
    var e_9, _a;
    var _b, _c, _d, _e;
    var typeMap = sourceSchema.getTypeMap();
    var targetTypeMap = targetSchema.getTypeMap();
    var possibleTypesMap = Object.create(null);
    var interfaceExtensionsMap = Object.create(null);
    for (var typeName in typeMap) {
        var type = typeMap[typeName];
        if (isAbstractType(type)) {
            var targetType = targetTypeMap[typeName];
            if (isInterfaceType(type) && isInterfaceType(targetType)) {
                var targetTypeFields = targetType.getFields();
                var sourceTypeFields = type.getFields();
                var extensionFields = Object.create(null);
                var isExtensionFieldsEmpty = true;
                for (var fieldName in sourceTypeFields) {
                    if (!targetTypeFields[fieldName]) {
                        extensionFields[fieldName] = true;
                        isExtensionFieldsEmpty = false;
                    }
                }
                if (!isExtensionFieldsEmpty) {
                    interfaceExtensionsMap[typeName] = extensionFields;
                }
            }
            if (interfaceExtensionsMap[typeName] || !isAbstractType(targetType)) {
                var implementations = sourceSchema.getPossibleTypes(type);
                possibleTypesMap[typeName] = [];
                try {
                    for (var implementations_1 = (e_9 = void 0, __values(implementations)), implementations_1_1 = implementations_1.next(); !implementations_1_1.done; implementations_1_1 = implementations_1.next()) {
                        var impl = implementations_1_1.value;
                        if (targetTypeMap[impl.name]) {
                            possibleTypesMap[typeName].push(impl.name);
                        }
                    }
                }
                catch (e_9_1) { e_9 = { error: e_9_1 }; }
                finally {
                    try {
                        if (implementations_1_1 && !implementations_1_1.done && (_a = implementations_1.return)) _a.call(implementations_1);
                    }
                    finally { if (e_9) throw e_9.error; }
                }
            }
        }
    }
    var stitchingInfo = (_b = sourceSchema.extensions) === null || _b === void 0 ? void 0 : _b['stitchingInfo'];
    return {
        possibleTypesMap: possibleTypesMap,
        reversePossibleTypesMap: reversePossibleTypesMap(possibleTypesMap),
        interfaceExtensionsMap: interfaceExtensionsMap,
        fieldNodesByType: (_c = stitchingInfo === null || stitchingInfo === void 0 ? void 0 : stitchingInfo.fieldNodesByType) !== null && _c !== void 0 ? _c : {},
        fieldNodesByField: (_d = stitchingInfo === null || stitchingInfo === void 0 ? void 0 : stitchingInfo.fieldNodesByField) !== null && _d !== void 0 ? _d : {},
        dynamicSelectionSetsByField: (_e = stitchingInfo === null || stitchingInfo === void 0 ? void 0 : stitchingInfo.dynamicSelectionSetsByField) !== null && _e !== void 0 ? _e : {},
    };
});
function reversePossibleTypesMap(possibleTypesMap) {
    var e_10, _a;
    var result = Object.create(null);
    for (var typeName in possibleTypesMap) {
        var toTypeNames = possibleTypesMap[typeName];
        try {
            for (var toTypeNames_1 = (e_10 = void 0, __values(toTypeNames)), toTypeNames_1_1 = toTypeNames_1.next(); !toTypeNames_1_1.done; toTypeNames_1_1 = toTypeNames_1.next()) {
                var toTypeName = toTypeNames_1_1.value;
                if (!result[toTypeName]) {
                    result[toTypeName] = [];
                }
                result[toTypeName].push(typeName);
            }
        }
        catch (e_10_1) { e_10 = { error: e_10_1 }; }
        finally {
            try {
                if (toTypeNames_1_1 && !toTypeNames_1_1.done && (_a = toTypeNames_1.return)) _a.call(toTypeNames_1);
            }
            finally { if (e_10) throw e_10.error; }
        }
    }
    return result;
}
function getExpandedFragments(fragments, fragmentNames, possibleTypesMap) {
    var e_11, _a, e_12, _b;
    var fragmentCounter = 0;
    function generateFragmentName(typeName) {
        var fragmentName;
        do {
            fragmentName = "_" + typeName + "_Fragment" + fragmentCounter.toString();
            fragmentCounter++;
        } while (fragmentNames.has(fragmentName));
        return fragmentName;
    }
    var expandedFragments = [];
    var fragmentReplacements = Object.create(null);
    try {
        for (var fragments_1 = __values(fragments), fragments_1_1 = fragments_1.next(); !fragments_1_1.done; fragments_1_1 = fragments_1.next()) {
            var fragment = fragments_1_1.value;
            var possibleTypes = possibleTypesMap[fragment.typeCondition.name.value];
            if (possibleTypes != null) {
                var fragmentName = fragment.name.value;
                fragmentReplacements[fragmentName] = [];
                try {
                    for (var possibleTypes_3 = (e_12 = void 0, __values(possibleTypes)), possibleTypes_3_1 = possibleTypes_3.next(); !possibleTypes_3_1.done; possibleTypes_3_1 = possibleTypes_3.next()) {
                        var possibleTypeName = possibleTypes_3_1.value;
                        var name_1 = generateFragmentName(possibleTypeName);
                        fragmentNames.add(name_1);
                        expandedFragments.push({
                            kind: Kind.FRAGMENT_DEFINITION,
                            name: {
                                kind: Kind.NAME,
                                value: name_1,
                            },
                            typeCondition: {
                                kind: Kind.NAMED_TYPE,
                                name: {
                                    kind: Kind.NAME,
                                    value: possibleTypeName,
                                },
                            },
                            selectionSet: fragment.selectionSet,
                        });
                        fragmentReplacements[fragmentName].push({
                            fragmentName: name_1,
                            typeName: possibleTypeName,
                        });
                    }
                }
                catch (e_12_1) { e_12 = { error: e_12_1 }; }
                finally {
                    try {
                        if (possibleTypes_3_1 && !possibleTypes_3_1.done && (_b = possibleTypes_3.return)) _b.call(possibleTypes_3);
                    }
                    finally { if (e_12) throw e_12.error; }
                }
            }
        }
    }
    catch (e_11_1) { e_11 = { error: e_11_1 }; }
    finally {
        try {
            if (fragments_1_1 && !fragments_1_1.done && (_a = fragments_1.return)) _a.call(fragments_1);
        }
        finally { if (e_11) throw e_11.error; }
    }
    return {
        expandedFragments: expandedFragments,
        fragmentReplacements: fragmentReplacements,
    };
}
function wrapConcreteTypes(returnType, targetSchema, document) {
    var _a;
    var namedType = getNamedType(returnType);
    if (!isObjectType(namedType)) {
        return document;
    }
    var rootTypeNames = getRootTypeNames(targetSchema);
    var typeInfo = new TypeInfo(targetSchema);
    var visitorKeys = {
        Document: ['definitions'],
        OperationDefinition: ['selectionSet'],
        SelectionSet: ['selections'],
        InlineFragment: ['selectionSet'],
        FragmentDefinition: ['selectionSet'],
    };
    return visit(document, visitWithTypeInfo(typeInfo, (_a = {},
        _a[Kind.FRAGMENT_DEFINITION] = function (node) {
            var typeName = node.typeCondition.name.value;
            if (!rootTypeNames.has(typeName)) {
                return false;
            }
        },
        _a[Kind.FIELD] = function (node) {
            var type = typeInfo.getType();
            if (type != null && isAbstractType(getNamedType(type))) {
                return __assign(__assign({}, node), { selectionSet: {
                        kind: Kind.SELECTION_SET,
                        selections: [
                            {
                                kind: Kind.INLINE_FRAGMENT,
                                typeCondition: {
                                    kind: Kind.NAMED_TYPE,
                                    name: {
                                        kind: Kind.NAME,
                                        value: namedType.name,
                                    },
                                },
                                selectionSet: node.selectionSet,
                            },
                        ],
                    } });
            }
        },
        _a)), 
    // visitorKeys argument usage a la https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js
    // empty keys cannot be removed only because of typescript errors
    // will hopefully be fixed in future version of graphql-js to be optional
    visitorKeys);
}
