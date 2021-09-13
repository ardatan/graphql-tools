import { __assign, __read, __spreadArray, __values } from "tslib";
import { getNamedType, isAbstractType, isInterfaceType, isObjectType, Kind, TypeInfo, TypeNameMetaFieldDef, versionInfo as graphqlVersionInfo, visit, visitWithTypeInfo, } from 'graphql';
import { getDefinedRootType, serializeInputValue, updateArgument, createVariableNameGenerator, implementsAbstractType, inspect, } from '@graphql-tools/utils';
import { getDocumentMetadata } from './getDocumentMetadata';
function finalizeGatewayDocument(targetSchema, fragments, operations) {
    var e_1, _a, e_2, _b;
    var _c;
    var usedVariables = [];
    var usedFragments = [];
    var newOperations = [];
    var newFragments = [];
    var validFragments = [];
    var validFragmentsWithType = Object.create(null);
    try {
        for (var fragments_1 = __values(fragments), fragments_1_1 = fragments_1.next(); !fragments_1_1.done; fragments_1_1 = fragments_1.next()) {
            var fragment = fragments_1_1.value;
            var typeName = fragment.typeCondition.name.value;
            var type = targetSchema.getType(typeName);
            if (type != null) {
                validFragments.push(fragment);
                validFragmentsWithType[fragment.name.value] = type;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (fragments_1_1 && !fragments_1_1.done && (_a = fragments_1.return)) _a.call(fragments_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    var fragmentSet = Object.create(null);
    var _loop_1 = function (operation) {
        var type = getDefinedRootType(targetSchema, operation.operation);
        var _d = finalizeSelectionSet(targetSchema, type, validFragmentsWithType, operation.selectionSet), selectionSet = _d.selectionSet, operationUsedFragments = _d.usedFragments, operationUsedVariables = _d.usedVariables;
        usedFragments = union(usedFragments, operationUsedFragments);
        var _e = collectFragmentVariables(targetSchema, fragmentSet, validFragments, validFragmentsWithType, usedFragments), collectedUsedVariables = _e.usedVariables, collectedNewFragments = _e.newFragments, collectedFragmentSet = _e.fragmentSet;
        var operationOrFragmentVariables = union(operationUsedVariables, collectedUsedVariables);
        usedVariables = union(usedVariables, operationOrFragmentVariables);
        newFragments = collectedNewFragments;
        fragmentSet = collectedFragmentSet;
        var variableDefinitions = ((_c = operation.variableDefinitions) !== null && _c !== void 0 ? _c : []).filter(function (variable) { return operationOrFragmentVariables.indexOf(variable.variable.name.value) !== -1; });
        newOperations.push({
            kind: Kind.OPERATION_DEFINITION,
            operation: operation.operation,
            name: operation.name,
            directives: operation.directives,
            variableDefinitions: variableDefinitions,
            selectionSet: selectionSet,
        });
    };
    try {
        for (var operations_1 = __values(operations), operations_1_1 = operations_1.next(); !operations_1_1.done; operations_1_1 = operations_1.next()) {
            var operation = operations_1_1.value;
            _loop_1(operation);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (operations_1_1 && !operations_1_1.done && (_b = operations_1.return)) _b.call(operations_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return {
        usedVariables: usedVariables,
        newDocument: {
            kind: Kind.DOCUMENT,
            definitions: __spreadArray(__spreadArray([], __read(newOperations), false), __read(newFragments), false),
        },
    };
}
export function finalizeGatewayRequest(originalRequest, delegationContext) {
    var e_3, _a;
    var document = originalRequest.document, variables = originalRequest.variables;
    var _b = getDocumentMetadata(document), operations = _b.operations, fragments = _b.fragments;
    var targetSchema = delegationContext.targetSchema, args = delegationContext.args;
    if (args) {
        var requestWithNewVariables = addVariablesToRootFields(targetSchema, operations, args);
        operations = requestWithNewVariables.newOperations;
        variables = Object.assign({}, variables !== null && variables !== void 0 ? variables : {}, requestWithNewVariables.newVariables);
    }
    var _c = finalizeGatewayDocument(targetSchema, fragments, operations), usedVariables = _c.usedVariables, newDocument = _c.newDocument;
    var newVariables = {};
    if (variables != null) {
        try {
            for (var usedVariables_1 = __values(usedVariables), usedVariables_1_1 = usedVariables_1.next(); !usedVariables_1_1.done; usedVariables_1_1 = usedVariables_1.next()) {
                var variableName = usedVariables_1_1.value;
                var variableValue = variables[variableName];
                if (variableValue !== undefined) {
                    newVariables[variableName] = variableValue;
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (usedVariables_1_1 && !usedVariables_1_1.done && (_a = usedVariables_1.return)) _a.call(usedVariables_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
    }
    return __assign(__assign({}, originalRequest), { document: newDocument, variables: newVariables });
}
function addVariablesToRootFields(targetSchema, operations, args) {
    var newVariables = Object.create(null);
    var newOperations = operations.map(function (operation) {
        var e_4, _a;
        var _b, _c;
        var variableDefinitionMap = ((_b = operation.variableDefinitions) !== null && _b !== void 0 ? _b : []).reduce(function (prev, def) {
            var _a;
            return (__assign(__assign({}, prev), (_a = {}, _a[def.variable.name.value] = def, _a)));
        }, {});
        var type = getDefinedRootType(targetSchema, operation.operation);
        var newSelectionSet = [];
        try {
            for (var _d = __values(operation.selectionSet.selections), _e = _d.next(); !_e.done; _e = _d.next()) {
                var selection = _e.value;
                if (selection.kind === Kind.FIELD) {
                    var argumentNodes = (_c = selection.arguments) !== null && _c !== void 0 ? _c : [];
                    var argumentNodeMap = argumentNodes.reduce(function (prev, argument) {
                        var _a;
                        return (__assign(__assign({}, prev), (_a = {}, _a[argument.name.value] = argument, _a)));
                    }, {});
                    var targetField = type.getFields()[selection.name.value];
                    // excludes __typename
                    if (targetField != null) {
                        updateArguments(targetField, argumentNodeMap, variableDefinitionMap, newVariables, args);
                    }
                    newSelectionSet.push(__assign(__assign({}, selection), { arguments: Object.values(argumentNodeMap) }));
                }
                else {
                    newSelectionSet.push(selection);
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
            }
            finally { if (e_4) throw e_4.error; }
        }
        return __assign(__assign({}, operation), { variableDefinitions: Object.values(variableDefinitionMap), selectionSet: {
                kind: Kind.SELECTION_SET,
                selections: newSelectionSet,
            } });
    });
    return {
        newOperations: newOperations,
        newVariables: newVariables,
    };
}
function updateArguments(targetField, argumentNodeMap, variableDefinitionMap, variableValues, newArgs) {
    var e_5, _a;
    var generateVariableName = createVariableNameGenerator(variableDefinitionMap);
    try {
        for (var _b = __values(targetField.args), _c = _b.next(); !_c.done; _c = _b.next()) {
            var argument = _c.value;
            var argName = argument.name;
            var argType = argument.type;
            if (argName in newArgs) {
                updateArgument(argumentNodeMap, variableDefinitionMap, variableValues, argName, generateVariableName(argName), argType, serializeInputValue(argType, newArgs[argName]));
            }
        }
    }
    catch (e_5_1) { e_5 = { error: e_5_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_5) throw e_5.error; }
    }
}
function collectFragmentVariables(targetSchema, fragmentSet, validFragments, validFragmentsWithType, usedFragments) {
    var remainingFragments = usedFragments.slice();
    var usedVariables = [];
    var newFragments = [];
    var _loop_2 = function () {
        var nextFragmentName = remainingFragments.pop();
        var fragment = validFragments.find(function (fr) { return fr.name.value === nextFragmentName; });
        if (fragment != null) {
            var name_1 = nextFragmentName;
            var typeName = fragment.typeCondition.name.value;
            var type = targetSchema.getType(typeName);
            if (type == null) {
                throw new Error("Fragment reference type \"" + typeName + "\", but the type is not contained within the target schema.");
            }
            var _a = finalizeSelectionSet(targetSchema, type, validFragmentsWithType, fragment.selectionSet), selectionSet = _a.selectionSet, fragmentUsedFragments = _a.usedFragments, fragmentUsedVariables = _a.usedVariables;
            remainingFragments = union(remainingFragments, fragmentUsedFragments);
            usedVariables = union(usedVariables, fragmentUsedVariables);
            if (name_1 && !(name_1 in fragmentSet)) {
                fragmentSet[name_1] = true;
                newFragments.push({
                    kind: Kind.FRAGMENT_DEFINITION,
                    name: {
                        kind: Kind.NAME,
                        value: name_1,
                    },
                    typeCondition: fragment.typeCondition,
                    selectionSet: selectionSet,
                });
            }
        }
    };
    while (remainingFragments.length !== 0) {
        _loop_2();
    }
    return {
        usedVariables: usedVariables,
        newFragments: newFragments,
        fragmentSet: fragmentSet,
    };
}
var filteredSelectionSetVisitorKeys = {
    SelectionSet: ['selections'],
    Field: ['selectionSet'],
    InlineFragment: ['selectionSet'],
    FragmentDefinition: ['selectionSet'],
};
var variablesVisitorKeys = {
    SelectionSet: ['selections'],
    Field: ['arguments', 'directives', 'selectionSet'],
    Argument: ['value'],
    InlineFragment: ['directives', 'selectionSet'],
    FragmentSpread: ['directives'],
    FragmentDefinition: ['selectionSet'],
    ObjectValue: ['fields'],
    ObjectField: ['name', 'value'],
    Directive: ['arguments'],
    ListValue: ['values'],
};
function finalizeSelectionSet(schema, type, validFragments, selectionSet) {
    var _a, _b;
    var usedFragments = [];
    var usedVariables = [];
    var typeInfo = graphqlVersionInfo.major < 16 ? new TypeInfo(schema, undefined, type) : new TypeInfo(schema, type);
    var filteredSelectionSet = visit(selectionSet, visitWithTypeInfo(typeInfo, (_a = {},
        _a[Kind.FIELD] = {
            enter: function (node) {
                var e_6, _a, e_7, _b;
                var parentType = typeInfo.getParentType();
                if (isObjectType(parentType) || isInterfaceType(parentType)) {
                    var fields = parentType.getFields();
                    var field = node.name.value === '__typename' ? TypeNameMetaFieldDef : fields[node.name.value];
                    if (!field) {
                        return null;
                    }
                    var args = field.args != null ? field.args : [];
                    var argsMap = Object.create(null);
                    try {
                        for (var args_1 = __values(args), args_1_1 = args_1.next(); !args_1_1.done; args_1_1 = args_1.next()) {
                            var arg = args_1_1.value;
                            argsMap[arg.name] = arg;
                        }
                    }
                    catch (e_6_1) { e_6 = { error: e_6_1 }; }
                    finally {
                        try {
                            if (args_1_1 && !args_1_1.done && (_a = args_1.return)) _a.call(args_1);
                        }
                        finally { if (e_6) throw e_6.error; }
                    }
                    if (node.arguments != null) {
                        var newArgs = [];
                        try {
                            for (var _c = __values(node.arguments), _d = _c.next(); !_d.done; _d = _c.next()) {
                                var arg = _d.value;
                                if (arg.name.value in argsMap) {
                                    newArgs.push(arg);
                                }
                            }
                        }
                        catch (e_7_1) { e_7 = { error: e_7_1 }; }
                        finally {
                            try {
                                if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                            }
                            finally { if (e_7) throw e_7.error; }
                        }
                        if (newArgs.length !== node.arguments.length) {
                            return __assign(__assign({}, node), { arguments: newArgs });
                        }
                    }
                }
            },
            leave: function (node) {
                var type = typeInfo.getType();
                if (type == null) {
                    throw new Error("No type was found for field node " + inspect(node) + ".");
                }
                var namedType = getNamedType(type);
                if (!schema.getType(namedType.name) == null) {
                    return null;
                }
                if (isObjectType(namedType) || isInterfaceType(namedType)) {
                    var selections = node.selectionSet != null ? node.selectionSet.selections : null;
                    if (selections == null || selections.length === 0) {
                        return null;
                    }
                }
            },
        },
        _a[Kind.FRAGMENT_SPREAD] = {
            enter: function (node) {
                if (!(node.name.value in validFragments)) {
                    return null;
                }
                var parentType = typeInfo.getParentType();
                var innerType = validFragments[node.name.value];
                if (!implementsAbstractType(schema, parentType, innerType)) {
                    return null;
                }
                usedFragments.push(node.name.value);
            },
        },
        _a[Kind.INLINE_FRAGMENT] = {
            enter: function (node) {
                if (node.typeCondition != null) {
                    var parentType = typeInfo.getParentType();
                    var innerType = schema.getType(node.typeCondition.name.value);
                    if (!implementsAbstractType(schema, parentType, innerType)) {
                        return null;
                    }
                }
            },
        },
        _a[Kind.SELECTION_SET] = {
            leave: function (node) {
                var parentType = typeInfo.getParentType();
                if (parentType != null && isAbstractType(parentType)) {
                    var selections = node.selections.concat([
                        {
                            kind: Kind.FIELD,
                            name: {
                                kind: Kind.NAME,
                                value: '__typename',
                            },
                        },
                    ]);
                    return __assign(__assign({}, node), { selections: selections });
                }
            },
        },
        _a)), 
    // visitorKeys argument usage a la https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js
    // empty keys cannot be removed only because of typescript errors
    // will hopefully be fixed in future version of graphql-js to be optional
    filteredSelectionSetVisitorKeys);
    visit(filteredSelectionSet, (_b = {},
        _b[Kind.VARIABLE] = function (variableNode) {
            usedVariables.push(variableNode.name.value);
        },
        _b), 
    // visitorKeys argument usage a la https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js
    // empty keys cannot be removed only because of typescript errors
    // will hopefully be fixed in future version of graphql-js to be optional
    variablesVisitorKeys);
    return {
        selectionSet: filteredSelectionSet,
        usedFragments: usedFragments,
        usedVariables: usedVariables,
    };
}
function union() {
    var e_8, _a, e_9, _b;
    var arrays = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        arrays[_i] = arguments[_i];
    }
    var cache = Object.create(null);
    var result = [];
    try {
        for (var arrays_1 = __values(arrays), arrays_1_1 = arrays_1.next(); !arrays_1_1.done; arrays_1_1 = arrays_1.next()) {
            var array = arrays_1_1.value;
            try {
                for (var array_1 = (e_9 = void 0, __values(array)), array_1_1 = array_1.next(); !array_1_1.done; array_1_1 = array_1.next()) {
                    var item = array_1_1.value;
                    if (!(item in cache)) {
                        cache[item] = true;
                        result.push(item);
                    }
                }
            }
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (array_1_1 && !array_1_1.done && (_b = array_1.return)) _b.call(array_1);
                }
                finally { if (e_9) throw e_9.error; }
            }
        }
    }
    catch (e_8_1) { e_8 = { error: e_8_1 }; }
    finally {
        try {
            if (arrays_1_1 && !arrays_1_1.done && (_a = arrays_1.return)) _a.call(arrays_1);
        }
        finally { if (e_8) throw e_8.error; }
    }
    return result;
}
