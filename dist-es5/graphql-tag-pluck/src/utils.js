import { __read, __spreadArray } from "tslib";
// Will use the shortest indention as an axis
export var freeText = function (text, skipIndentation) {
    if (skipIndentation === void 0) { skipIndentation = false; }
    if (text instanceof Array) {
        text = text.join('');
    }
    // This will allow inline text generation with external functions, same as ctrl+shift+c
    // As long as we surround the inline text with ==>text<==
    text = text.replace(/( *)==>((?:.|\n)*?)<==/g, function (_match, baseIndent, content) {
        return content
            .split('\n')
            .map(function (line) { return "" + baseIndent + line; })
            .join('\n');
    });
    if (skipIndentation) {
        return text;
    }
    var lines = text.split('\n');
    var minIndent = lines
        .filter(function (line) { return line.trim(); })
        .reduce(function (minIndent, line) {
        var _a;
        var currIndent = (_a = line.match(/^ */)) === null || _a === void 0 ? void 0 : _a[0].length;
        if (currIndent == null) {
            return minIndent;
        }
        return currIndent < minIndent ? currIndent : minIndent;
    }, Infinity);
    return lines
        .map(function (line) { return line.slice(minIndent); })
        .join('\n')
        .trim()
        .replace(/\n +\n/g, '\n\n');
};
// foo_barBaz -> ['foo', 'bar', 'Baz']
export var splitWords = function (str) {
    return str.replace(/[A-Z]/, ' $&').split(/[^a-zA-Z0-9]+/);
};
// upper -> Upper
export var toUpperFirst = function (str) {
    return str.substr(0, 1).toUpperCase() + str.substr(1).toLowerCase();
};
// foo-bar-baz -> fooBarBaz
export var toCamelCase = function (str) {
    var _a, _b;
    var words = splitWords(str);
    var first = (_b = (_a = words.shift()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== null && _b !== void 0 ? _b : '';
    var rest = words.map(toUpperFirst);
    return __spreadArray([first], __read(rest), false).join('');
};
