import { __assign, __read, __spreadArray, __values } from "tslib";
import { isObjectType, getNamedType, isUnionType, isNonNullType, isScalarType, isListType, isInterfaceType, isEnumType, Kind, } from 'graphql';
import { getDefinedRootType, getRootTypeNames } from './rootTypes';
var operationVariables = [];
var fieldTypeMap = new Map();
function addOperationVariable(variable) {
    operationVariables.push(variable);
}
function resetOperationVariables() {
    operationVariables = [];
}
function resetFieldMap() {
    fieldTypeMap = new Map();
}
export function buildOperationNodeForField(_a) {
    var schema = _a.schema, kind = _a.kind, field = _a.field, models = _a.models, _b = _a.ignore, ignore = _b === void 0 ? [] : _b, depthLimit = _a.depthLimit, circularReferenceDepth = _a.circularReferenceDepth, argNames = _a.argNames, _c = _a.selectedFields, selectedFields = _c === void 0 ? true : _c;
    resetOperationVariables();
    resetFieldMap();
    var rootTypeNames = getRootTypeNames(schema);
    var operationNode = buildOperationAndCollectVariables({
        schema: schema,
        fieldName: field,
        kind: kind,
        models: models || [],
        ignore: ignore,
        depthLimit: depthLimit || Infinity,
        circularReferenceDepth: circularReferenceDepth || 1,
        argNames: argNames,
        selectedFields: selectedFields,
        rootTypeNames: rootTypeNames,
    });
    // attach variables
    operationNode.variableDefinitions = __spreadArray([], __read(operationVariables), false);
    resetOperationVariables();
    resetFieldMap();
    return operationNode;
}
function buildOperationAndCollectVariables(_a) {
    var e_1, _b;
    var schema = _a.schema, fieldName = _a.fieldName, kind = _a.kind, models = _a.models, ignore = _a.ignore, depthLimit = _a.depthLimit, circularReferenceDepth = _a.circularReferenceDepth, argNames = _a.argNames, selectedFields = _a.selectedFields, rootTypeNames = _a.rootTypeNames;
    var type = getDefinedRootType(schema, kind);
    var field = type.getFields()[fieldName];
    var operationName = fieldName + "_" + kind;
    if (field.args) {
        try {
            for (var _c = __values(field.args), _d = _c.next(); !_d.done; _d = _c.next()) {
                var arg = _d.value;
                var argName = arg.name;
                if (!argNames || argNames.includes(argName)) {
                    addOperationVariable(resolveVariable(arg, argName));
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    return {
        kind: Kind.OPERATION_DEFINITION,
        operation: kind,
        name: {
            kind: 'Name',
            value: operationName,
        },
        variableDefinitions: [],
        selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: [
                resolveField({
                    type: type,
                    field: field,
                    models: models,
                    firstCall: true,
                    path: [],
                    ancestors: [],
                    ignore: ignore,
                    depthLimit: depthLimit,
                    circularReferenceDepth: circularReferenceDepth,
                    schema: schema,
                    depth: 0,
                    argNames: argNames,
                    selectedFields: selectedFields,
                    rootTypeNames: rootTypeNames,
                }),
            ],
        },
    };
}
function resolveSelectionSet(_a) {
    var parent = _a.parent, type = _a.type, models = _a.models, firstCall = _a.firstCall, path = _a.path, ancestors = _a.ancestors, ignore = _a.ignore, depthLimit = _a.depthLimit, circularReferenceDepth = _a.circularReferenceDepth, schema = _a.schema, depth = _a.depth, argNames = _a.argNames, selectedFields = _a.selectedFields, rootTypeNames = _a.rootTypeNames;
    if (typeof selectedFields === 'boolean' && depth > depthLimit) {
        return;
    }
    if (isUnionType(type)) {
        var types = type.getTypes();
        return {
            kind: Kind.SELECTION_SET,
            selections: types
                .filter(function (t) {
                return !hasCircularRef(__spreadArray(__spreadArray([], __read(ancestors), false), [t], false), {
                    depth: circularReferenceDepth,
                });
            })
                .map(function (t) {
                return {
                    kind: Kind.INLINE_FRAGMENT,
                    typeCondition: {
                        kind: Kind.NAMED_TYPE,
                        name: {
                            kind: Kind.NAME,
                            value: t.name,
                        },
                    },
                    selectionSet: resolveSelectionSet({
                        parent: type,
                        type: t,
                        models: models,
                        path: path,
                        ancestors: ancestors,
                        ignore: ignore,
                        depthLimit: depthLimit,
                        circularReferenceDepth: circularReferenceDepth,
                        schema: schema,
                        depth: depth,
                        argNames: argNames,
                        selectedFields: selectedFields,
                        rootTypeNames: rootTypeNames,
                    }),
                };
            })
                .filter(function (fragmentNode) { var _a, _b; return ((_b = (_a = fragmentNode === null || fragmentNode === void 0 ? void 0 : fragmentNode.selectionSet) === null || _a === void 0 ? void 0 : _a.selections) === null || _b === void 0 ? void 0 : _b.length) > 0; }),
        };
    }
    if (isInterfaceType(type)) {
        var types = Object.values(schema.getTypeMap()).filter(function (t) { return isObjectType(t) && t.getInterfaces().includes(type); });
        return {
            kind: Kind.SELECTION_SET,
            selections: types
                .filter(function (t) {
                return !hasCircularRef(__spreadArray(__spreadArray([], __read(ancestors), false), [t], false), {
                    depth: circularReferenceDepth,
                });
            })
                .map(function (t) {
                return {
                    kind: Kind.INLINE_FRAGMENT,
                    typeCondition: {
                        kind: Kind.NAMED_TYPE,
                        name: {
                            kind: Kind.NAME,
                            value: t.name,
                        },
                    },
                    selectionSet: resolveSelectionSet({
                        parent: type,
                        type: t,
                        models: models,
                        path: path,
                        ancestors: ancestors,
                        ignore: ignore,
                        depthLimit: depthLimit,
                        circularReferenceDepth: circularReferenceDepth,
                        schema: schema,
                        depth: depth,
                        argNames: argNames,
                        selectedFields: selectedFields,
                        rootTypeNames: rootTypeNames,
                    }),
                };
            })
                .filter(function (fragmentNode) { var _a, _b; return ((_b = (_a = fragmentNode === null || fragmentNode === void 0 ? void 0 : fragmentNode.selectionSet) === null || _a === void 0 ? void 0 : _a.selections) === null || _b === void 0 ? void 0 : _b.length) > 0; }),
        };
    }
    if (isObjectType(type) && !rootTypeNames.has(type.name)) {
        var isIgnored = ignore.includes(type.name) || ignore.includes(parent.name + "." + path[path.length - 1]);
        var isModel = models.includes(type.name);
        if (!firstCall && isModel && !isIgnored) {
            return {
                kind: Kind.SELECTION_SET,
                selections: [
                    {
                        kind: Kind.FIELD,
                        name: {
                            kind: Kind.NAME,
                            value: 'id',
                        },
                    },
                ],
            };
        }
        var fields_1 = type.getFields();
        return {
            kind: Kind.SELECTION_SET,
            selections: Object.keys(fields_1)
                .filter(function (fieldName) {
                return !hasCircularRef(__spreadArray(__spreadArray([], __read(ancestors), false), [getNamedType(fields_1[fieldName].type)], false), {
                    depth: circularReferenceDepth,
                });
            })
                .map(function (fieldName) {
                var selectedSubFields = typeof selectedFields === 'object' ? selectedFields[fieldName] : true;
                if (selectedSubFields) {
                    return resolveField({
                        type: type,
                        field: fields_1[fieldName],
                        models: models,
                        path: __spreadArray(__spreadArray([], __read(path), false), [fieldName], false),
                        ancestors: ancestors,
                        ignore: ignore,
                        depthLimit: depthLimit,
                        circularReferenceDepth: circularReferenceDepth,
                        schema: schema,
                        depth: depth,
                        argNames: argNames,
                        selectedFields: selectedSubFields,
                        rootTypeNames: rootTypeNames,
                    });
                }
                return null;
            })
                .filter(function (f) {
                var _a, _b;
                if (f == null) {
                    return false;
                }
                else if ('selectionSet' in f) {
                    return !!((_b = (_a = f.selectionSet) === null || _a === void 0 ? void 0 : _a.selections) === null || _b === void 0 ? void 0 : _b.length);
                }
                return true;
            }),
        };
    }
}
function resolveVariable(arg, name) {
    function resolveVariableType(type) {
        if (isListType(type)) {
            return {
                kind: Kind.LIST_TYPE,
                type: resolveVariableType(type.ofType),
            };
        }
        if (isNonNullType(type)) {
            return {
                kind: Kind.NON_NULL_TYPE,
                // for v16 compatibility
                type: resolveVariableType(type.ofType),
            };
        }
        return {
            kind: Kind.NAMED_TYPE,
            name: {
                kind: Kind.NAME,
                value: type.name,
            },
        };
    }
    return {
        kind: Kind.VARIABLE_DEFINITION,
        variable: {
            kind: Kind.VARIABLE,
            name: {
                kind: Kind.NAME,
                value: name || arg.name,
            },
        },
        type: resolveVariableType(arg.type),
    };
}
function getArgumentName(name, path) {
    return __spreadArray(__spreadArray([], __read(path), false), [name], false).join('_');
}
function resolveField(_a) {
    var type = _a.type, field = _a.field, models = _a.models, firstCall = _a.firstCall, path = _a.path, ancestors = _a.ancestors, ignore = _a.ignore, depthLimit = _a.depthLimit, circularReferenceDepth = _a.circularReferenceDepth, schema = _a.schema, depth = _a.depth, argNames = _a.argNames, selectedFields = _a.selectedFields, rootTypeNames = _a.rootTypeNames;
    var namedType = getNamedType(field.type);
    var args = [];
    var removeField = false;
    if (field.args && field.args.length) {
        args = field.args
            .map(function (arg) {
            var argumentName = getArgumentName(arg.name, path);
            if (argNames && !argNames.includes(argumentName)) {
                if (isNonNullType(arg.type)) {
                    removeField = true;
                }
                return null;
            }
            if (!firstCall) {
                addOperationVariable(resolveVariable(arg, argumentName));
            }
            return {
                kind: Kind.ARGUMENT,
                name: {
                    kind: Kind.NAME,
                    value: arg.name,
                },
                value: {
                    kind: Kind.VARIABLE,
                    name: {
                        kind: Kind.NAME,
                        value: getArgumentName(arg.name, path),
                    },
                },
            };
        })
            .filter(Boolean);
    }
    if (removeField) {
        return null;
    }
    var fieldPath = __spreadArray(__spreadArray([], __read(path), false), [field.name], false);
    var fieldPathStr = fieldPath.join('.');
    var fieldName = field.name;
    if (fieldTypeMap.has(fieldPathStr) && fieldTypeMap.get(fieldPathStr) !== field.type.toString()) {
        fieldName += field.type.toString().replace('!', 'NonNull');
    }
    fieldTypeMap.set(fieldPathStr, field.type.toString());
    if (!isScalarType(namedType) && !isEnumType(namedType)) {
        return __assign(__assign({ kind: Kind.FIELD, name: {
                kind: Kind.NAME,
                value: field.name,
            } }, (fieldName !== field.name && { alias: { kind: Kind.NAME, value: fieldName } })), { selectionSet: resolveSelectionSet({
                parent: type,
                type: namedType,
                models: models,
                firstCall: firstCall,
                path: fieldPath,
                ancestors: __spreadArray(__spreadArray([], __read(ancestors), false), [type], false),
                ignore: ignore,
                depthLimit: depthLimit,
                circularReferenceDepth: circularReferenceDepth,
                schema: schema,
                depth: depth + 1,
                argNames: argNames,
                selectedFields: selectedFields,
                rootTypeNames: rootTypeNames,
            }) || undefined, arguments: args });
    }
    return __assign(__assign({ kind: Kind.FIELD, name: {
            kind: Kind.NAME,
            value: field.name,
        } }, (fieldName !== field.name && { alias: { kind: Kind.NAME, value: fieldName } })), { arguments: args });
}
function hasCircularRef(types, config) {
    if (config === void 0) { config = {
        depth: 1,
    }; }
    var type = types[types.length - 1];
    if (isScalarType(type)) {
        return false;
    }
    var size = types.filter(function (t) { return t.name === type.name; }).length;
    return size > config.depth;
}
