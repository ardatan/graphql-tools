import { __assign, __values } from "tslib";
import { isEnumType, isNonNullType, getNullableType, getNamedType, isListType, isScalarType, } from 'graphql';
import { ValidationLevel, } from './types';
export function validateFieldConsistency(finalFieldConfig, candidates, typeMergingOptions) {
    var e_1, _a;
    var fieldNamespace = candidates[0].type.name + "." + candidates[0].fieldName;
    var finalFieldNull = isNonNullType(finalFieldConfig.type);
    validateTypeConsistency(finalFieldConfig, candidates.map(function (c) { return c.fieldConfig; }), 'field', fieldNamespace, typeMergingOptions);
    if (getValidationSettings(fieldNamespace, typeMergingOptions).strictNullComparison &&
        candidates.some(function (c) { return finalFieldNull !== isNonNullType(c.fieldConfig.type); })) {
        validationMessage("Nullability of field \"" + fieldNamespace + "\" does not match across subschemas. Disable typeMergingOptions.validationSettings.strictNullComparison to permit safe divergences.", fieldNamespace, typeMergingOptions);
    }
    else if (finalFieldNull && candidates.some(function (c) { return !isNonNullType(c.fieldConfig.type); })) {
        validationMessage("Canonical definition of field \"" + fieldNamespace + "\" is not-null while some subschemas permit null. This will be an automatic error in future versions.", fieldNamespace, typeMergingOptions);
    }
    var argCandidatesMap = Object.create(null);
    try {
        for (var candidates_1 = __values(candidates), candidates_1_1 = candidates_1.next(); !candidates_1_1.done; candidates_1_1 = candidates_1.next()) {
            var fieldConfig = candidates_1_1.value.fieldConfig;
            if (fieldConfig.args == null) {
                continue;
            }
            for (var argName in fieldConfig.args) {
                var arg = fieldConfig.args[argName];
                argCandidatesMap[argName] = argCandidatesMap[argName] || [];
                argCandidatesMap[argName].push(arg);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (candidates_1_1 && !candidates_1_1.done && (_a = candidates_1.return)) _a.call(candidates_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    if (Object.values(argCandidatesMap).some(function (argCandidates) { return candidates.length !== argCandidates.length; })) {
        validationMessage("Canonical definition of field \"" + fieldNamespace + "\" implements inconsistent argument names across subschemas. Input may be filtered from some requests.", fieldNamespace, typeMergingOptions);
    }
    var _loop_1 = function (argName) {
        if (finalFieldConfig.args == null) {
            return "continue";
        }
        var argCandidates = argCandidatesMap[argName];
        var argNamespace = fieldNamespace + "." + argName;
        var finalArgConfig = finalFieldConfig.args[argName] || argCandidates[argCandidates.length - 1];
        var finalArgType = getNamedType(finalArgConfig.type);
        var finalArgNull = isNonNullType(finalArgConfig.type);
        validateTypeConsistency(finalArgConfig, argCandidates, 'argument', argNamespace, typeMergingOptions);
        if (getValidationSettings(argNamespace, typeMergingOptions).strictNullComparison &&
            argCandidates.some(function (c) { return finalArgNull !== isNonNullType(c.type); })) {
            validationMessage("Nullability of argument \"" + argNamespace + "\" does not match across subschemas. Disable typeMergingOptions.validationSettings.strictNullComparison to permit safe divergences.", argNamespace, typeMergingOptions);
        }
        else if (!finalArgNull && argCandidates.some(function (c) { return isNonNullType(c.type); })) {
            validationMessage("Canonical definition of argument \"" + argNamespace + "\" permits null while some subschemas require not-null. This will be an automatic error in future versions.", argNamespace, typeMergingOptions);
        }
        if (isEnumType(finalArgType)) {
            validateInputEnumConsistency(finalArgType, argCandidates, typeMergingOptions);
        }
    };
    for (var argName in argCandidatesMap) {
        _loop_1(argName);
    }
}
export function validateInputObjectConsistency(fieldInclusionMap, candidates, typeMergingOptions) {
    for (var fieldName in fieldInclusionMap) {
        var count = fieldInclusionMap[fieldName];
        if (candidates.length !== count) {
            var namespace = candidates[0].type.name + "." + fieldName;
            validationMessage("Definition of input field \"" + namespace + "\" is not implemented by all subschemas. Input may be filtered from some requests.", namespace, typeMergingOptions);
        }
    }
}
export function validateInputFieldConsistency(finalInputFieldConfig, candidates, typeMergingOptions) {
    var inputFieldNamespace = candidates[0].type.name + "." + candidates[0].fieldName;
    var inputFieldConfigs = candidates.map(function (c) { return c.inputFieldConfig; });
    var finalInputFieldType = getNamedType(finalInputFieldConfig.type);
    var finalInputFieldNull = isNonNullType(finalInputFieldConfig.type);
    validateTypeConsistency(finalInputFieldConfig, inputFieldConfigs, 'input field', inputFieldNamespace, typeMergingOptions);
    if (getValidationSettings(inputFieldNamespace, typeMergingOptions).strictNullComparison &&
        candidates.some(function (c) { return finalInputFieldNull !== isNonNullType(c.inputFieldConfig.type); })) {
        validationMessage("Nullability of input field \"" + inputFieldNamespace + "\" does not match across subschemas. Disable typeMergingOptions.validationSettings.strictNullComparison to permit safe divergences.", inputFieldNamespace, typeMergingOptions);
    }
    else if (!finalInputFieldNull && candidates.some(function (c) { return isNonNullType(c.inputFieldConfig.type); })) {
        validationMessage("Canonical definition of input field \"" + inputFieldNamespace + "\" permits null while some subschemas require not-null. This will be an automatic error in future versions.", inputFieldNamespace, typeMergingOptions);
    }
    if (isEnumType(finalInputFieldType)) {
        validateInputEnumConsistency(finalInputFieldType, inputFieldConfigs, typeMergingOptions);
    }
}
export function validateTypeConsistency(finalElementConfig, candidates, definitionType, settingNamespace, typeMergingOptions) {
    var e_2, _a;
    var _b, _c, _d;
    var finalNamedType = getNamedType(finalElementConfig.type);
    var finalIsScalar = isScalarType(finalNamedType);
    var finalIsList = hasListType(finalElementConfig.type);
    try {
        for (var candidates_2 = __values(candidates), candidates_2_1 = candidates_2.next(); !candidates_2_1.done; candidates_2_1 = candidates_2.next()) {
            var c = candidates_2_1.value;
            if (finalIsList !== hasListType(c.type)) {
                throw new Error("Definitions of " + definitionType + " \"" + settingNamespace + "\" implement inconsistent list types across subschemas and cannot be merged.");
            }
            var currentNamedType = getNamedType(c.type);
            if (finalNamedType.toString() !== currentNamedType.toString()) {
                var proxiableScalar = !!((_d = (_c = (_b = typeMergingOptions === null || typeMergingOptions === void 0 ? void 0 : typeMergingOptions.validationSettings) === null || _b === void 0 ? void 0 : _b.proxiableScalars) === null || _c === void 0 ? void 0 : _c[finalNamedType.toString()]) === null || _d === void 0 ? void 0 : _d.includes(currentNamedType.toString()));
                var bothScalars = finalIsScalar && isScalarType(currentNamedType);
                var permitScalar = proxiableScalar && bothScalars;
                if (proxiableScalar && !bothScalars) {
                    throw new Error("Types " + finalNamedType + " and " + currentNamedType + " are not proxiable scalars.");
                }
                if (!permitScalar) {
                    validationMessage("Definitions of " + definitionType + " \"" + settingNamespace + "\" implement inconsistent named types across subschemas. This will be an automatic error in future versions.", settingNamespace, typeMergingOptions);
                }
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (candidates_2_1 && !candidates_2_1.done && (_a = candidates_2.return)) _a.call(candidates_2);
        }
        finally { if (e_2) throw e_2.error; }
    }
}
function hasListType(type) {
    return isListType(getNullableType(type));
}
export function validateInputEnumConsistency(inputEnumType, candidates, typeMergingOptions) {
    var e_3, _a, e_4, _b;
    var enumValueInclusionMap = Object.create(null);
    try {
        for (var candidates_3 = __values(candidates), candidates_3_1 = candidates_3.next(); !candidates_3_1.done; candidates_3_1 = candidates_3.next()) {
            var candidate = candidates_3_1.value;
            var enumType = getNamedType(candidate.type);
            if (isEnumType(enumType)) {
                try {
                    for (var _c = (e_4 = void 0, __values(enumType.getValues())), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var value = _d.value.value;
                        enumValueInclusionMap[value] = enumValueInclusionMap[value] || 0;
                        enumValueInclusionMap[value] += 1;
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
            }
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (candidates_3_1 && !candidates_3_1.done && (_a = candidates_3.return)) _a.call(candidates_3);
        }
        finally { if (e_3) throw e_3.error; }
    }
    if (Object.values(enumValueInclusionMap).some(function (count) { return candidates.length !== count; })) {
        validationMessage("Enum \"" + inputEnumType.name + "\" is used as an input with inconsistent values across subschemas. This will be an automatic error in future versions.", inputEnumType.name, typeMergingOptions);
    }
}
function validationMessage(message, settingNamespace, typeMergingOptions) {
    var _a;
    var override = "typeMergingOptions.validationScopes['" + settingNamespace + "'].validationLevel";
    var settings = getValidationSettings(settingNamespace, typeMergingOptions);
    switch ((_a = settings.validationLevel) !== null && _a !== void 0 ? _a : ValidationLevel.Warn) {
        case ValidationLevel.Off:
            return;
        case ValidationLevel.Error:
            throw new Error(message + " If this is intentional, you may disable this error by setting " + override + " = \"warn|off\"");
        default:
            console.warn(message + " To disable this warning or elevate it to an error, set " + override + " = \"error|off\"");
    }
}
function getValidationSettings(settingNamespace, typeMergingOptions) {
    var _a, _b, _c;
    return __assign(__assign({}, ((_a = typeMergingOptions === null || typeMergingOptions === void 0 ? void 0 : typeMergingOptions.validationSettings) !== null && _a !== void 0 ? _a : {})), ((_c = (_b = typeMergingOptions === null || typeMergingOptions === void 0 ? void 0 : typeMergingOptions.validationScopes) === null || _b === void 0 ? void 0 : _b[settingNamespace]) !== null && _c !== void 0 ? _c : {}));
}
