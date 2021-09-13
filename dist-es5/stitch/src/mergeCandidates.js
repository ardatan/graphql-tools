import { __assign, __read, __spreadArray, __values } from "tslib";
import { GraphQLObjectType, GraphQLInterfaceType, GraphQLUnionType, GraphQLEnumType, isScalarType, isObjectType, isInterfaceType, isUnionType, isEnumType, isInputObjectType, GraphQLInputObjectType, GraphQLScalarType, } from 'graphql';
import { mergeType, mergeInputType, mergeInterface, mergeUnion, mergeEnum, mergeScalar } from '@graphql-tools/merge';
import { validateFieldConsistency, validateInputFieldConsistency, validateInputObjectConsistency, } from './mergeValidations';
import { isSubschemaConfig } from '@graphql-tools/delegate';
export function mergeCandidates(typeName, candidates, typeMergingOptions) {
    var initialCandidateType = candidates[0].type;
    if (candidates.some(function (candidate) { return candidate.type.constructor !== initialCandidateType.constructor; })) {
        throw new Error("Cannot merge different type categories into common type " + typeName + ".");
    }
    if (isObjectType(initialCandidateType)) {
        return mergeObjectTypeCandidates(typeName, candidates, typeMergingOptions);
    }
    else if (isInputObjectType(initialCandidateType)) {
        return mergeInputObjectTypeCandidates(typeName, candidates, typeMergingOptions);
    }
    else if (isInterfaceType(initialCandidateType)) {
        return mergeInterfaceTypeCandidates(typeName, candidates, typeMergingOptions);
    }
    else if (isUnionType(initialCandidateType)) {
        return mergeUnionTypeCandidates(typeName, candidates, typeMergingOptions);
    }
    else if (isEnumType(initialCandidateType)) {
        return mergeEnumTypeCandidates(typeName, candidates, typeMergingOptions);
    }
    else if (isScalarType(initialCandidateType)) {
        return mergeScalarTypeCandidates(typeName, candidates, typeMergingOptions);
    }
    else {
        // not reachable.
        throw new Error("Type " + typeName + " has unknown GraphQL type.");
    }
}
function mergeObjectTypeCandidates(typeName, candidates, typeMergingOptions) {
    candidates = orderedTypeCandidates(candidates, typeMergingOptions);
    var description = mergeTypeDescriptions(candidates, typeMergingOptions);
    var fields = fieldConfigMapFromTypeCandidates(candidates, typeMergingOptions);
    var typeConfigs = candidates.map(function (candidate) { return candidate.type.toConfig(); });
    var interfaceMap = typeConfigs
        .map(function (typeConfig) { return typeConfig.interfaces; })
        .reduce(function (acc, interfaces) {
        var e_1, _a;
        if (interfaces != null) {
            try {
                for (var interfaces_1 = __values(interfaces), interfaces_1_1 = interfaces_1.next(); !interfaces_1_1.done; interfaces_1_1 = interfaces_1.next()) {
                    var iface = interfaces_1_1.value;
                    acc[iface.name] = iface;
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (interfaces_1_1 && !interfaces_1_1.done && (_a = interfaces_1.return)) _a.call(interfaces_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        return acc;
    }, Object.create(null));
    var interfaces = Object.values(interfaceMap);
    var astNodes = pluck('astNode', candidates);
    var fieldAstNodes = canonicalFieldNamesForType(candidates)
        .map(function (fieldName) { var _a; return (_a = fields[fieldName]) === null || _a === void 0 ? void 0 : _a.astNode; })
        .filter(function (n) { return n != null; });
    if (astNodes.length > 1 && fieldAstNodes.length) {
        astNodes.push(__assign(__assign({}, astNodes[astNodes.length - 1]), { fields: JSON.parse(JSON.stringify(fieldAstNodes)) }));
    }
    var astNode = astNodes
        .slice(1)
        .reduce(function (acc, astNode) {
        return mergeType(astNode, acc, { ignoreFieldConflicts: true });
    }, astNodes[0]);
    var extensionASTNodes = pluck('extensionASTNodes', candidates);
    var extensions = Object.assign.apply(Object, __spreadArray([{}], __read(pluck('extensions', candidates)), false));
    var typeConfig = {
        name: typeName,
        description: description,
        fields: fields,
        interfaces: interfaces,
        astNode: astNode,
        extensionASTNodes: extensionASTNodes,
        extensions: extensions,
    };
    return new GraphQLObjectType(typeConfig);
}
function mergeInputObjectTypeCandidates(typeName, candidates, typeMergingOptions) {
    candidates = orderedTypeCandidates(candidates, typeMergingOptions);
    var description = mergeTypeDescriptions(candidates, typeMergingOptions);
    var fields = inputFieldConfigMapFromTypeCandidates(candidates, typeMergingOptions);
    var astNodes = pluck('astNode', candidates);
    var fieldAstNodes = canonicalFieldNamesForType(candidates)
        .map(function (fieldName) { var _a; return (_a = fields[fieldName]) === null || _a === void 0 ? void 0 : _a.astNode; })
        .filter(function (n) { return n != null; });
    if (astNodes.length > 1 && fieldAstNodes.length) {
        astNodes.push(__assign(__assign({}, astNodes[astNodes.length - 1]), { fields: JSON.parse(JSON.stringify(fieldAstNodes)) }));
    }
    var astNode = astNodes.slice(1).reduce(function (acc, astNode) {
        return mergeInputType(astNode, acc, {
            ignoreFieldConflicts: true,
        });
    }, astNodes[0]);
    var extensionASTNodes = pluck('extensionASTNodes', candidates);
    var extensions = Object.assign.apply(Object, __spreadArray([{}], __read(pluck('extensions', candidates)), false));
    var typeConfig = {
        name: typeName,
        description: description,
        fields: fields,
        astNode: astNode,
        extensionASTNodes: extensionASTNodes,
        extensions: extensions,
    };
    return new GraphQLInputObjectType(typeConfig);
}
function pluck(typeProperty, candidates) {
    return candidates.map(function (candidate) { return candidate.type[typeProperty]; }).filter(function (value) { return value != null; });
}
function mergeInterfaceTypeCandidates(typeName, candidates, typeMergingOptions) {
    candidates = orderedTypeCandidates(candidates, typeMergingOptions);
    var description = mergeTypeDescriptions(candidates, typeMergingOptions);
    var fields = fieldConfigMapFromTypeCandidates(candidates, typeMergingOptions);
    var typeConfigs = candidates.map(function (candidate) { return candidate.type.toConfig(); });
    var interfaceMap = typeConfigs
        .map(function (typeConfig) { return ('interfaces' in typeConfig ? typeConfig.interfaces : []); })
        .reduce(function (acc, interfaces) {
        var e_2, _a;
        if (interfaces != null) {
            try {
                for (var interfaces_2 = __values(interfaces), interfaces_2_1 = interfaces_2.next(); !interfaces_2_1.done; interfaces_2_1 = interfaces_2.next()) {
                    var iface = interfaces_2_1.value;
                    acc[iface.name] = iface;
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (interfaces_2_1 && !interfaces_2_1.done && (_a = interfaces_2.return)) _a.call(interfaces_2);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
        return acc;
    }, Object.create(null));
    var interfaces = Object.values(interfaceMap);
    var astNodes = pluck('astNode', candidates);
    var fieldAstNodes = canonicalFieldNamesForType(candidates)
        .map(function (fieldName) { var _a; return (_a = fields[fieldName]) === null || _a === void 0 ? void 0 : _a.astNode; })
        .filter(function (n) { return n != null; });
    if (astNodes.length > 1 && fieldAstNodes.length) {
        astNodes.push(__assign(__assign({}, astNodes[astNodes.length - 1]), { fields: JSON.parse(JSON.stringify(fieldAstNodes)) }));
    }
    var astNode = astNodes.slice(1).reduce(function (acc, astNode) {
        return mergeInterface(astNode, acc, {
            ignoreFieldConflicts: true,
        });
    }, astNodes[0]);
    var extensionASTNodes = pluck('extensionASTNodes', candidates);
    var extensions = Object.assign.apply(Object, __spreadArray([{}], __read(pluck('extensions', candidates)), false));
    var typeConfig = {
        name: typeName,
        description: description,
        fields: fields,
        interfaces: interfaces,
        astNode: astNode,
        extensionASTNodes: extensionASTNodes,
        extensions: extensions,
    };
    return new GraphQLInterfaceType(typeConfig);
}
function mergeUnionTypeCandidates(typeName, candidates, typeMergingOptions) {
    candidates = orderedTypeCandidates(candidates, typeMergingOptions);
    var description = mergeTypeDescriptions(candidates, typeMergingOptions);
    var typeConfigs = candidates.map(function (candidate) {
        if (!isUnionType(candidate.type)) {
            throw new Error("Expected " + candidate.type + " to be a union type!");
        }
        return candidate.type.toConfig();
    });
    var typeMap = typeConfigs.reduce(function (acc, typeConfig) {
        var e_3, _a;
        try {
            for (var _b = __values(typeConfig.types), _c = _b.next(); !_c.done; _c = _b.next()) {
                var type = _c.value;
                acc[type.name] = type;
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return acc;
    }, Object.create(null));
    var types = Object.values(typeMap);
    var astNodes = pluck('astNode', candidates);
    var astNode = astNodes
        .slice(1)
        .reduce(function (acc, astNode) { return mergeUnion(astNode, acc); }, astNodes[0]);
    var extensionASTNodes = pluck('extensionASTNodes', candidates);
    var extensions = Object.assign.apply(Object, __spreadArray([{}], __read(pluck('extensions', candidates)), false));
    var typeConfig = {
        name: typeName,
        description: description,
        types: types,
        astNode: astNode,
        extensionASTNodes: extensionASTNodes,
        extensions: extensions,
    };
    return new GraphQLUnionType(typeConfig);
}
function mergeEnumTypeCandidates(typeName, candidates, typeMergingOptions) {
    candidates = orderedTypeCandidates(candidates, typeMergingOptions);
    var description = mergeTypeDescriptions(candidates, typeMergingOptions);
    var values = enumValueConfigMapFromTypeCandidates(candidates, typeMergingOptions);
    var astNodes = pluck('astNode', candidates);
    var astNode = astNodes
        .slice(1)
        .reduce(function (acc, astNode) {
        return mergeEnum(astNode, acc, { consistentEnumMerge: true });
    }, astNodes[0]);
    var extensionASTNodes = pluck('extensionASTNodes', candidates);
    var extensions = Object.assign.apply(Object, __spreadArray([{}], __read(pluck('extensions', candidates)), false));
    var typeConfig = {
        name: typeName,
        description: description,
        values: values,
        astNode: astNode,
        extensionASTNodes: extensionASTNodes,
        extensions: extensions,
    };
    return new GraphQLEnumType(typeConfig);
}
function enumValueConfigMapFromTypeCandidates(candidates, typeMergingOptions) {
    var e_4, _a;
    var _b;
    var enumValueConfigCandidatesMap = Object.create(null);
    try {
        for (var candidates_1 = __values(candidates), candidates_1_1 = candidates_1.next(); !candidates_1_1.done; candidates_1_1 = candidates_1.next()) {
            var candidate = candidates_1_1.value;
            var valueMap = candidate.type.toConfig().values;
            for (var enumValue in valueMap) {
                var enumValueConfigCandidate = {
                    enumValueConfig: valueMap[enumValue],
                    enumValue: enumValue,
                    type: candidate.type,
                    subschema: candidate.subschema,
                    transformedSubschema: candidate.transformedSubschema,
                };
                if (enumValue in enumValueConfigCandidatesMap) {
                    enumValueConfigCandidatesMap[enumValue].push(enumValueConfigCandidate);
                }
                else {
                    enumValueConfigCandidatesMap[enumValue] = [enumValueConfigCandidate];
                }
            }
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (candidates_1_1 && !candidates_1_1.done && (_a = candidates_1.return)) _a.call(candidates_1);
        }
        finally { if (e_4) throw e_4.error; }
    }
    var enumValueConfigMap = Object.create(null);
    for (var enumValue in enumValueConfigCandidatesMap) {
        var enumValueConfigMerger = (_b = typeMergingOptions === null || typeMergingOptions === void 0 ? void 0 : typeMergingOptions.enumValueConfigMerger) !== null && _b !== void 0 ? _b : defaultEnumValueConfigMerger;
        enumValueConfigMap[enumValue] = enumValueConfigMerger(enumValueConfigCandidatesMap[enumValue]);
    }
    return enumValueConfigMap;
}
function defaultEnumValueConfigMerger(candidates) {
    var preferred = candidates.find(function (_a) {
        var _b, _c;
        var type = _a.type, transformedSubschema = _a.transformedSubschema;
        return isSubschemaConfig(transformedSubschema) && ((_c = (_b = transformedSubschema.merge) === null || _b === void 0 ? void 0 : _b[type.name]) === null || _c === void 0 ? void 0 : _c.canonical);
    });
    return (preferred || candidates[candidates.length - 1]).enumValueConfig;
}
function mergeScalarTypeCandidates(typeName, candidates, typeMergingOptions) {
    candidates = orderedTypeCandidates(candidates, typeMergingOptions);
    var description = mergeTypeDescriptions(candidates, typeMergingOptions);
    var serializeFns = pluck('serialize', candidates);
    var serialize = serializeFns[serializeFns.length - 1];
    var parseValueFns = pluck('parseValue', candidates);
    var parseValue = parseValueFns[parseValueFns.length - 1];
    var parseLiteralFns = pluck('parseLiteral', candidates);
    var parseLiteral = parseLiteralFns[parseLiteralFns.length - 1];
    var astNodes = pluck('astNode', candidates);
    var astNode = astNodes
        .slice(1)
        .reduce(function (acc, astNode) { return mergeScalar(astNode, acc); }, astNodes[0]);
    var extensionASTNodes = pluck('extensionASTNodes', candidates);
    var extensions = Object.assign.apply(Object, __spreadArray([{}], __read(pluck('extensions', candidates)), false));
    var typeConfig = {
        name: typeName,
        description: description,
        serialize: serialize,
        parseValue: parseValue,
        parseLiteral: parseLiteral,
        astNode: astNode,
        extensionASTNodes: extensionASTNodes,
        extensions: extensions,
    };
    return new GraphQLScalarType(typeConfig);
}
function orderedTypeCandidates(candidates, typeMergingOptions) {
    var _a;
    var typeCandidateMerger = (_a = typeMergingOptions === null || typeMergingOptions === void 0 ? void 0 : typeMergingOptions.typeCandidateMerger) !== null && _a !== void 0 ? _a : defaultTypeCandidateMerger;
    var candidate = typeCandidateMerger(candidates);
    return candidates.filter(function (c) { return c !== candidate; }).concat([candidate]);
}
function defaultTypeCandidateMerger(candidates) {
    var canonical = candidates.filter(function (_a) {
        var _b, _c;
        var type = _a.type, transformedSubschema = _a.transformedSubschema;
        return isSubschemaConfig(transformedSubschema) ? (_c = (_b = transformedSubschema.merge) === null || _b === void 0 ? void 0 : _b[type.name]) === null || _c === void 0 ? void 0 : _c.canonical : false;
    });
    if (canonical.length > 1) {
        throw new Error("Multiple canonical definitions for \"" + canonical[0].type.name + "\"");
    }
    else if (canonical.length) {
        return canonical[0];
    }
    return candidates[candidates.length - 1];
}
function mergeTypeDescriptions(candidates, typeMergingOptions) {
    var _a;
    var typeDescriptionsMerger = (_a = typeMergingOptions === null || typeMergingOptions === void 0 ? void 0 : typeMergingOptions.typeDescriptionsMerger) !== null && _a !== void 0 ? _a : defaultTypeDescriptionMerger;
    return typeDescriptionsMerger(candidates);
}
function defaultTypeDescriptionMerger(candidates) {
    return candidates[candidates.length - 1].type.description;
}
function fieldConfigMapFromTypeCandidates(candidates, typeMergingOptions) {
    var e_5, _a;
    var fieldConfigCandidatesMap = Object.create(null);
    try {
        for (var candidates_2 = __values(candidates), candidates_2_1 = candidates_2.next(); !candidates_2_1.done; candidates_2_1 = candidates_2.next()) {
            var candidate = candidates_2_1.value;
            var typeConfig = candidate.type.toConfig();
            var fieldConfigMap_1 = typeConfig.fields;
            for (var fieldName in fieldConfigMap_1) {
                var fieldConfig = fieldConfigMap_1[fieldName];
                var fieldConfigCandidate = {
                    fieldConfig: fieldConfig,
                    fieldName: fieldName,
                    type: candidate.type,
                    subschema: candidate.subschema,
                    transformedSubschema: candidate.transformedSubschema,
                };
                if (fieldName in fieldConfigCandidatesMap) {
                    fieldConfigCandidatesMap[fieldName].push(fieldConfigCandidate);
                }
                else {
                    fieldConfigCandidatesMap[fieldName] = [fieldConfigCandidate];
                }
            }
        }
    }
    catch (e_5_1) { e_5 = { error: e_5_1 }; }
    finally {
        try {
            if (candidates_2_1 && !candidates_2_1.done && (_a = candidates_2.return)) _a.call(candidates_2);
        }
        finally { if (e_5) throw e_5.error; }
    }
    var fieldConfigMap = Object.create(null);
    for (var fieldName in fieldConfigCandidatesMap) {
        fieldConfigMap[fieldName] = mergeFieldConfigs(fieldConfigCandidatesMap[fieldName], typeMergingOptions);
    }
    return fieldConfigMap;
}
function mergeFieldConfigs(candidates, typeMergingOptions) {
    var _a;
    var fieldConfigMerger = (_a = typeMergingOptions === null || typeMergingOptions === void 0 ? void 0 : typeMergingOptions.fieldConfigMerger) !== null && _a !== void 0 ? _a : defaultFieldConfigMerger;
    var finalFieldConfig = fieldConfigMerger(candidates);
    validateFieldConsistency(finalFieldConfig, candidates, typeMergingOptions);
    return finalFieldConfig;
}
function defaultFieldConfigMerger(candidates) {
    var e_6, _a;
    var _b, _c, _d, _e, _f, _g;
    var canonicalByField = [];
    var canonicalByType = [];
    try {
        for (var candidates_3 = __values(candidates), candidates_3_1 = candidates_3.next(); !candidates_3_1.done; candidates_3_1 = candidates_3.next()) {
            var _h = candidates_3_1.value, type = _h.type, fieldName = _h.fieldName, fieldConfig = _h.fieldConfig, transformedSubschema = _h.transformedSubschema;
            if (!isSubschemaConfig(transformedSubschema))
                continue;
            if ((_e = (_d = (_c = (_b = transformedSubschema.merge) === null || _b === void 0 ? void 0 : _b[type.name]) === null || _c === void 0 ? void 0 : _c.fields) === null || _d === void 0 ? void 0 : _d[fieldName]) === null || _e === void 0 ? void 0 : _e.canonical) {
                canonicalByField.push(fieldConfig);
            }
            else if ((_g = (_f = transformedSubschema.merge) === null || _f === void 0 ? void 0 : _f[type.name]) === null || _g === void 0 ? void 0 : _g.canonical) {
                canonicalByType.push(fieldConfig);
            }
        }
    }
    catch (e_6_1) { e_6 = { error: e_6_1 }; }
    finally {
        try {
            if (candidates_3_1 && !candidates_3_1.done && (_a = candidates_3.return)) _a.call(candidates_3);
        }
        finally { if (e_6) throw e_6.error; }
    }
    if (canonicalByField.length > 1) {
        throw new Error("Multiple canonical definitions for \"" + candidates[0].type.name + "." + candidates[0].fieldName + "\"");
    }
    else if (canonicalByField.length) {
        return canonicalByField[0];
    }
    else if (canonicalByType.length) {
        return canonicalByType[0];
    }
    return candidates[candidates.length - 1].fieldConfig;
}
function inputFieldConfigMapFromTypeCandidates(candidates, typeMergingOptions) {
    var e_7, _a;
    var _b;
    var inputFieldConfigCandidatesMap = Object.create(null);
    var fieldInclusionMap = Object.create(null);
    try {
        for (var candidates_4 = __values(candidates), candidates_4_1 = candidates_4.next(); !candidates_4_1.done; candidates_4_1 = candidates_4.next()) {
            var candidate = candidates_4_1.value;
            var typeConfig = candidate.type.toConfig();
            var inputFieldConfigMap_1 = typeConfig.fields;
            for (var fieldName in inputFieldConfigMap_1) {
                var inputFieldConfig = inputFieldConfigMap_1[fieldName];
                fieldInclusionMap[fieldName] = fieldInclusionMap[fieldName] || 0;
                fieldInclusionMap[fieldName] += 1;
                var inputFieldConfigCandidate = {
                    inputFieldConfig: inputFieldConfig,
                    fieldName: fieldName,
                    type: candidate.type,
                    subschema: candidate.subschema,
                    transformedSubschema: candidate.transformedSubschema,
                };
                if (fieldName in inputFieldConfigCandidatesMap) {
                    inputFieldConfigCandidatesMap[fieldName].push(inputFieldConfigCandidate);
                }
                else {
                    inputFieldConfigCandidatesMap[fieldName] = [inputFieldConfigCandidate];
                }
            }
        }
    }
    catch (e_7_1) { e_7 = { error: e_7_1 }; }
    finally {
        try {
            if (candidates_4_1 && !candidates_4_1.done && (_a = candidates_4.return)) _a.call(candidates_4);
        }
        finally { if (e_7) throw e_7.error; }
    }
    validateInputObjectConsistency(fieldInclusionMap, candidates, typeMergingOptions);
    var inputFieldConfigMap = Object.create(null);
    for (var fieldName in inputFieldConfigCandidatesMap) {
        var inputFieldConfigMerger = (_b = typeMergingOptions === null || typeMergingOptions === void 0 ? void 0 : typeMergingOptions.inputFieldConfigMerger) !== null && _b !== void 0 ? _b : defaultInputFieldConfigMerger;
        inputFieldConfigMap[fieldName] = inputFieldConfigMerger(inputFieldConfigCandidatesMap[fieldName]);
        validateInputFieldConsistency(inputFieldConfigMap[fieldName], inputFieldConfigCandidatesMap[fieldName], typeMergingOptions);
    }
    return inputFieldConfigMap;
}
function defaultInputFieldConfigMerger(candidates) {
    var e_8, _a;
    var _b, _c, _d, _e, _f, _g;
    var canonicalByField = [];
    var canonicalByType = [];
    try {
        for (var candidates_5 = __values(candidates), candidates_5_1 = candidates_5.next(); !candidates_5_1.done; candidates_5_1 = candidates_5.next()) {
            var _h = candidates_5_1.value, type = _h.type, fieldName = _h.fieldName, inputFieldConfig = _h.inputFieldConfig, transformedSubschema = _h.transformedSubschema;
            if (!isSubschemaConfig(transformedSubschema))
                continue;
            if ((_e = (_d = (_c = (_b = transformedSubschema.merge) === null || _b === void 0 ? void 0 : _b[type.name]) === null || _c === void 0 ? void 0 : _c.fields) === null || _d === void 0 ? void 0 : _d[fieldName]) === null || _e === void 0 ? void 0 : _e.canonical) {
                canonicalByField.push(inputFieldConfig);
            }
            else if ((_g = (_f = transformedSubschema.merge) === null || _f === void 0 ? void 0 : _f[type.name]) === null || _g === void 0 ? void 0 : _g.canonical) {
                canonicalByType.push(inputFieldConfig);
            }
        }
    }
    catch (e_8_1) { e_8 = { error: e_8_1 }; }
    finally {
        try {
            if (candidates_5_1 && !candidates_5_1.done && (_a = candidates_5.return)) _a.call(candidates_5);
        }
        finally { if (e_8) throw e_8.error; }
    }
    if (canonicalByField.length > 1) {
        throw new Error("Multiple canonical definitions for \"" + candidates[0].type.name + "." + candidates[0].fieldName + "\"");
    }
    else if (canonicalByField.length) {
        return canonicalByField[0];
    }
    else if (canonicalByType.length) {
        return canonicalByType[0];
    }
    return candidates[candidates.length - 1].inputFieldConfig;
}
function canonicalFieldNamesForType(candidates) {
    var e_9, _a;
    var _b;
    var canonicalFieldNames = Object.create(null);
    try {
        for (var candidates_6 = __values(candidates), candidates_6_1 = candidates_6.next(); !candidates_6_1.done; candidates_6_1 = candidates_6.next()) {
            var _c = candidates_6_1.value, type = _c.type, transformedSubschema = _c.transformedSubschema;
            if (!isSubschemaConfig(transformedSubschema))
                continue;
            var mergeConfig = (_b = transformedSubschema.merge) === null || _b === void 0 ? void 0 : _b[type.name];
            if (mergeConfig != null && mergeConfig.fields != null && !mergeConfig.canonical) {
                for (var fieldName in mergeConfig.fields) {
                    var mergedFieldConfig = mergeConfig.fields[fieldName];
                    if (mergedFieldConfig.canonical) {
                        canonicalFieldNames[fieldName] = true;
                    }
                }
            }
        }
    }
    catch (e_9_1) { e_9 = { error: e_9_1 }; }
    finally {
        try {
            if (candidates_6_1 && !candidates_6_1.done && (_a = candidates_6.return)) _a.call(candidates_6);
        }
        finally { if (e_9) throw e_9.error; }
    }
    return Object.keys(canonicalFieldNames);
}
