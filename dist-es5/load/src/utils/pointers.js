import { __read, __values } from "tslib";
import { asArray } from '@graphql-tools/utils';
export function normalizePointers(unnormalizedPointerOrPointers) {
    var e_1, _a, e_2, _b;
    var ignore = [];
    var pointerOptionMap = {};
    var handlePointer = function (rawPointer, options) {
        if (options === void 0) { options = {}; }
        if (rawPointer.startsWith('!')) {
            ignore.push(rawPointer.replace('!', ''));
        }
        else {
            pointerOptionMap[rawPointer] = options;
        }
    };
    try {
        for (var _c = __values(asArray(unnormalizedPointerOrPointers)), _d = _c.next(); !_d.done; _d = _c.next()) {
            var rawPointer = _d.value;
            if (typeof rawPointer === 'string') {
                handlePointer(rawPointer);
            }
            else if (typeof rawPointer === 'object') {
                try {
                    for (var _e = (e_2 = void 0, __values(Object.entries(rawPointer))), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var _g = __read(_f.value, 2), path = _g[0], options = _g[1];
                        handlePointer(path, options);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            else {
                throw new Error("Invalid pointer '" + rawPointer + "'.");
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return { ignore: ignore, pointerOptionMap: pointerOptionMap };
}
