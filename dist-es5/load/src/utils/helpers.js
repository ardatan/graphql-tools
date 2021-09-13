import pLimit from 'p-limit';
/**
 * Converts a string to 32bit integer
 */
export function stringToHash(str) {
    var hash = 0;
    if (str.length === 0) {
        return hash;
    }
    var char;
    for (var i = 0; i < str.length; i++) {
        char = str.charCodeAt(i);
        // tslint:disable-next-line: no-bitwise
        hash = (hash << 5) - hash + char;
        // tslint:disable-next-line: no-bitwise
        hash = hash & hash;
    }
    return hash;
}
export function useStack() {
    var fns = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        fns[_i] = arguments[_i];
    }
    return function (input) {
        function createNext(i) {
            if (i >= fns.length) {
                return function () { };
            }
            return function next() {
                fns[i](input, createNext(i + 1));
            };
        }
        fns[0](input, createNext(1));
    };
}
export function useLimit(concurrency) {
    return pLimit(concurrency);
}
