import { __assign, __read, __values } from "tslib";
import { valueFromAST, isNonNullType, GraphQLError, Kind, print, } from 'graphql';
import { inspect } from './inspect';
/**
 * Prepares an object map of argument values given a list of argument
 * definitions and list of argument AST nodes.
 *
 * Note: The returned value is a plain Object with a prototype, since it is
 * exposed to user code. Care should be taken to not pull values from the
 * Object prototype.
 */
export function getArgumentValues(def, node, variableValues) {
    var e_1, _a;
    var _b;
    if (variableValues === void 0) { variableValues = {}; }
    var variableMap = Object.entries(variableValues).reduce(function (prev, _a) {
        var _b;
        var _c = __read(_a, 2), key = _c[0], value = _c[1];
        return (__assign(__assign({}, prev), (_b = {}, _b[key] = value, _b)));
    }, {});
    var coercedValues = {};
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    var argumentNodes = (_b = node.arguments) !== null && _b !== void 0 ? _b : [];
    var argNodeMap = argumentNodes.reduce(function (prev, arg) {
        var _a;
        return (__assign(__assign({}, prev), (_a = {}, _a[arg.name.value] = arg, _a)));
    }, {});
    try {
        for (var _c = __values(def.args), _d = _c.next(); !_d.done; _d = _c.next()) {
            var _e = _d.value, name_1 = _e.name, argType = _e.type, defaultValue = _e.defaultValue;
            var argumentNode = argNodeMap[name_1];
            if (!argumentNode) {
                if (defaultValue !== undefined) {
                    coercedValues[name_1] = defaultValue;
                }
                else if (isNonNullType(argType)) {
                    throw new GraphQLError("Argument \"" + name_1 + "\" of required type \"" + inspect(argType) + "\" " + 'was not provided.', node);
                }
                continue;
            }
            var valueNode = argumentNode.value;
            var isNull = valueNode.kind === Kind.NULL;
            if (valueNode.kind === Kind.VARIABLE) {
                var variableName = valueNode.name.value;
                if (variableValues == null || !variableMap[variableName]) {
                    if (defaultValue !== undefined) {
                        coercedValues[name_1] = defaultValue;
                    }
                    else if (isNonNullType(argType)) {
                        throw new GraphQLError("Argument \"" + name_1 + "\" of required type \"" + inspect(argType) + "\" " +
                            ("was provided the variable \"$" + variableName + "\" which was not provided a runtime value."), valueNode);
                    }
                    continue;
                }
                isNull = variableValues[variableName] == null;
            }
            if (isNull && isNonNullType(argType)) {
                throw new GraphQLError("Argument \"" + name_1 + "\" of non-null type \"" + inspect(argType) + "\" " + 'must not be null.', valueNode);
            }
            var coercedValue = valueFromAST(valueNode, argType, variableValues);
            if (coercedValue === undefined) {
                // Note: ValuesOfCorrectTypeRule validation should catch this before
                // execution. This is a runtime check to ensure execution does not
                // continue with an invalid argument value.
                throw new GraphQLError("Argument \"" + name_1 + "\" has invalid value " + print(valueNode) + ".", valueNode);
            }
            coercedValues[name_1] = coercedValue;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return coercedValues;
}
