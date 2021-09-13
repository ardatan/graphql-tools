import { __values } from "tslib";
export function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        // eslint-disable-next-line eqeqeq
        var v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
export var randomListLength = function () {
    // Mocking has always returned list of length 2 by default
    // return 1 + Math.round(Math.random() * 10)
    return 2;
};
export var takeRandom = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
export function makeRef(typeName, key) {
    return { $ref: { key: key, typeName: typeName } };
}
export function isObject(thing) {
    return thing === Object(thing) && !Array.isArray(thing);
}
export function copyOwnPropsIfNotPresent(target, source) {
    var e_1, _a;
    try {
        for (var _b = __values(Object.getOwnPropertyNames(source)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var prop = _c.value;
            if (!Object.getOwnPropertyDescriptor(target, prop)) {
                var propertyDescriptor = Object.getOwnPropertyDescriptor(source, prop);
                Object.defineProperty(target, prop, propertyDescriptor == null ? {} : propertyDescriptor);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
}
export function copyOwnProps(target) {
    var e_2, _a;
    var sources = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        sources[_i - 1] = arguments[_i];
    }
    try {
        for (var sources_1 = __values(sources), sources_1_1 = sources_1.next(); !sources_1_1.done; sources_1_1 = sources_1.next()) {
            var source = sources_1_1.value;
            var chain = source;
            while (chain != null) {
                copyOwnPropsIfNotPresent(target, chain);
                chain = Object.getPrototypeOf(chain);
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (sources_1_1 && !sources_1_1.done && (_a = sources_1.return)) _a.call(sources_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return target;
}
