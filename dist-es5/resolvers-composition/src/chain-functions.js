import { __read, __spreadArray } from "tslib";
export function chainFunctions(funcs) {
    if (funcs.length === 1) {
        return funcs[0];
    }
    return funcs.reduce(function (a, b) { return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return a(b.apply(void 0, __spreadArray([], __read(args), false)));
    }; });
}
