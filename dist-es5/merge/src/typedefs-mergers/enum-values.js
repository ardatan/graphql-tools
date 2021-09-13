import { __read, __spreadArray, __values } from "tslib";
import { mergeDirectives } from './directives';
import { compareNodes } from '@graphql-tools/utils';
export function mergeEnumValues(first, second, config) {
    var e_1, _a, e_2, _b;
    if (config === null || config === void 0 ? void 0 : config.consistentEnumMerge) {
        var reversed = [];
        if (first) {
            reversed.push.apply(reversed, __spreadArray([], __read(first), false));
        }
        first = second;
        second = reversed;
    }
    var enumValueMap = new Map();
    if (first) {
        try {
            for (var first_1 = __values(first), first_1_1 = first_1.next(); !first_1_1.done; first_1_1 = first_1.next()) {
                var firstValue = first_1_1.value;
                enumValueMap.set(firstValue.name.value, firstValue);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (first_1_1 && !first_1_1.done && (_a = first_1.return)) _a.call(first_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    if (second) {
        try {
            for (var second_1 = __values(second), second_1_1 = second_1.next(); !second_1_1.done; second_1_1 = second_1.next()) {
                var secondValue = second_1_1.value;
                var enumValue = secondValue.name.value;
                if (enumValueMap.has(enumValue)) {
                    var firstValue = enumValueMap.get(enumValue);
                    firstValue.description = secondValue.description || firstValue.description;
                    firstValue.directives = mergeDirectives(secondValue.directives, firstValue.directives);
                }
                else {
                    enumValueMap.set(enumValue, secondValue);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (second_1_1 && !second_1_1.done && (_b = second_1.return)) _b.call(second_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    var result = __spreadArray([], __read(enumValueMap.values()), false);
    if (config && config.sort) {
        result.sort(compareNodes);
    }
    return result;
}
