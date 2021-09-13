import { __assign, __read, __spreadArray, __values } from "tslib";
import { print } from 'graphql';
import { isSome } from '@graphql-tools/utils';
function directiveAlreadyExists(directivesArr, otherDirective) {
    return !!directivesArr.find(function (directive) { return directive.name.value === otherDirective.name.value; });
}
function nameAlreadyExists(name, namesArr) {
    return namesArr.some(function (_a) {
        var value = _a.value;
        return value === name.value;
    });
}
function mergeArguments(a1, a2) {
    var e_1, _a;
    var result = __spreadArray([], __read(a2), false);
    var _loop_1 = function (argument) {
        var existingIndex = result.findIndex(function (a) { return a.name.value === argument.name.value; });
        if (existingIndex > -1) {
            var existingArg = result[existingIndex];
            if (existingArg.value.kind === 'ListValue') {
                var source = existingArg.value.values;
                var target = argument.value.values;
                // merge values of two lists
                existingArg.value.values = deduplicateLists(source, target, function (targetVal, source) {
                    var value = targetVal.value;
                    return !value || !source.some(function (sourceVal) { return sourceVal.value === value; });
                });
            }
            else {
                existingArg.value = argument.value;
            }
        }
        else {
            result.push(argument);
        }
    };
    try {
        for (var a1_1 = __values(a1), a1_1_1 = a1_1.next(); !a1_1_1.done; a1_1_1 = a1_1.next()) {
            var argument = a1_1_1.value;
            _loop_1(argument);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (a1_1_1 && !a1_1_1.done && (_a = a1_1.return)) _a.call(a1_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return result;
}
function deduplicateDirectives(directives) {
    return directives
        .map(function (directive, i, all) {
        var firstAt = all.findIndex(function (d) { return d.name.value === directive.name.value; });
        if (firstAt !== i) {
            var dup = all[firstAt];
            directive.arguments = mergeArguments(directive.arguments, dup.arguments);
            return null;
        }
        return directive;
    })
        .filter(isSome);
}
export function mergeDirectives(d1, d2, config) {
    var e_2, _a;
    if (d1 === void 0) { d1 = []; }
    if (d2 === void 0) { d2 = []; }
    var reverseOrder = config && config.reverseDirectives;
    var asNext = reverseOrder ? d1 : d2;
    var asFirst = reverseOrder ? d2 : d1;
    var result = deduplicateDirectives(__spreadArray([], __read(asNext), false));
    var _loop_2 = function (directive) {
        if (directiveAlreadyExists(result, directive)) {
            var existingDirectiveIndex = result.findIndex(function (d) { return d.name.value === directive.name.value; });
            var existingDirective = result[existingDirectiveIndex];
            result[existingDirectiveIndex].arguments = mergeArguments(directive.arguments || [], existingDirective.arguments || []);
        }
        else {
            result.push(directive);
        }
    };
    try {
        for (var asFirst_1 = __values(asFirst), asFirst_1_1 = asFirst_1.next(); !asFirst_1_1.done; asFirst_1_1 = asFirst_1.next()) {
            var directive = asFirst_1_1.value;
            _loop_2(directive);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (asFirst_1_1 && !asFirst_1_1.done && (_a = asFirst_1.return)) _a.call(asFirst_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return result;
}
function validateInputs(node, existingNode) {
    var printedNode = print(__assign(__assign({}, node), { description: undefined }));
    var printedExistingNode = print(__assign(__assign({}, existingNode), { description: undefined }));
    // eslint-disable-next-line
    var leaveInputs = new RegExp('(directive @w*d*)|( on .*$)', 'g');
    var sameArguments = printedNode.replace(leaveInputs, '') === printedExistingNode.replace(leaveInputs, '');
    if (!sameArguments) {
        throw new Error("Unable to merge GraphQL directive \"" + node.name.value + "\". \nExisting directive:  \n\t" + printedExistingNode + " \nReceived directive: \n\t" + printedNode);
    }
}
export function mergeDirective(node, existingNode) {
    if (existingNode) {
        validateInputs(node, existingNode);
        return __assign(__assign({}, node), { locations: __spreadArray(__spreadArray([], __read(existingNode.locations), false), __read(node.locations.filter(function (name) { return !nameAlreadyExists(name, existingNode.locations); })), false) });
    }
    return node;
}
function deduplicateLists(source, target, filterFn) {
    return source.concat(target.filter(function (val) { return filterFn(val, source); }));
}
