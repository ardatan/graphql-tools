import { __values } from "tslib";
/**
 * @internal
 */
export function pick(obj, keys) {
    var e_1, _a;
    try {
        for (var keys_1 = __values(keys), keys_1_1 = keys_1.next(); !keys_1_1.done; keys_1_1 = keys_1.next()) {
            var key = keys_1_1.value;
            if (obj[key]) {
                return obj[key];
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (keys_1_1 && !keys_1_1.done && (_a = keys_1.return)) _a.call(keys_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return obj;
}
// checkers
/**
 * @internal
 */
export function isSchemaText(obj) {
    return typeof obj === 'string';
}
/**
 * @internal
 */
export function isWrappedSchemaJson(obj) {
    var json = obj;
    return json.data !== undefined && json.data.__schema !== undefined;
}
/**
 * @internal
 */
export function isSchemaJson(obj) {
    var json = obj;
    return json !== undefined && json.__schema !== undefined;
}
/**
 * @internal
 */
export function isSchemaAst(obj) {
    return obj.kind !== undefined;
}
