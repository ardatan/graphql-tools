import { __read, __spreadArray, __values } from "tslib";
import { extractType, isWrappingTypeNode, isListTypeNode, isNonNullTypeNode, printTypeNode } from './utils';
import { mergeDirectives } from './directives';
import { compareNodes } from '@graphql-tools/utils';
import { mergeArguments } from './arguments';
function fieldAlreadyExists(fieldsArr, otherField, config) {
    var result = fieldsArr.find(function (field) { return field.name.value === otherField.name.value; });
    if (result && !(config === null || config === void 0 ? void 0 : config.ignoreFieldConflicts)) {
        var t1 = extractType(result.type);
        var t2 = extractType(otherField.type);
        if (t1.name.value !== t2.name.value) {
            throw new Error("Field \"" + otherField.name.value + "\" already defined with a different type. Declared as \"" + t1.name.value + "\", but you tried to override with \"" + t2.name.value + "\"");
        }
    }
    return !!result;
}
export function mergeFields(type, f1, f2, config) {
    var e_1, _a;
    var result = [];
    if (f2 != null) {
        result.push.apply(result, __spreadArray([], __read(f2), false));
    }
    if (f1 != null) {
        var _loop_1 = function (field) {
            if (fieldAlreadyExists(result, field, config)) {
                var existing = result.find(function (f) { return f.name.value === field.name.value; });
                if (!(config === null || config === void 0 ? void 0 : config.ignoreFieldConflicts)) {
                    if (config === null || config === void 0 ? void 0 : config.throwOnConflict) {
                        preventConflicts(type, existing, field, false);
                    }
                    else {
                        preventConflicts(type, existing, field, true);
                    }
                    if (isNonNullTypeNode(field.type) && !isNonNullTypeNode(existing.type)) {
                        existing.type = field.type;
                    }
                }
                existing.arguments = mergeArguments(field['arguments'] || [], existing.arguments || [], config);
                existing.directives = mergeDirectives(field.directives, existing.directives, config);
                existing.description = field.description || existing.description;
            }
            else {
                result.push(field);
            }
        };
        try {
            for (var f1_1 = __values(f1), f1_1_1 = f1_1.next(); !f1_1_1.done; f1_1_1 = f1_1.next()) {
                var field = f1_1_1.value;
                _loop_1(field);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (f1_1_1 && !f1_1_1.done && (_a = f1_1.return)) _a.call(f1_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    if (config && config.sort) {
        result.sort(compareNodes);
    }
    if (config && config.exclusions) {
        var exclusions_1 = config.exclusions;
        return result.filter(function (field) { return !exclusions_1.includes(type.name.value + "." + field.name.value); });
    }
    return result;
}
function preventConflicts(type, a, b, ignoreNullability) {
    if (ignoreNullability === void 0) { ignoreNullability = false; }
    var aType = printTypeNode(a.type);
    var bType = printTypeNode(b.type);
    if (aType !== bType && !safeChangeForFieldType(a.type, b.type, ignoreNullability)) {
        throw new Error("Field '" + type.name.value + "." + a.name.value + "' changed type from '" + aType + "' to '" + bType + "'");
    }
}
function safeChangeForFieldType(oldType, newType, ignoreNullability) {
    if (ignoreNullability === void 0) { ignoreNullability = false; }
    // both are named
    if (!isWrappingTypeNode(oldType) && !isWrappingTypeNode(newType)) {
        return oldType.toString() === newType.toString();
    }
    // new is non-null
    if (isNonNullTypeNode(newType)) {
        var ofType = isNonNullTypeNode(oldType) ? oldType.type : oldType;
        return safeChangeForFieldType(ofType, newType.type);
    }
    // old is non-null
    if (isNonNullTypeNode(oldType)) {
        return safeChangeForFieldType(newType, oldType, ignoreNullability);
    }
    // old is list
    if (isListTypeNode(oldType)) {
        return ((isListTypeNode(newType) && safeChangeForFieldType(oldType.type, newType.type)) ||
            (isNonNullTypeNode(newType) && safeChangeForFieldType(oldType, newType['type'])));
    }
    return false;
}
