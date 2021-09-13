import { __values } from "tslib";
import { isSome } from './helpers';
// eslint-disable-next-line @typescript-eslint/ban-types
export function mergeDeep(sources, respectPrototype) {
    var e_1, _a, e_2, _b, _c, _d;
    if (respectPrototype === void 0) { respectPrototype = false; }
    var target = sources[0] || {};
    var output = {};
    if (respectPrototype) {
        Object.setPrototypeOf(output, Object.create(Object.getPrototypeOf(target)));
    }
    try {
        for (var sources_1 = __values(sources), sources_1_1 = sources_1.next(); !sources_1_1.done; sources_1_1 = sources_1.next()) {
            var source = sources_1_1.value;
            if (isObject(target) && isObject(source)) {
                if (respectPrototype) {
                    var outputPrototype = Object.getPrototypeOf(output);
                    var sourcePrototype = Object.getPrototypeOf(source);
                    if (sourcePrototype) {
                        try {
                            for (var _e = (e_2 = void 0, __values(Object.getOwnPropertyNames(sourcePrototype))), _f = _e.next(); !_f.done; _f = _e.next()) {
                                var key = _f.value;
                                var descriptor = Object.getOwnPropertyDescriptor(sourcePrototype, key);
                                if (isSome(descriptor)) {
                                    Object.defineProperty(outputPrototype, key, descriptor);
                                }
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
                }
                for (var key in source) {
                    if (isObject(source[key])) {
                        if (!(key in output)) {
                            Object.assign(output, (_c = {}, _c[key] = source[key], _c));
                        }
                        else {
                            output[key] = mergeDeep([output[key], source[key]], respectPrototype);
                        }
                    }
                    else {
                        Object.assign(output, (_d = {}, _d[key] = source[key], _d));
                    }
                }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (sources_1_1 && !sources_1_1.done && (_a = sources_1.return)) _a.call(sources_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return output;
}
function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}
