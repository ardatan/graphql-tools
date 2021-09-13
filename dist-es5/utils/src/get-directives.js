import { __read, __spreadArray, __values } from "tslib";
import { getArgumentValues } from './getArgumentValues';
export function getDirectivesInExtensions(node, pathToDirectivesInExtensions) {
    if (pathToDirectivesInExtensions === void 0) { pathToDirectivesInExtensions = ['directives']; }
    return pathToDirectivesInExtensions.reduce(function (acc, pathSegment) { return (acc == null ? acc : acc[pathSegment]); }, node === null || node === void 0 ? void 0 : node.extensions);
}
function _getDirectiveInExtensions(directivesInExtensions, directiveName) {
    var directiveInExtensions = directivesInExtensions.filter(function (directiveAnnotation) { return directiveAnnotation.name === directiveName; });
    if (!directiveInExtensions.length) {
        return undefined;
    }
    return directiveInExtensions.map(function (directive) { var _a; return (_a = directive.args) !== null && _a !== void 0 ? _a : {}; });
}
export function getDirectiveInExtensions(node, directiveName, pathToDirectivesInExtensions) {
    var e_1, _a, e_2, _b;
    if (pathToDirectivesInExtensions === void 0) { pathToDirectivesInExtensions = ['directives']; }
    var directivesInExtensions = pathToDirectivesInExtensions.reduce(function (acc, pathSegment) { return (acc == null ? acc : acc[pathSegment]); }, node === null || node === void 0 ? void 0 : node.extensions);
    if (directivesInExtensions === undefined) {
        return undefined;
    }
    if (Array.isArray(directivesInExtensions)) {
        return _getDirectiveInExtensions(directivesInExtensions, directiveName);
    }
    // Support condensed format by converting to longer format
    // The condensed format does not preserve ordering of directives when  repeatable directives are used.
    // See https://github.com/ardatan/graphql-tools/issues/2534
    var reformattedDirectivesInExtensions = [];
    try {
        for (var _c = __values(Object.entries(directivesInExtensions)), _d = _c.next(); !_d.done; _d = _c.next()) {
            var _e = __read(_d.value, 2), name_1 = _e[0], argsOrArrayOfArgs = _e[1];
            if (Array.isArray(argsOrArrayOfArgs)) {
                try {
                    for (var argsOrArrayOfArgs_1 = (e_2 = void 0, __values(argsOrArrayOfArgs)), argsOrArrayOfArgs_1_1 = argsOrArrayOfArgs_1.next(); !argsOrArrayOfArgs_1_1.done; argsOrArrayOfArgs_1_1 = argsOrArrayOfArgs_1.next()) {
                        var args = argsOrArrayOfArgs_1_1.value;
                        reformattedDirectivesInExtensions.push({ name: name_1, args: args });
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (argsOrArrayOfArgs_1_1 && !argsOrArrayOfArgs_1_1.done && (_b = argsOrArrayOfArgs_1.return)) _b.call(argsOrArrayOfArgs_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            else {
                reformattedDirectivesInExtensions.push({ name: name_1, args: argsOrArrayOfArgs });
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
    return _getDirectiveInExtensions(reformattedDirectivesInExtensions, directiveName);
}
export function getDirectives(schema, node, pathToDirectivesInExtensions) {
    var e_3, _a, e_4, _b;
    if (pathToDirectivesInExtensions === void 0) { pathToDirectivesInExtensions = ['directives']; }
    var directivesInExtensions = getDirectivesInExtensions(node, pathToDirectivesInExtensions);
    if (directivesInExtensions != null && directivesInExtensions.length > 0) {
        return directivesInExtensions;
    }
    var schemaDirectives = schema && schema.getDirectives ? schema.getDirectives() : [];
    var schemaDirectiveMap = schemaDirectives.reduce(function (schemaDirectiveMap, schemaDirective) {
        schemaDirectiveMap[schemaDirective.name] = schemaDirective;
        return schemaDirectiveMap;
    }, {});
    var astNodes = [];
    if (node.astNode) {
        astNodes.push(node.astNode);
    }
    if ('extensionASTNodes' in node && node.extensionASTNodes) {
        astNodes = __spreadArray(__spreadArray([], __read(astNodes), false), __read(node.extensionASTNodes), false);
    }
    var result = [];
    try {
        for (var astNodes_1 = __values(astNodes), astNodes_1_1 = astNodes_1.next(); !astNodes_1_1.done; astNodes_1_1 = astNodes_1.next()) {
            var astNode = astNodes_1_1.value;
            if (astNode.directives) {
                try {
                    for (var _c = (e_4 = void 0, __values(astNode.directives)), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var directiveNode = _d.value;
                        var schemaDirective = schemaDirectiveMap[directiveNode.name.value];
                        if (schemaDirective) {
                            result.push({ name: directiveNode.name.value, args: getArgumentValues(schemaDirective, directiveNode) });
                        }
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
            }
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (astNodes_1_1 && !astNodes_1_1.done && (_a = astNodes_1.return)) _a.call(astNodes_1);
        }
        finally { if (e_3) throw e_3.error; }
    }
    return result;
}
export function getDirective(schema, node, directiveName, pathToDirectivesInExtensions) {
    var e_5, _a, e_6, _b;
    if (pathToDirectivesInExtensions === void 0) { pathToDirectivesInExtensions = ['directives']; }
    var directiveInExtensions = getDirectiveInExtensions(node, directiveName, pathToDirectivesInExtensions);
    if (directiveInExtensions != null) {
        return directiveInExtensions;
    }
    var schemaDirective = schema && schema.getDirective ? schema.getDirective(directiveName) : undefined;
    if (schemaDirective == null) {
        return undefined;
    }
    var astNodes = [];
    if (node.astNode) {
        astNodes.push(node.astNode);
    }
    if ('extensionASTNodes' in node && node.extensionASTNodes) {
        astNodes = __spreadArray(__spreadArray([], __read(astNodes), false), __read(node.extensionASTNodes), false);
    }
    var result = [];
    try {
        for (var astNodes_2 = __values(astNodes), astNodes_2_1 = astNodes_2.next(); !astNodes_2_1.done; astNodes_2_1 = astNodes_2.next()) {
            var astNode = astNodes_2_1.value;
            if (astNode.directives) {
                try {
                    for (var _c = (e_6 = void 0, __values(astNode.directives)), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var directiveNode = _d.value;
                        if (directiveNode.name.value === directiveName) {
                            result.push(getArgumentValues(schemaDirective, directiveNode));
                        }
                    }
                }
                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                    }
                    finally { if (e_6) throw e_6.error; }
                }
            }
        }
    }
    catch (e_5_1) { e_5 = { error: e_5_1 }; }
    finally {
        try {
            if (astNodes_2_1 && !astNodes_2_1.done && (_a = astNodes_2.return)) _a.call(astNodes_2);
        }
        finally { if (e_5) throw e_5.error; }
    }
    if (!result.length) {
        return undefined;
    }
    return result;
}
