'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

const tslib = require('tslib');
const iterall = require('iterall');
const apolloLink = require('apollo-link');
const graphql = require('graphql');
const deprecatedDecorator = require('deprecated-decorator');
const apolloUploadClient = require('apollo-upload-client');
const FormData = _interopDefault(require('form-data'));
const fetch = _interopDefault(require('node-fetch'));
const uuid = require('uuid');

function isSubschemaConfig(value) {
    return Boolean(value.schema);
}
(function (VisitSchemaKind) {
    VisitSchemaKind["TYPE"] = "VisitSchemaKind.TYPE";
    VisitSchemaKind["SCALAR_TYPE"] = "VisitSchemaKind.SCALAR_TYPE";
    VisitSchemaKind["ENUM_TYPE"] = "VisitSchemaKind.ENUM_TYPE";
    VisitSchemaKind["COMPOSITE_TYPE"] = "VisitSchemaKind.COMPOSITE_TYPE";
    VisitSchemaKind["OBJECT_TYPE"] = "VisitSchemaKind.OBJECT_TYPE";
    VisitSchemaKind["INPUT_OBJECT_TYPE"] = "VisitSchemaKind.INPUT_OBJECT_TYPE";
    VisitSchemaKind["ABSTRACT_TYPE"] = "VisitSchemaKind.ABSTRACT_TYPE";
    VisitSchemaKind["UNION_TYPE"] = "VisitSchemaKind.UNION_TYPE";
    VisitSchemaKind["INTERFACE_TYPE"] = "VisitSchemaKind.INTERFACE_TYPE";
    VisitSchemaKind["ROOT_OBJECT"] = "VisitSchemaKind.ROOT_OBJECT";
    VisitSchemaKind["QUERY"] = "VisitSchemaKind.QUERY";
    VisitSchemaKind["MUTATION"] = "VisitSchemaKind.MUTATION";
    VisitSchemaKind["SUBSCRIPTION"] = "VisitSchemaKind.SUBSCRIPTION";
})(exports.VisitSchemaKind || (exports.VisitSchemaKind = {}));
(function (MapperKind) {
    MapperKind["TYPE"] = "MapperKind.TYPE";
    MapperKind["SCALAR_TYPE"] = "MapperKind.SCALAR_TYPE";
    MapperKind["ENUM_TYPE"] = "MapperKind.ENUM_TYPE";
    MapperKind["COMPOSITE_TYPE"] = "MapperKind.COMPOSITE_TYPE";
    MapperKind["OBJECT_TYPE"] = "MapperKind.OBJECT_TYPE";
    MapperKind["INPUT_OBJECT_TYPE"] = "MapperKind.INPUT_OBJECT_TYPE";
    MapperKind["ABSTRACT_TYPE"] = "MapperKind.ABSTRACT_TYPE";
    MapperKind["UNION_TYPE"] = "MapperKind.UNION_TYPE";
    MapperKind["INTERFACE_TYPE"] = "MapperKind.INTERFACE_TYPE";
    MapperKind["ROOT_OBJECT"] = "MapperKind.ROOT_OBJECT";
    MapperKind["QUERY"] = "MapperKind.QUERY";
    MapperKind["MUTATION"] = "MapperKind.MUTATION";
    MapperKind["SUBSCRIPTION"] = "MapperKind.SUBSCRIPTION";
    MapperKind["DIRECTIVE"] = "MapperKind.DIRECTIVE";
})(exports.MapperKind || (exports.MapperKind = {}));

function implementsAbstractType(schema, typeA, typeB) {
    if (typeA === typeB) {
        return true;
    }
    else if (graphql.isCompositeType(typeA) && graphql.isCompositeType(typeB)) {
        return graphql.doTypesOverlap(schema, typeA, typeB);
    }
    return false;
}

var ExpandAbstractTypes = /** @class */ (function () {
    function ExpandAbstractTypes(sourceSchema, targetSchema) {
        this.targetSchema = targetSchema;
        this.mapping = extractPossibleTypes(sourceSchema, targetSchema);
        this.reverseMapping = flipMapping(this.mapping);
    }
    ExpandAbstractTypes.prototype.transformRequest = function (originalRequest) {
        var document = expandAbstractTypes(this.targetSchema, this.mapping, this.reverseMapping, originalRequest.document);
        return tslib.__assign(tslib.__assign({}, originalRequest), { document: document });
    };
    return ExpandAbstractTypes;
}());
function extractPossibleTypes(sourceSchema, targetSchema) {
    var typeMap = sourceSchema.getTypeMap();
    var mapping = Object.create(null);
    Object.keys(typeMap).forEach(function (typeName) {
        var type = typeMap[typeName];
        if (graphql.isAbstractType(type)) {
            var targetType = targetSchema.getType(typeName);
            if (!graphql.isAbstractType(targetType)) {
                var implementations = sourceSchema.getPossibleTypes(type);
                mapping[typeName] = implementations
                    .filter(function (impl) { return targetSchema.getType(impl.name); })
                    .map(function (impl) { return impl.name; });
            }
        }
    });
    return mapping;
}
function flipMapping(mapping) {
    var result = Object.create(null);
    Object.keys(mapping).forEach(function (typeName) {
        var toTypeNames = mapping[typeName];
        toTypeNames.forEach(function (toTypeName) {
            if (!(toTypeName in result)) {
                result[toTypeName] = [];
            }
            result[toTypeName].push(typeName);
        });
    });
    return result;
}
function expandAbstractTypes(targetSchema, mapping, reverseMapping, document) {
    var _a;
    var operations = document.definitions.filter(function (def) { return def.kind === graphql.Kind.OPERATION_DEFINITION; });
    var fragments = document.definitions.filter(function (def) { return def.kind === graphql.Kind.FRAGMENT_DEFINITION; });
    var existingFragmentNames = fragments.map(function (fragment) { return fragment.name.value; });
    var fragmentCounter = 0;
    var generateFragmentName = function (typeName) {
        var fragmentName;
        do {
            fragmentName = "_" + typeName + "_Fragment" + fragmentCounter.toString();
            fragmentCounter++;
        } while (existingFragmentNames.indexOf(fragmentName) !== -1);
        return fragmentName;
    };
    var newFragments = [];
    var fragmentReplacements = Object.create(null);
    fragments.forEach(function (fragment) {
        newFragments.push(fragment);
        var possibleTypes = mapping[fragment.typeCondition.name.value];
        if (possibleTypes != null) {
            fragmentReplacements[fragment.name.value] = [];
            possibleTypes.forEach(function (possibleTypeName) {
                var name = generateFragmentName(possibleTypeName);
                existingFragmentNames.push(name);
                var newFragment = {
                    kind: graphql.Kind.FRAGMENT_DEFINITION,
                    name: {
                        kind: graphql.Kind.NAME,
                        value: name,
                    },
                    typeCondition: {
                        kind: graphql.Kind.NAMED_TYPE,
                        name: {
                            kind: graphql.Kind.NAME,
                            value: possibleTypeName,
                        },
                    },
                    selectionSet: fragment.selectionSet,
                };
                newFragments.push(newFragment);
                fragmentReplacements[fragment.name.value].push({
                    fragmentName: name,
                    typeName: possibleTypeName,
                });
            });
        }
    });
    var newDocument = tslib.__assign(tslib.__assign({}, document), { definitions: tslib.__spreadArrays(operations, newFragments) });
    var typeInfo = new graphql.TypeInfo(targetSchema);
    return graphql.visit(newDocument, graphql.visitWithTypeInfo(typeInfo, (_a = {},
        _a[graphql.Kind.SELECTION_SET] = function (node) {
            var newSelections = tslib.__spreadArrays(node.selections);
            var maybeType = typeInfo.getParentType();
            if (maybeType != null) {
                var parentType_1 = graphql.getNamedType(maybeType);
                node.selections.forEach(function (selection) {
                    if (selection.kind === graphql.Kind.INLINE_FRAGMENT) {
                        if (selection.typeCondition != null) {
                            var possibleTypes = mapping[selection.typeCondition.name.value];
                            if (possibleTypes != null) {
                                possibleTypes.forEach(function (possibleType) {
                                    var maybePossibleType = targetSchema.getType(possibleType);
                                    if (maybePossibleType != null &&
                                        implementsAbstractType(targetSchema, parentType_1, maybePossibleType)) {
                                        newSelections.push({
                                            kind: graphql.Kind.INLINE_FRAGMENT,
                                            typeCondition: {
                                                kind: graphql.Kind.NAMED_TYPE,
                                                name: {
                                                    kind: graphql.Kind.NAME,
                                                    value: possibleType,
                                                },
                                            },
                                            selectionSet: selection.selectionSet,
                                        });
                                    }
                                });
                            }
                        }
                    }
                    else if (selection.kind === graphql.Kind.FRAGMENT_SPREAD) {
                        var fragmentName = selection.name.value;
                        if (fragmentName in fragmentReplacements) {
                            fragmentReplacements[fragmentName].forEach(function (replacement) {
                                var typeName = replacement.typeName;
                                var maybeReplacementType = targetSchema.getType(typeName);
                                if (maybeReplacementType != null &&
                                    implementsAbstractType(targetSchema, parentType_1, maybeType)) {
                                    newSelections.push({
                                        kind: graphql.Kind.FRAGMENT_SPREAD,
                                        name: {
                                            kind: graphql.Kind.NAME,
                                            value: replacement.fragmentName,
                                        },
                                    });
                                }
                            });
                        }
                    }
                });
                if (parentType_1.name in reverseMapping) {
                    newSelections.push({
                        kind: graphql.Kind.FIELD,
                        name: {
                            kind: graphql.Kind.NAME,
                            value: '__typename',
                        },
                    });
                }
            }
            if (newSelections.length !== node.selections.length) {
                return tslib.__assign(tslib.__assign({}, node), { selections: newSelections });
            }
        },
        _a)));
}

/**
 * Creates a keyed JS object from an array, given a function to produce the keys
 * and a function to produce the values from each item in the array.
 *
 *     const phoneBook = [
 *       { name: 'Jon', num: '555-1234' },
 *       { name: 'Jenny', num: '867-5309' }
 *     ]
 *
 *     // { Jon: '555-1234', Jenny: '867-5309' }
 *     const phonesByName = keyValMap(
 *       phoneBook,
 *       entry => entry.name,
 *       entry => entry.num
 *     )
 *
 */
function keyValMap(list, keyFn, valFn) {
    return list.reduce(function (map, item) {
        map[keyFn(item)] = valFn(item);
        return map;
    }, Object.create(null));
}

var FilterToSchema = /** @class */ (function () {
    function FilterToSchema(targetSchema) {
        this.targetSchema = targetSchema;
    }
    FilterToSchema.prototype.transformRequest = function (originalRequest) {
        return tslib.__assign(tslib.__assign({}, originalRequest), filterToSchema(this.targetSchema, originalRequest.document, originalRequest.variables));
    };
    return FilterToSchema;
}());
function filterToSchema(targetSchema, document, variables) {
    var operations = document.definitions.filter(function (def) { return def.kind === graphql.Kind.OPERATION_DEFINITION; });
    var fragments = document.definitions.filter(function (def) { return def.kind === graphql.Kind.FRAGMENT_DEFINITION; });
    var usedVariables = [];
    var usedFragments = [];
    var newOperations = [];
    var newFragments = [];
    var validFragments = fragments.filter(function (fragment) {
        var typeName = fragment.typeCondition.name.value;
        return Boolean(targetSchema.getType(typeName));
    });
    var validFragmentsWithType = keyValMap(validFragments, function (fragment) { return fragment.name.value; }, function (fragment) { return targetSchema.getType(fragment.typeCondition.name.value); });
    var fragmentSet = Object.create(null);
    operations.forEach(function (operation) {
        var type;
        if (operation.operation === 'subscription') {
            type = targetSchema.getSubscriptionType();
        }
        else if (operation.operation === 'mutation') {
            type = targetSchema.getMutationType();
        }
        else {
            type = targetSchema.getQueryType();
        }
        var _a = filterSelectionSet(targetSchema, type, validFragmentsWithType, operation.selectionSet), selectionSet = _a.selectionSet, operationUsedFragments = _a.usedFragments, operationUsedVariables = _a.usedVariables;
        usedFragments = union(usedFragments, operationUsedFragments);
        var _b = collectFragmentVariables(targetSchema, fragmentSet, validFragments, validFragmentsWithType, usedFragments), collectedUsedVariables = _b.usedVariables, collectedNewFragments = _b.newFragments, collectedFragmentSet = _b.fragmentSet;
        var operationOrFragmentVariables = union(operationUsedVariables, collectedUsedVariables);
        usedVariables = union(usedVariables, operationOrFragmentVariables);
        newFragments = collectedNewFragments;
        fragmentSet = collectedFragmentSet;
        var variableDefinitions = operation.variableDefinitions.filter(function (variable) {
            return operationOrFragmentVariables.indexOf(variable.variable.name.value) !==
                -1;
        });
        newOperations.push({
            kind: graphql.Kind.OPERATION_DEFINITION,
            operation: operation.operation,
            name: operation.name,
            directives: operation.directives,
            variableDefinitions: variableDefinitions,
            selectionSet: selectionSet,
        });
    });
    var newVariables = usedVariables.reduce(function (acc, variableName) {
        acc[variableName] = variables[variableName];
        return acc;
    }, {});
    return {
        document: {
            kind: graphql.Kind.DOCUMENT,
            definitions: tslib.__spreadArrays(newOperations, newFragments),
        },
        variables: newVariables,
    };
}
function collectFragmentVariables(targetSchema, fragmentSet, validFragments, validFragmentsWithType, usedFragments) {
    var remainingFragments = usedFragments.slice();
    var usedVariables = [];
    var newFragments = [];
    var _loop_1 = function () {
        var nextFragmentName = remainingFragments.pop();
        var fragment = validFragments.find(function (fr) { return fr.name.value === nextFragmentName; });
        if (fragment != null) {
            var name_1 = nextFragmentName;
            var typeName = fragment.typeCondition.name.value;
            var type = targetSchema.getType(typeName);
            var _a = filterSelectionSet(targetSchema, type, validFragmentsWithType, fragment.selectionSet), selectionSet = _a.selectionSet, fragmentUsedFragments = _a.usedFragments, fragmentUsedVariables = _a.usedVariables;
            remainingFragments = union(remainingFragments, fragmentUsedFragments);
            usedVariables = union(usedVariables, fragmentUsedVariables);
            if (!(name_1 in fragmentSet)) {
                fragmentSet[name_1] = true;
                newFragments.push({
                    kind: graphql.Kind.FRAGMENT_DEFINITION,
                    name: {
                        kind: graphql.Kind.NAME,
                        value: name_1,
                    },
                    typeCondition: fragment.typeCondition,
                    selectionSet: selectionSet,
                });
            }
        }
    };
    while (remainingFragments.length !== 0) {
        _loop_1();
    }
    return {
        usedVariables: usedVariables,
        newFragments: newFragments,
        fragmentSet: fragmentSet,
    };
}
function filterSelectionSet(schema, type, validFragments, selectionSet) {
    var _a;
    var usedFragments = [];
    var usedVariables = [];
    var typeInfo = new graphql.TypeInfo(schema, undefined, type);
    var filteredSelectionSet = graphql.visit(selectionSet, graphql.visitWithTypeInfo(typeInfo, (_a = {},
        _a[graphql.Kind.FIELD] = {
            enter: function (node) {
                var parentType = typeInfo.getParentType();
                if (graphql.isObjectType(parentType) || graphql.isInterfaceType(parentType)) {
                    var fields = parentType.getFields();
                    var field = node.name.value === '__typename'
                        ? graphql.TypeNameMetaFieldDef
                        : fields[node.name.value];
                    if (!field) {
                        return null;
                    }
                    var argNames_1 = (field.args != null ? field.args : []).map(function (arg) { return arg.name; });
                    if (node.arguments != null) {
                        var args = node.arguments.filter(function (arg) { return argNames_1.indexOf(arg.name.value) !== -1; });
                        if (args.length !== node.arguments.length) {
                            return tslib.__assign(tslib.__assign({}, node), { arguments: args });
                        }
                    }
                }
            },
            leave: function (node) {
                var _a;
                var resolvedType = graphql.getNamedType(typeInfo.getType());
                if (graphql.isObjectType(resolvedType) || graphql.isInterfaceType(resolvedType)) {
                    var selections = node.selectionSet != null ? node.selectionSet.selections : null;
                    if (selections == null || selections.length === 0) {
                        // need to remove any added variables. Is there a better way to do this?
                        graphql.visit(node, (_a = {},
                            _a[graphql.Kind.VARIABLE] = function (variableNode) {
                                var index = usedVariables.indexOf(variableNode.name.value);
                                if (index !== -1) {
                                    usedVariables.splice(index, 1);
                                }
                            },
                            _a));
                        return null;
                    }
                }
            },
        },
        _a[graphql.Kind.FRAGMENT_SPREAD] = function (node) {
            if (node.name.value in validFragments) {
                var parentType = typeInfo.getParentType();
                var innerType = validFragments[node.name.value];
                if (!implementsAbstractType(schema, parentType, innerType)) {
                    return null;
                }
                usedFragments.push(node.name.value);
                return;
            }
            return null;
        },
        _a[graphql.Kind.INLINE_FRAGMENT] = {
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
        _a[graphql.Kind.VARIABLE] = function (node) {
            usedVariables.push(node.name.value);
        },
        _a)));
    return {
        selectionSet: filteredSelectionSet,
        usedFragments: usedFragments,
        usedVariables: usedVariables,
    };
}
function union() {
    var arrays = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        arrays[_i] = arguments[_i];
    }
    var cache = Object.create(null);
    var result = [];
    arrays.forEach(function (array) {
        array.forEach(function (item) {
            if (!(item in cache)) {
                cache[item] = true;
                result.push(item);
            }
        });
    });
    return result;
}

var AddReplacementSelectionSets = /** @class */ (function () {
    function AddReplacementSelectionSets(schema, mapping) {
        this.schema = schema;
        this.mapping = mapping;
    }
    AddReplacementSelectionSets.prototype.transformRequest = function (originalRequest) {
        var document = replaceFieldsWithSelectionSet(this.schema, originalRequest.document, this.mapping);
        return tslib.__assign(tslib.__assign({}, originalRequest), { document: document });
    };
    return AddReplacementSelectionSets;
}());
function replaceFieldsWithSelectionSet(schema, document, mapping) {
    var _a;
    var typeInfo = new graphql.TypeInfo(schema);
    return graphql.visit(document, graphql.visitWithTypeInfo(typeInfo, (_a = {},
        _a[graphql.Kind.SELECTION_SET] = function (node) {
            var parentType = typeInfo.getParentType();
            if (parentType != null) {
                var parentTypeName_1 = parentType.name;
                var selections_1 = node.selections;
                if (parentTypeName_1 in mapping) {
                    node.selections.forEach(function (selection) {
                        if (selection.kind === graphql.Kind.FIELD) {
                            var name_1 = selection.name.value;
                            var selectionSet = mapping[parentTypeName_1][name_1];
                            if (selectionSet != null) {
                                selections_1 = selections_1.concat(selectionSet.selections);
                            }
                        }
                    });
                }
                if (selections_1 !== node.selections) {
                    return tslib.__assign(tslib.__assign({}, node), { selections: selections_1 });
                }
            }
        },
        _a)));
}

var AddReplacementFragments = /** @class */ (function () {
    function AddReplacementFragments(targetSchema, mapping) {
        this.targetSchema = targetSchema;
        this.mapping = mapping;
    }
    AddReplacementFragments.prototype.transformRequest = function (originalRequest) {
        var document = replaceFieldsWithFragments(this.targetSchema, originalRequest.document, this.mapping);
        return tslib.__assign(tslib.__assign({}, originalRequest), { document: document });
    };
    return AddReplacementFragments;
}());
function replaceFieldsWithFragments(targetSchema, document, mapping) {
    var _a;
    var typeInfo = new graphql.TypeInfo(targetSchema);
    return graphql.visit(document, graphql.visitWithTypeInfo(typeInfo, (_a = {},
        _a[graphql.Kind.SELECTION_SET] = function (node) {
            var parentType = typeInfo.getParentType();
            if (parentType != null) {
                var parentTypeName_1 = parentType.name;
                var selections_1 = node.selections;
                if (parentTypeName_1 in mapping) {
                    node.selections.forEach(function (selection) {
                        if (selection.kind === graphql.Kind.FIELD) {
                            var name_1 = selection.name.value;
                            var fragment = mapping[parentTypeName_1][name_1];
                            if (fragment != null) {
                                selections_1 = selections_1.concat(fragment);
                            }
                        }
                    });
                }
                if (selections_1 !== node.selections) {
                    return tslib.__assign(tslib.__assign({}, node), { selections: selections_1 });
                }
            }
        },
        _a)));
}

var AddMergedTypeFragments = /** @class */ (function () {
    function AddMergedTypeFragments(targetSchema, mapping) {
        this.targetSchema = targetSchema;
        this.mapping = mapping;
    }
    AddMergedTypeFragments.prototype.transformRequest = function (originalRequest) {
        var document = addMergedTypeSelectionSets(this.targetSchema, originalRequest.document, this.mapping);
        return tslib.__assign(tslib.__assign({}, originalRequest), { document: document });
    };
    return AddMergedTypeFragments;
}());
function addMergedTypeSelectionSets(targetSchema, document, mapping) {
    var _a;
    var typeInfo = new graphql.TypeInfo(targetSchema);
    return graphql.visit(document, graphql.visitWithTypeInfo(typeInfo, (_a = {},
        _a[graphql.Kind.SELECTION_SET] = function (node) {
            var parentType = typeInfo.getParentType();
            if (parentType != null) {
                var parentTypeName = parentType.name;
                var selections = node.selections;
                if (parentTypeName in mapping) {
                    var selectionSet = mapping[parentTypeName].selectionSet;
                    if (selectionSet != null) {
                        selections = selections.concat(selectionSet.selections);
                    }
                }
                if (selections !== node.selections) {
                    return tslib.__assign(tslib.__assign({}, node), { selections: selections });
                }
            }
        },
        _a)));
}

function addTypenameToAbstract(targetSchema, document) {
    var _a;
    var typeInfo = new graphql.TypeInfo(targetSchema);
    return graphql.visit(document, graphql.visitWithTypeInfo(typeInfo, (_a = {},
        _a[graphql.Kind.SELECTION_SET] = function (node) {
            var parentType = typeInfo.getParentType();
            var selections = node.selections;
            if (parentType != null && graphql.isAbstractType(parentType)) {
                selections = selections.concat({
                    kind: graphql.Kind.FIELD,
                    name: {
                        kind: graphql.Kind.NAME,
                        value: '__typename',
                    },
                });
            }
            if (selections !== node.selections) {
                return tslib.__assign(tslib.__assign({}, node), { selections: selections });
            }
        },
        _a)));
}

var AddTypenameToAbstract = /** @class */ (function () {
    function AddTypenameToAbstract(targetSchema) {
        this.targetSchema = targetSchema;
    }
    AddTypenameToAbstract.prototype.transformRequest = function (originalRequest) {
        var document = addTypenameToAbstract(this.targetSchema, originalRequest.document);
        return tslib.__assign(tslib.__assign({}, originalRequest), { document: document });
    };
    return AddTypenameToAbstract;
}());

/**
 * Get the key under which the result of this resolver will be placed in the response JSON. Basically, just
 * resolves aliases.
 * @param info The info argument to the resolver.
 */
function getResponseKeyFromInfo(info) {
    return info.fieldNodes[0].alias != null
        ? info.fieldNodes[0].alias.value
        : info.fieldName;
}

var hasSymbol = (typeof global !== 'undefined' && 'Symbol' in global) ||
    // eslint-disable-next-line no-undef
    (typeof window !== 'undefined' && 'Symbol' in window);
var OBJECT_SUBSCHEMA_SYMBOL = hasSymbol
    ? Symbol('initialSubschema')
    : '@@__initialSubschema';
var FIELD_SUBSCHEMA_MAP_SYMBOL = hasSymbol
    ? Symbol('subschemaMap')
    : '@@__subschemaMap';
var ERROR_SYMBOL = hasSymbol
    ? Symbol('subschemaErrors')
    : '@@__subschemaErrors';

function relocatedError(originalError, nodes, path) {
    if (Array.isArray(originalError.path)) {
        return new graphql.GraphQLError(originalError.message, originalError.nodes, originalError.source, originalError.positions, path != null ? path : originalError.path, originalError.originalError, originalError.extensions);
    }
    if (originalError == null) {
        return new graphql.GraphQLError(undefined, nodes, undefined, undefined, path, originalError);
    }
    return new graphql.GraphQLError(originalError.message, originalError.nodes != null
        ? originalError.nodes
        : nodes, originalError.source, originalError.positions, path, originalError);
}
function slicedError(originalError) {
    return relocatedError(originalError, originalError.nodes, originalError.path != null ? originalError.path.slice(1) : undefined);
}
function getErrorsByPathSegment(errors) {
    var record = Object.create(null);
    errors.forEach(function (error) {
        if (!error.path || error.path.length < 2) {
            return;
        }
        var pathSegment = error.path[1];
        var current = pathSegment in record ? record[pathSegment] : [];
        current.push(slicedError(error));
        record[pathSegment] = current;
    });
    return record;
}
var CombinedError = /** @class */ (function (_super) {
    tslib.__extends(CombinedError, _super);
    function CombinedError(message, errors) {
        var _this = _super.call(this, message) || this;
        _this.errors = errors;
        return _this;
    }
    return CombinedError;
}(Error));
function combineErrors(errors) {
    if (errors.length === 1) {
        return new graphql.GraphQLError(errors[0].message, errors[0].nodes, errors[0].source, errors[0].positions, errors[0].path, errors[0].originalError, errors[0].extensions);
    }
    return new CombinedError(errors.map(function (error) { return error.message; }).join('\n'), errors);
}
function setErrors(result, errors) {
    result[ERROR_SYMBOL] = errors;
}
function getErrors(result, pathSegment) {
    var errors = result != null ? result[ERROR_SYMBOL] : result;
    if (!Array.isArray(errors)) {
        return null;
    }
    var fieldErrors = [];
    for (var _i = 0, errors_1 = errors; _i < errors_1.length; _i++) {
        var error = errors_1[_i];
        if (!error.path || error.path[0] === pathSegment) {
            fieldErrors.push(error);
        }
    }
    return fieldErrors;
}

function handleNull(fieldNodes, path, errors) {
    if (errors.length) {
        if (errors.some(function (error) { return !error.path || error.path.length < 2; })) {
            return relocatedError(combineErrors(errors), fieldNodes, path);
        }
        else if (errors.some(function (error) { return typeof error.path[1] === 'string'; })) {
            var childErrors_1 = getErrorsByPathSegment(errors);
            var result_1 = {};
            Object.keys(childErrors_1).forEach(function (pathSegment) {
                result_1[pathSegment] = handleNull(fieldNodes, tslib.__spreadArrays(path, [pathSegment]), childErrors_1[pathSegment]);
            });
            return result_1;
        }
        var childErrors_2 = getErrorsByPathSegment(errors);
        var result_2 = [];
        Object.keys(childErrors_2).forEach(function (pathSegment) {
            result_2.push(handleNull(fieldNodes, tslib.__spreadArrays(path, [parseInt(pathSegment, 10)]), childErrors_2[pathSegment]));
        });
        return result_2;
    }
    return null;
}

/**
 * Given a selectionSet, adds all of the fields in that selection to
 * the passed in map of fields, and returns it at the end.
 *
 * CollectFields requires the "runtime type" of an object. For a field which
 * returns an Interface or Union type, the "runtime type" will be the actual
 * Object type returned by that field.
 *
 * @internal
 */
function collectFields(exeContext, runtimeType, selectionSet, fields, visitedFragmentNames) {
    for (var _i = 0, _a = selectionSet.selections; _i < _a.length; _i++) {
        var selection = _a[_i];
        switch (selection.kind) {
            case graphql.Kind.FIELD: {
                if (!shouldIncludeNode(exeContext, selection)) {
                    continue;
                }
                var name_1 = getFieldEntryKey(selection);
                if (!(name_1 in fields)) {
                    fields[name_1] = [];
                }
                fields[name_1].push(selection);
                break;
            }
            case graphql.Kind.INLINE_FRAGMENT: {
                if (!shouldIncludeNode(exeContext, selection) ||
                    !doesFragmentConditionMatch(exeContext, selection, runtimeType)) {
                    continue;
                }
                collectFields(exeContext, runtimeType, selection.selectionSet, fields, visitedFragmentNames);
                break;
            }
            case graphql.Kind.FRAGMENT_SPREAD: {
                var fragName = selection.name.value;
                if (visitedFragmentNames[fragName] ||
                    !shouldIncludeNode(exeContext, selection)) {
                    continue;
                }
                visitedFragmentNames[fragName] = true;
                var fragment = exeContext.fragments[fragName];
                if (!fragment ||
                    !doesFragmentConditionMatch(exeContext, fragment, runtimeType)) {
                    continue;
                }
                collectFields(exeContext, runtimeType, fragment.selectionSet, fields, visitedFragmentNames);
                break;
            }
        }
    }
    return fields;
}
/**
 * Determines if a field should be included based on the @include and @skip
 * directives, where @skip has higher precedence than @include.
 */
function shouldIncludeNode(exeContext, node) {
    var skip = graphql.getDirectiveValues(graphql.GraphQLSkipDirective, node, exeContext.variableValues);
    if ((skip === null || skip === void 0 ? void 0 : skip.if) === true) {
        return false;
    }
    var include = graphql.getDirectiveValues(graphql.GraphQLIncludeDirective, node, exeContext.variableValues);
    if ((include === null || include === void 0 ? void 0 : include.if) === false) {
        return false;
    }
    return true;
}
/**
 * Determines if a fragment is applicable to the given type.
 */
function doesFragmentConditionMatch(exeContext, fragment, type) {
    var typeConditionNode = fragment.typeCondition;
    if (!typeConditionNode) {
        return true;
    }
    var conditionalType = graphql.typeFromAST(exeContext.schema, typeConditionNode);
    if (conditionalType === type) {
        return true;
    }
    if (graphql.isAbstractType(conditionalType)) {
        return exeContext.schema.isPossibleType(conditionalType, type);
    }
    return false;
}
/**
 * Implements the logic to compute the key of a given field's entry
 */
function getFieldEntryKey(node) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return node.alias ? node.alias.value : node.name.value;
}

function getSubschema(result, responseKey) {
    var subschema = result[FIELD_SUBSCHEMA_MAP_SYMBOL] &&
        result[FIELD_SUBSCHEMA_MAP_SYMBOL][responseKey];
    return subschema ? subschema : result[OBJECT_SUBSCHEMA_SYMBOL];
}
function setObjectSubschema(result, subschema) {
    result[OBJECT_SUBSCHEMA_SYMBOL] = subschema;
}

function resolveFromParentTypename(parent) {
    var parentTypename = parent['__typename'];
    if (!parentTypename) {
        throw new Error('Did not fetch typename for object, unable to resolve interface.');
    }
    return parentTypename;
}

function mergeDeep(target) {
    var sources = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        sources[_i - 1] = arguments[_i];
    }
    var output = tslib.__assign({}, target);
    sources.forEach(function (source) {
        if (isObject(target) && isObject(source)) {
            Object.keys(source).forEach(function (key) {
                var _a, _b;
                if (isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, (_a = {}, _a[key] = source[key], _a));
                    }
                    else {
                        output[key] = mergeDeep(target[key], source[key]);
                    }
                }
                else {
                    Object.assign(output, (_b = {}, _b[key] = source[key], _b));
                }
            });
        }
    });
    return output;
}
function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}

function unwrapResult(parent, info, path) {
    var newParent = parent;
    var pathLength = path.length;
    for (var i = 0; i < pathLength; i++) {
        var responseKey = path[i];
        var errors = getErrors(newParent, responseKey);
        var subschema = getSubschema(newParent, responseKey);
        var object = newParent[responseKey];
        if (object == null) {
            return handleNull(info.fieldNodes, graphql.responsePathAsArray(info.path), errors);
        }
        setErrors(object, errors.map(function (error) {
            return relocatedError(error, error.nodes, error.path != null ? error.path.slice(1) : undefined);
        }));
        setObjectSubschema(object, subschema);
        newParent = object;
    }
    return newParent;
}
function dehoistResult(parent, delimeter) {
    if (delimeter === void 0) { delimeter = '__gqltf__'; }
    var result = Object.create(null);
    Object.keys(parent).forEach(function (alias) {
        var obj = result;
        var fieldNames = alias.split(delimeter);
        var fieldName = fieldNames.pop();
        fieldNames.forEach(function (key) {
            obj = obj[key] = obj[key] || Object.create(null);
        });
        obj[fieldName] = parent[alias];
    });
    result[ERROR_SYMBOL] = parent[ERROR_SYMBOL].map(function (error) {
        if (error.path != null) {
            var path = error.path.slice();
            var pathSegment = path.shift();
            var expandedPathSegment = pathSegment.split(delimeter);
            return relocatedError(error, error.nodes, expandedPathSegment.concat(path));
        }
        return error;
    });
    result[OBJECT_SUBSCHEMA_SYMBOL] = parent[OBJECT_SUBSCHEMA_SYMBOL];
    return result;
}
function mergeProxiedResults(target) {
    var sources = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        sources[_i - 1] = arguments[_i];
    }
    var errors = target[ERROR_SYMBOL].concat(sources.map(function (source) { return source[ERROR_SYMBOL]; }));
    var fieldSubschemaMap = sources.reduce(function (acc, source) {
        var subschema = source[OBJECT_SUBSCHEMA_SYMBOL];
        Object.keys(source).forEach(function (key) {
            acc[key] = subschema;
        });
        return acc;
    }, {});
    var result = mergeDeep.apply(void 0, tslib.__spreadArrays([target], sources));
    result[ERROR_SYMBOL] = errors;
    result[FIELD_SUBSCHEMA_MAP_SYMBOL] = target[FIELD_SUBSCHEMA_MAP_SYMBOL]
        ? mergeDeep(target[FIELD_SUBSCHEMA_MAP_SYMBOL], fieldSubschemaMap)
        : fieldSubschemaMap;
    return result;
}

function buildDelegationPlan(mergedTypeInfo, originalSelections, sourceSubschemas, targetSubschemas) {
    // 1.  calculate if possible to delegate to given subschema
    //    TODO: change logic so that required selection set can be spread across multiple subschemas?
    var proxiableSubschemas = [];
    var nonProxiableSubschemas = [];
    targetSubschemas.forEach(function (t) {
        if (sourceSubschemas.some(function (s) {
            var selectionSet = mergedTypeInfo.selectionSets.get(t);
            return mergedTypeInfo.containsSelectionSet.get(s).get(selectionSet);
        })) {
            proxiableSubschemas.push(t);
        }
        else {
            nonProxiableSubschemas.push(t);
        }
    });
    var uniqueFields = mergedTypeInfo.uniqueFields, nonUniqueFields = mergedTypeInfo.nonUniqueFields;
    var unproxiableSelections = [];
    // 2. for each selection:
    var delegationMap = new Map();
    originalSelections.forEach(function (selection) {
        // 2a. use uniqueFields map to assign fields to subschema if one of possible subschemas
        var uniqueSubschema = uniqueFields[selection.name.value];
        if (uniqueSubschema != null) {
            if (proxiableSubschemas.includes(uniqueSubschema)) {
                var existingSubschema = delegationMap.get(uniqueSubschema);
                if (existingSubschema != null) {
                    existingSubschema.push(selection);
                }
                else {
                    delegationMap.set(uniqueSubschema, [selection]);
                }
            }
            else {
                unproxiableSelections.push(selection);
            }
        }
        else {
            // 2b. use nonUniqueFields to assign to a possible subschema,
            //     preferring one of the subschemas already targets of delegation
            var nonUniqueSubschemas = nonUniqueFields[selection.name.value];
            nonUniqueSubschemas = nonUniqueSubschemas.filter(function (s) {
                return proxiableSubschemas.includes(s);
            });
            if (nonUniqueSubschemas != null) {
                var subschemas_1 = Array.from(delegationMap.keys());
                var existingSubschema = nonUniqueSubschemas.find(function (s) {
                    return subschemas_1.includes(s);
                });
                if (existingSubschema != null) {
                    delegationMap.get(existingSubschema).push(selection);
                }
                else {
                    delegationMap.set(nonUniqueSubschemas[0], [selection]);
                }
            }
            else {
                unproxiableSelections.push(selection);
            }
        }
    });
    return {
        delegationMap: delegationMap,
        unproxiableSelections: unproxiableSelections,
        proxiableSubschemas: proxiableSubschemas,
        nonProxiableSubschemas: nonProxiableSubschemas,
    };
}
function mergeFields(mergedTypeInfo, typeName, object, originalSelections, sourceSubschemas, targetSubschemas, context, info) {
    if (!originalSelections.length) {
        return object;
    }
    var _a = buildDelegationPlan(mergedTypeInfo, originalSelections, sourceSubschemas, targetSubschemas), delegationMap = _a.delegationMap, unproxiableSelections = _a.unproxiableSelections, proxiableSubschemas = _a.proxiableSubschemas, nonProxiableSubschemas = _a.nonProxiableSubschemas;
    if (!delegationMap.size) {
        return object;
    }
    var maybePromises = [];
    delegationMap.forEach(function (selections, s) {
        var maybePromise = s.merge[typeName].resolve(object, context, info, s, {
            kind: graphql.Kind.SELECTION_SET,
            selections: selections,
        });
        maybePromises.push(maybePromise);
    });
    var containsPromises = false;
    for (var _i = 0, maybePromises_1 = maybePromises; _i < maybePromises_1.length; _i++) {
        var maybePromise = maybePromises_1[_i];
        if (maybePromise instanceof Promise) {
            containsPromises = true;
            break;
        }
    }
    return containsPromises
        ? Promise.all(maybePromises).then(function (results) {
            return mergeFields(mergedTypeInfo, typeName, mergeProxiedResults.apply(void 0, tslib.__spreadArrays([object], results)), unproxiableSelections, sourceSubschemas.concat(proxiableSubschemas), nonProxiableSubschemas, context, info);
        })
        : mergeFields(mergedTypeInfo, typeName, mergeProxiedResults.apply(void 0, tslib.__spreadArrays([object], maybePromises)), unproxiableSelections, sourceSubschemas.concat(proxiableSubschemas), nonProxiableSubschemas, context, info);
}

function handleObject(type, object, errors, subschema, context, info, skipTypeMerging) {
    setErrors(object, errors.map(function (error) {
        return relocatedError(error, error.nodes, error.path != null ? error.path.slice(1) : undefined);
    }));
    setObjectSubschema(object, subschema);
    if (skipTypeMerging || !info.mergeInfo) {
        return object;
    }
    var typeName = graphql.isAbstractType(type)
        ? info.schema.getTypeMap()[resolveFromParentTypename(object)].name
        : type.name;
    var mergedTypeInfo = info.mergeInfo.mergedTypes[typeName];
    var targetSubschemas;
    if (mergedTypeInfo != null) {
        targetSubschemas = mergedTypeInfo.subschemas;
    }
    if (!targetSubschemas) {
        return object;
    }
    targetSubschemas = targetSubschemas.filter(function (s) { return s !== subschema; });
    if (!targetSubschemas.length) {
        return object;
    }
    var subFields = collectSubFields(info, object.__typename);
    var selections = getFieldsNotInSubschema(subFields, subschema, mergedTypeInfo, object.__typename);
    return mergeFields(mergedTypeInfo, typeName, object, selections, [subschema], targetSubschemas, context, info);
}
function collectSubFields(info, typeName) {
    var subFieldNodes = Object.create(null);
    var visitedFragmentNames = Object.create(null);
    info.fieldNodes.forEach(function (fieldNode) {
        subFieldNodes = collectFields({
            schema: info.schema,
            variableValues: info.variableValues,
            fragments: info.fragments,
        }, info.schema.getType(typeName), fieldNode.selectionSet, subFieldNodes, visitedFragmentNames);
    });
    return subFieldNodes;
}
function getFieldsNotInSubschema(subFieldNodes, subschema, mergedTypeInfo, typeName) {
    var typeMap = isSubschemaConfig(subschema)
        ? mergedTypeInfo.typeMaps.get(subschema)
        : subschema.getTypeMap();
    var fields = typeMap[typeName].getFields();
    var fieldsNotInSchema = [];
    Object.keys(subFieldNodes).forEach(function (responseName) {
        subFieldNodes[responseName].forEach(function (subFieldNode) {
            if (!(subFieldNode.name.value in fields)) {
                fieldsNotInSchema.push(subFieldNode);
            }
        });
    });
    return fieldsNotInSchema;
}

function handleList(type, list, errors, subschema, context, info, skipTypeMerging) {
    var childErrors = getErrorsByPathSegment(errors);
    return list.map(function (listMember, index) {
        return handleListMember(graphql.getNullableType(type.ofType), listMember, index, index in childErrors ? childErrors[index] : [], subschema, context, info, skipTypeMerging);
    });
}
function handleListMember(type, listMember, index, errors, subschema, context, info, skipTypeMerging) {
    if (listMember == null) {
        return handleNull(info.fieldNodes, tslib.__spreadArrays(graphql.responsePathAsArray(info.path), [index]), errors);
    }
    if (graphql.isLeafType(type)) {
        return type.parseValue(listMember);
    }
    else if (graphql.isCompositeType(type)) {
        return handleObject(type, listMember, errors, subschema, context, info, skipTypeMerging);
    }
    else if (graphql.isListType(type)) {
        return handleList(type, listMember, errors, subschema, context, info, skipTypeMerging);
    }
}

function checkResultAndHandleErrors(result, context, info, responseKey, subschema, returnType, skipTypeMerging) {
    if (responseKey === void 0) { responseKey = getResponseKeyFromInfo(info); }
    if (returnType === void 0) { returnType = info.returnType; }
    var errors = result.errors != null ? result.errors : [];
    var data = result.data != null ? result.data[responseKey] : undefined;
    return handleResult(data, errors, subschema, context, info, returnType, skipTypeMerging);
}
function handleResult(result, errors, subschema, context, info, returnType, skipTypeMerging) {
    if (returnType === void 0) { returnType = info.returnType; }
    var type = graphql.getNullableType(returnType);
    if (result == null) {
        return handleNull(info.fieldNodes, graphql.responsePathAsArray(info.path), errors);
    }
    if (graphql.isLeafType(type)) {
        return type.parseValue(result);
    }
    else if (graphql.isCompositeType(type)) {
        return handleObject(type, result, errors, subschema, context, info, skipTypeMerging);
    }
    else if (graphql.isListType(type)) {
        return handleList(type, result, errors, subschema, context, info, skipTypeMerging);
    }
}

var CheckResultAndHandleErrors = /** @class */ (function () {
    function CheckResultAndHandleErrors(info, fieldName, subschema, context, returnType, typeMerge) {
        if (returnType === void 0) { returnType = info.returnType; }
        this.context = context;
        this.info = info;
        this.fieldName = fieldName;
        this.subschema = subschema;
        this.returnType = returnType;
        this.typeMerge = typeMerge;
    }
    CheckResultAndHandleErrors.prototype.transformResult = function (result) {
        return checkResultAndHandleErrors(result, this.context != null ? this.context : {}, this.info, this.fieldName, this.subschema, this.returnType, this.typeMerge);
    };
    return CheckResultAndHandleErrors;
}());

function transformInputValue(type, value, transformer) {
    if (value == null) {
        return value;
    }
    var nullableType = graphql.getNullableType(type);
    if (graphql.isLeafType(nullableType)) {
        return transformer(nullableType, value);
    }
    else if (graphql.isListType(nullableType)) {
        return value.map(function (listMember) {
            return transformInputValue(nullableType.ofType, listMember, transformer);
        });
    }
    else if (graphql.isInputObjectType(nullableType)) {
        var fields_1 = nullableType.getFields();
        return keyValMap(Object.keys(value), function (key) { return key; }, function (key) { return transformInputValue(fields_1[key].type, value[key], transformer); });
    }
    // unreachable, no other possible return value
}
function serializeInputValue(type, value) {
    return transformInputValue(type, value, function (t, v) { return t.serialize(v); });
}
function parseInputValue(type, value) {
    return transformInputValue(type, value, function (t, v) { return t.parseValue(v); });
}

function astFromType(type) {
    if (graphql.isNonNullType(type)) {
        var innerType = astFromType(type.ofType);
        if (innerType.kind === graphql.Kind.NON_NULL_TYPE) {
            throw new Error("Invalid type node " + JSON.stringify(type) + ". Inner type of non-null type cannot be a non-null type.");
        }
        return {
            kind: graphql.Kind.NON_NULL_TYPE,
            type: innerType,
        };
    }
    else if (graphql.isListType(type)) {
        return {
            kind: graphql.Kind.LIST_TYPE,
            type: astFromType(type.ofType),
        };
    }
    return {
        kind: graphql.Kind.NAMED_TYPE,
        name: {
            kind: graphql.Kind.NAME,
            value: type.name,
        },
    };
}

function updateArgument(argName, argType, argumentNodes, variableDefinitionsMap, variableValues, newArg) {
    var varName;
    var numGeneratedVariables = 0;
    do {
        varName = "_v" + (numGeneratedVariables++).toString() + "_" + argName;
    } while (varName in variableDefinitionsMap);
    argumentNodes[argName] = {
        kind: graphql.Kind.ARGUMENT,
        name: {
            kind: graphql.Kind.NAME,
            value: argName,
        },
        value: {
            kind: graphql.Kind.VARIABLE,
            name: {
                kind: graphql.Kind.NAME,
                value: varName,
            },
        },
    };
    variableDefinitionsMap[varName] = {
        kind: graphql.Kind.VARIABLE_DEFINITION,
        variable: {
            kind: graphql.Kind.VARIABLE,
            name: {
                kind: graphql.Kind.NAME,
                value: varName,
            },
        },
        type: astFromType(argType),
    };
    variableValues[varName] = newArg;
}

function toObjMap(obj) {
    if (Object.getPrototypeOf(obj) === null) {
        return obj;
    }
    return Object.entries(obj).reduce(function (map, _a) {
        var key = _a[0], value = _a[1];
        map[key] = value;
        return map;
    }, Object.create(null));
}

var AddArgumentsAsVariables = /** @class */ (function () {
    function AddArgumentsAsVariables(targetSchema, args) {
        this.targetSchema = targetSchema;
        this.args = toObjMap(args);
    }
    AddArgumentsAsVariables.prototype.transformRequest = function (originalRequest) {
        var _a = addVariablesToRootField(this.targetSchema, originalRequest, this.args), document = _a.document, newVariables = _a.newVariables;
        return {
            document: document,
            variables: newVariables,
        };
    };
    return AddArgumentsAsVariables;
}());
function addVariablesToRootField(targetSchema, originalRequest, args) {
    var document = originalRequest.document;
    var variableValues = originalRequest.variables;
    var operations = document.definitions.filter(function (def) { return def.kind === graphql.Kind.OPERATION_DEFINITION; });
    var fragments = document.definitions.filter(function (def) { return def.kind === graphql.Kind.FRAGMENT_DEFINITION; });
    var newOperations = operations.map(function (operation) {
        var variableDefinitionMap = keyValMap(operation.variableDefinitions, function (def) { return def.variable.name.value; }, function (def) { return def; });
        var type;
        if (operation.operation === 'subscription') {
            type = targetSchema.getSubscriptionType();
        }
        else if (operation.operation === 'mutation') {
            type = targetSchema.getMutationType();
        }
        else {
            type = targetSchema.getQueryType();
        }
        var newSelectionSet = [];
        operation.selectionSet.selections.forEach(function (selection) {
            if (selection.kind === graphql.Kind.FIELD) {
                var argumentNodes = selection.arguments;
                var argumentNodeMap_1 = keyValMap(argumentNodes, function (argument) { return argument.name.value; }, function (argument) { return argument; });
                var targetField = type.getFields()[selection.name.value];
                // excludes __typename
                if (targetField != null) {
                    updateArguments(targetField, argumentNodeMap_1, variableDefinitionMap, variableValues, args);
                }
                newSelectionSet.push(tslib.__assign(tslib.__assign({}, selection), { arguments: Object.keys(argumentNodeMap_1).map(function (argName) { return argumentNodeMap_1[argName]; }) }));
            }
            else {
                newSelectionSet.push(selection);
            }
        });
        return tslib.__assign(tslib.__assign({}, operation), { variableDefinitions: Object.keys(variableDefinitionMap).map(function (varName) { return variableDefinitionMap[varName]; }), selectionSet: {
                kind: graphql.Kind.SELECTION_SET,
                selections: newSelectionSet,
            } });
    });
    return {
        document: tslib.__assign(tslib.__assign({}, document), { definitions: tslib.__spreadArrays(newOperations, fragments) }),
        newVariables: variableValues,
    };
}
function updateArguments(targetField, argumentNodeMap, variableDefinitionMap, variableValues, newArgs) {
    targetField.args.forEach(function (argument) {
        var argName = argument.name;
        var argType = argument.type;
        if (argName in newArgs) {
            updateArgument(argName, argType, argumentNodeMap, variableDefinitionMap, variableValues, serializeInputValue(argType, newArgs[argName]));
        }
    });
}

var version;
if (graphql.versionInfo != null && graphql.versionInfo.major >= 15) {
    version = 15;
}
else if (graphql.getOperationRootType != null) {
    version = 14;
}
else if (graphql.lexicographicSortSchema != null) {
    version = 13;
}
else if (graphql.printError != null) {
    version = 12;
}
else {
    version = 11;
}
function graphqlVersion() {
    return version;
}

var hasOwn = Object.prototype.hasOwnProperty;
function hasOwnProperty(object, propertyName) {
    return hasOwn.call(object, propertyName);
}

// graphql <v14.2 does not support toConfig
function schemaToConfig(schema) {
    if (schema.toConfig != null) {
        return schema.toConfig();
    }
    var newTypes = [];
    var types = schema.getTypeMap();
    Object.keys(types).forEach(function (typeName) {
        newTypes.push(types[typeName]);
    });
    var schemaConfig = {
        query: schema.getQueryType(),
        mutation: schema.getMutationType(),
        subscription: schema.getSubscriptionType(),
        types: newTypes,
        directives: schema.getDirectives().slice(),
        extensions: schema.extensions,
        astNode: schema.astNode,
        extensionASTNodes: schema.extensionASTNodes != null ? schema.extensionASTNodes : [],
        assumeValid: schema.__validationErrors !==
            undefined,
    };
    if (graphqlVersion() >= 15) {
        schemaConfig.description = schema.description;
    }
    return schemaConfig;
}
function toConfig(graphqlObject) {
    if (graphql.isSchema(graphqlObject)) {
        return schemaToConfig(graphqlObject);
    }
    else if (graphql.isDirective(graphqlObject)) {
        return directiveToConfig(graphqlObject);
    }
    else if (graphql.isNamedType(graphqlObject)) {
        return typeToConfig(graphqlObject);
    }
    // Input and output fields do not have predicates defined, but using duck typing,
    // type is defined for input and output fields
    if (graphqlObject.type != null) {
        if (graphqlObject.args != null ||
            graphqlObject.resolve != null ||
            graphqlObject.subscribe != null) {
            return fieldToConfig(graphqlObject);
        }
        else if (graphqlObject.defaultValue !== undefined) {
            return inputFieldToConfig(graphqlObject);
        }
        // Not all input and output fields can be checked by above in older versions
        // of graphql, but almost all properties on the field and config are identical.
        // In particular, just name and isDeprecated should be removed.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        var name_1 = graphqlObject.name, isDeprecated = graphqlObject.isDeprecated, rest = tslib.__rest(graphqlObject, ["name", "isDeprecated"]);
        return tslib.__assign({}, rest);
    }
    throw new Error("Unknown graphql object " + graphqlObject);
}
function typeToConfig(type) {
    if (graphql.isObjectType(type)) {
        return objectTypeToConfig(type);
    }
    else if (graphql.isInterfaceType(type)) {
        return interfaceTypeToConfig(type);
    }
    else if (graphql.isUnionType(type)) {
        return unionTypeToConfig(type);
    }
    else if (graphql.isEnumType(type)) {
        return enumTypeToConfig(type);
    }
    else if (graphql.isScalarType(type)) {
        return scalarTypeToConfig(type);
    }
    else if (graphql.isInputObjectType(type)) {
        return inputObjectTypeToConfig(type);
    }
    throw new Error("Unknown type " + type);
}
function objectTypeToConfig(type) {
    if (type.toConfig != null) {
        return type.toConfig();
    }
    var typeConfig = {
        name: type.name,
        description: type.description,
        interfaces: type.getInterfaces(),
        fields: fieldMapToConfig(type.getFields()),
        isTypeOf: type.isTypeOf,
        extensions: type.extensions,
        astNode: type.astNode,
        extensionASTNodes: type.extensionASTNodes != null ? type.extensionASTNodes : [],
    };
    return typeConfig;
}
function interfaceTypeToConfig(type) {
    if (type.toConfig != null) {
        return type.toConfig();
    }
    var typeConfig = {
        name: type.name,
        description: type.description,
        fields: fieldMapToConfig(type.getFields()),
        resolveType: type.resolveType,
        extensions: type.extensions,
        astNode: type.astNode,
        extensionASTNodes: type.extensionASTNodes != null ? type.extensionASTNodes : [],
    };
    if (graphqlVersion() >= 15) {
        typeConfig.interfaces = type.getInterfaces();
    }
    return typeConfig;
}
function unionTypeToConfig(type) {
    if (type.toConfig != null) {
        return type.toConfig();
    }
    var typeConfig = {
        name: type.name,
        description: type.description,
        types: type.getTypes(),
        resolveType: type.resolveType,
        extensions: type.extensions,
        astNode: type.astNode,
        extensionASTNodes: type.extensionASTNodes != null ? type.extensionASTNodes : [],
    };
    return typeConfig;
}
function enumTypeToConfig(type) {
    if (type.toConfig != null) {
        return type.toConfig();
    }
    var newValues = keyValMap(type.getValues(), function (value) { return value.name; }, function (value) { return ({
        description: value.description,
        value: value.value,
        deprecationReason: value.deprecationReason,
        extensions: value.extensions,
        astNode: value.astNode,
    }); });
    var typeConfig = {
        name: type.name,
        description: type.description,
        values: newValues,
        extensions: type.extensions,
        astNode: type.astNode,
        extensionASTNodes: type.extensionASTNodes != null ? type.extensionASTNodes : [],
    };
    return typeConfig;
}
function scalarTypeToConfig(type) {
    if (type.toConfig != null) {
        return type.toConfig();
    }
    var typeConfig = {
        name: type.name,
        description: type.description,
        serialize: graphqlVersion() >= 14 || hasOwnProperty(type, 'serialize')
            ? type.serialize
            : type._scalarConfig.serialize,
        parseValue: graphqlVersion() >= 14 || hasOwnProperty(type, 'parseValue')
            ? type.parseValue
            : type._scalarConfig.parseValue,
        parseLiteral: graphqlVersion() >= 14 || hasOwnProperty(type, 'parseLiteral')
            ? type.parseLiteral
            : type._scalarConfig.parseLiteral,
        extensions: type.extensions,
        astNode: type.astNode,
        extensionASTNodes: type.extensionASTNodes != null ? type.extensionASTNodes : [],
    };
    return typeConfig;
}
function inputObjectTypeToConfig(type) {
    if (type.toConfig != null) {
        return type.toConfig();
    }
    var typeConfig = {
        name: type.name,
        description: type.description,
        fields: inputFieldMapToConfig(type.getFields()),
        extensions: type.extensions,
        astNode: type.astNode,
        extensionASTNodes: type.extensionASTNodes != null ? type.extensionASTNodes : [],
    };
    return typeConfig;
}
function inputFieldMapToConfig(fields) {
    return keyValMap(Object.keys(fields), function (fieldName) { return fieldName; }, function (fieldName) { return toConfig(fields[fieldName]); });
}
function inputFieldToConfig(field) {
    return {
        description: field.description,
        type: field.type,
        defaultValue: field.defaultValue,
        extensions: field.extensions,
        astNode: field.astNode,
    };
}
function directiveToConfig(directive) {
    if (directive.toConfig != null) {
        return directive.toConfig();
    }
    var directiveConfig = {
        name: directive.name,
        description: directive.description,
        locations: directive.locations,
        args: argumentMapToConfig(directive.args),
        isRepeatable: directive.isRepeatable,
        extensions: directive.extensions,
        astNode: directive.astNode,
    };
    return directiveConfig;
}
function fieldMapToConfig(fields) {
    return keyValMap(Object.keys(fields), function (fieldName) { return fieldName; }, function (fieldName) { return toConfig(fields[fieldName]); });
}
function fieldToConfig(field) {
    return {
        description: field.description,
        type: field.type,
        args: argumentMapToConfig(field.args),
        resolve: field.resolve,
        subscribe: field.subscribe,
        deprecationReason: field.deprecationReason,
        extensions: field.extensions,
        astNode: field.astNode,
    };
}
function argumentMapToConfig(args) {
    var newArguments = {};
    args.forEach(function (arg) {
        newArguments[arg.name] = argumentToConfig(arg);
    });
    return newArguments;
}
function argumentToConfig(arg) {
    return {
        description: arg.description,
        type: arg.type,
        defaultValue: arg.defaultValue,
        extensions: arg.extensions,
        astNode: arg.astNode,
    };
}

function isSpecifiedScalarType(type) {
    return (graphql.isNamedType(type) &&
        // Would prefer to use specifiedScalarTypes.some(), however %checks needs
        // a simple expression.
        (type.name === graphql.GraphQLString.name ||
            type.name === graphql.GraphQLInt.name ||
            type.name === graphql.GraphQLFloat.name ||
            type.name === graphql.GraphQLBoolean.name ||
            type.name === graphql.GraphQLID.name));
}

function mapSchema(schema, schemaMapper) {
    if (schemaMapper === void 0) { schemaMapper = {}; }
    var originalTypeMap = schema.getTypeMap();
    var newTypeMap = Object.create(null);
    Object.keys(originalTypeMap).forEach(function (typeName) {
        if (!typeName.startsWith('__')) {
            var typeMapper = getMapper(schema, schemaMapper, originalTypeMap[typeName]);
            if (typeMapper != null) {
                var newType = typeMapper(originalTypeMap[typeName], schema);
                newTypeMap[typeName] =
                    newType !== undefined ? newType : originalTypeMap[typeName];
            }
            else {
                newTypeMap[typeName] = originalTypeMap[typeName];
            }
        }
    });
    var queryType = schema.getQueryType();
    var mutationType = schema.getMutationType();
    var subscriptionType = schema.getSubscriptionType();
    var newQueryTypeName = queryType != null
        ? newTypeMap[queryType.name] != null
            ? newTypeMap[queryType.name].name
            : undefined
        : undefined;
    var newMutationTypeName = mutationType != null
        ? newTypeMap[mutationType.name] != null
            ? newTypeMap[mutationType.name].name
            : undefined
        : undefined;
    var newSubscriptionTypeName = subscriptionType != null
        ? newTypeMap[subscriptionType.name] != null
            ? newTypeMap[subscriptionType.name].name
            : undefined
        : undefined;
    var originalDirectives = schema.getDirectives();
    var newDirectives = [];
    originalDirectives.forEach(function (directive) {
        var directiveMapper = getMapper(schema, schemaMapper, directive);
        if (directiveMapper != null) {
            var newDirective = directiveMapper(directive, schema);
            if (newDirective != null) {
                newDirectives.push(newDirective);
            }
        }
        else {
            newDirectives.push(directive);
        }
    });
    var _a = rewireTypes(newTypeMap, newDirectives), typeMap = _a.typeMap, directives = _a.directives;
    return new graphql.GraphQLSchema(tslib.__assign(tslib.__assign({}, toConfig(schema)), { query: newQueryTypeName
            ? typeMap[newQueryTypeName]
            : undefined, mutation: newMutationTypeName
            ? typeMap[newMutationTypeName]
            : undefined, subscription: newSubscriptionTypeName != null
            ? typeMap[newSubscriptionTypeName]
            : undefined, types: Object.keys(typeMap).map(function (typeName) { return typeMap[typeName]; }), directives: directives }));
}
function getTypeSpecifiers(type, schema) {
    var specifiers = [exports.MapperKind.TYPE];
    if (graphql.isObjectType(type)) {
        specifiers.push(exports.MapperKind.COMPOSITE_TYPE, exports.MapperKind.OBJECT_TYPE);
        var query = schema.getQueryType();
        var mutation = schema.getMutationType();
        var subscription = schema.getSubscriptionType();
        if (type === query) {
            specifiers.push(exports.MapperKind.ROOT_OBJECT, exports.MapperKind.QUERY);
        }
        else if (type === mutation) {
            specifiers.push(exports.MapperKind.ROOT_OBJECT, exports.MapperKind.MUTATION);
        }
        else if (type === subscription) {
            specifiers.push(exports.MapperKind.ROOT_OBJECT, exports.MapperKind.SUBSCRIPTION);
        }
    }
    else if (graphql.isInputType(type)) {
        specifiers.push(exports.MapperKind.INPUT_OBJECT_TYPE);
    }
    else if (graphql.isInterfaceType(type)) {
        specifiers.push(exports.MapperKind.COMPOSITE_TYPE, exports.MapperKind.ABSTRACT_TYPE, exports.MapperKind.INTERFACE_TYPE);
    }
    else if (graphql.isUnionType(type)) {
        specifiers.push(exports.MapperKind.COMPOSITE_TYPE, exports.MapperKind.ABSTRACT_TYPE, exports.MapperKind.UNION_TYPE);
    }
    else if (graphql.isEnumType(type)) {
        specifiers.push(exports.MapperKind.ENUM_TYPE);
    }
    else if (graphql.isScalarType(type)) {
        specifiers.push(exports.MapperKind.SCALAR_TYPE);
    }
    return specifiers;
}
function getMapper(schema, schemaMapper, typeOrDirective) {
    if (graphql.isNamedType(typeOrDirective)) {
        var specifiers = getTypeSpecifiers(typeOrDirective, schema);
        var typeMapper = void 0;
        var stack = tslib.__spreadArrays(specifiers);
        while (!typeMapper && stack.length > 0) {
            var next = stack.pop();
            typeMapper = schemaMapper[next];
        }
        return typeMapper != null ? typeMapper : null;
    }
    else if (graphql.isDirective(typeOrDirective)) {
        var directiveMapper = schemaMapper[exports.MapperKind.DIRECTIVE];
        return directiveMapper != null ? directiveMapper : null;
    }
}
function rewireTypes(originalTypeMap, directives) {
    var newTypeMap = Object.create(null);
    Object.keys(originalTypeMap).forEach(function (typeName) {
        var namedType = originalTypeMap[typeName];
        if (namedType == null || typeName.startsWith('__')) {
            return;
        }
        var newName = namedType.name;
        if (newName.startsWith('__')) {
            return;
        }
        if (newTypeMap[newName] != null) {
            throw new Error("Duplicate schema type name " + newName);
        }
        newTypeMap[newName] = namedType;
    });
    Object.keys(newTypeMap).forEach(function (typeName) {
        newTypeMap[typeName] = rewireNamedType(newTypeMap[typeName]);
    });
    var newDirectives = directives.map(function (directive) {
        return rewireDirective(directive);
    });
    return pruneTypes(newTypeMap, newDirectives);
    function rewireDirective(directive) {
        var directiveConfig = toConfig(directive);
        directiveConfig.args = rewireArgs(directiveConfig.args);
        return new graphql.GraphQLDirective(directiveConfig);
    }
    function rewireArgs(args) {
        var rewiredArgs = {};
        Object.keys(args).forEach(function (argName) {
            var arg = args[argName];
            var rewiredArgType = rewireType(arg.type);
            if (rewiredArgType != null) {
                arg.type = rewiredArgType;
                rewiredArgs[argName] = arg;
            }
        });
        return rewiredArgs;
    }
    function rewireNamedType(type) {
        if (graphql.isObjectType(type)) {
            var config_1 = toConfig(type);
            var newConfig = tslib.__assign(tslib.__assign({}, config_1), { fields: function () { return rewireFields(config_1.fields); }, interfaces: function () { return rewireNamedTypes(config_1.interfaces); } });
            return new graphql.GraphQLObjectType(newConfig);
        }
        else if (graphql.isInterfaceType(type)) {
            var config_2 = toConfig(type);
            var newConfig = tslib.__assign(tslib.__assign({}, config_2), { fields: function () { return rewireFields(config_2.fields); } });
            if (graphqlVersion() >= 15) {
                newConfig.interfaces = function () { return rewireNamedTypes(config_2.interfaces); };
            }
            return new graphql.GraphQLInterfaceType(newConfig);
        }
        else if (graphql.isUnionType(type)) {
            var config_3 = toConfig(type);
            var newConfig = tslib.__assign(tslib.__assign({}, config_3), { types: function () { return rewireNamedTypes(config_3.types); } });
            return new graphql.GraphQLUnionType(newConfig);
        }
        else if (graphql.isInputObjectType(type)) {
            var config_4 = toConfig(type);
            var newConfig = tslib.__assign(tslib.__assign({}, config_4), { fields: function () { return rewireInputFields(config_4.fields); } });
            return new graphql.GraphQLInputObjectType(newConfig);
        }
        else if (graphql.isEnumType(type)) {
            var enumConfig = toConfig(type);
            return new graphql.GraphQLEnumType(enumConfig);
        }
        else if (graphql.isScalarType(type)) {
            if (isSpecifiedScalarType(type)) {
                return type;
            }
            var scalarConfig = toConfig(type);
            return new graphql.GraphQLScalarType(scalarConfig);
        }
        throw new Error("Unexpected schema type: " + type);
    }
    function rewireFields(fields) {
        var rewiredFields = {};
        Object.keys(fields).forEach(function (fieldName) {
            var field = fields[fieldName];
            var rewiredFieldType = rewireType(field.type);
            if (rewiredFieldType != null) {
                field.type = rewiredFieldType;
                field.args = rewireArgs(field.args);
                rewiredFields[fieldName] = field;
            }
        });
        return rewiredFields;
    }
    function rewireInputFields(fields) {
        var rewiredFields = {};
        Object.keys(fields).forEach(function (fieldName) {
            var field = fields[fieldName];
            var rewiredFieldType = rewireType(field.type);
            if (rewiredFieldType != null) {
                field.type = rewiredFieldType;
                rewiredFields[fieldName] = field;
            }
        });
        return rewiredFields;
    }
    function rewireNamedTypes(namedTypes) {
        var rewiredTypes = [];
        namedTypes.forEach(function (namedType) {
            var rewiredType = rewireType(namedType);
            if (rewiredType != null) {
                rewiredTypes.push(rewiredType);
            }
        });
        return rewiredTypes;
    }
    function rewireType(type) {
        if (graphql.isListType(type)) {
            var rewiredType = rewireType(type.ofType);
            return rewiredType != null ? new graphql.GraphQLList(rewiredType) : null;
        }
        else if (graphql.isNonNullType(type)) {
            var rewiredType = rewireType(type.ofType);
            return rewiredType != null
                ? new graphql.GraphQLNonNull(rewiredType)
                : null;
        }
        else if (graphql.isNamedType(type)) {
            var originalType = originalTypeMap[type.name];
            return originalType != null ? newTypeMap[originalType.name] : null;
        }
        return null;
    }
}
function pruneTypes(typeMap, directives) {
    var newTypeMap = {};
    var implementedInterfaces = {};
    Object.keys(typeMap).forEach(function (typeName) {
        var namedType = typeMap[typeName];
        if (graphql.isObjectType(namedType) ||
            (graphqlVersion() >= 15 && graphql.isInterfaceType(namedType))) {
            namedType.getInterfaces().forEach(function (iface) {
                implementedInterfaces[iface.name] = true;
            });
        }
    });
    var prunedTypeMap = false;
    var typeNames = Object.keys(typeMap);
    for (var i = 0; i < typeNames.length; i++) {
        var typeName = typeNames[i];
        var type = typeMap[typeName];
        if (graphql.isObjectType(type) || graphql.isInputObjectType(type)) {
            // prune types with no fields
            if (Object.keys(type.getFields()).length) {
                newTypeMap[typeName] = type;
            }
            else {
                prunedTypeMap = true;
            }
        }
        else if (graphql.isUnionType(type)) {
            // prune unions without underlying types
            if (type.getTypes().length) {
                newTypeMap[typeName] = type;
            }
            else {
                prunedTypeMap = true;
            }
        }
        else if (graphql.isInterfaceType(type)) {
            // prune interfaces without fields or without implementations
            if (Object.keys(type.getFields()).length &&
                implementedInterfaces[type.name]) {
                newTypeMap[typeName] = type;
            }
            else {
                prunedTypeMap = true;
            }
        }
        else {
            newTypeMap[typeName] = type;
        }
    }
    // every prune requires another round of healing
    return prunedTypeMap
        ? rewireTypes(newTypeMap, directives)
        : { typeMap: typeMap, directives: directives };
}

function filterSchema(_a) {
    var _b;
    var schema = _a.schema, _c = _a.rootFieldFilter, rootFieldFilter = _c === void 0 ? function () { return true; } : _c, _d = _a.typeFilter, typeFilter = _d === void 0 ? function () { return true; } : _d, _e = _a.fieldFilter, fieldFilter = _e === void 0 ? function () { return true; } : _e;
    var filteredSchema = mapSchema(schema, (_b = {},
        _b[exports.MapperKind.QUERY] = function (type) {
            return filterRootFields(type, 'Query', rootFieldFilter);
        },
        _b[exports.MapperKind.MUTATION] = function (type) {
            return filterRootFields(type, 'Mutation', rootFieldFilter);
        },
        _b[exports.MapperKind.SUBSCRIPTION] = function (type) {
            return filterRootFields(type, 'Subscription', rootFieldFilter);
        },
        _b[exports.MapperKind.OBJECT_TYPE] = function (type) {
            return typeFilter(type.name, type)
                ? filterObjectFields(type, fieldFilter)
                : null;
        },
        _b[exports.MapperKind.INTERFACE_TYPE] = function (type) {
            return typeFilter(type.name, type) ? undefined : null;
        },
        _b[exports.MapperKind.UNION_TYPE] = function (type) {
            return typeFilter(type.name, type) ? undefined : null;
        },
        _b[exports.MapperKind.INPUT_OBJECT_TYPE] = function (type) {
            return typeFilter(type.name, type) ? undefined : null;
        },
        _b[exports.MapperKind.ENUM_TYPE] = function (type) {
            return typeFilter(type.name, type) ? undefined : null;
        },
        _b[exports.MapperKind.SCALAR_TYPE] = function (type) {
            return typeFilter(type.name, type) ? undefined : null;
        },
        _b));
    filteredSchema.transforms = schema.transforms;
    return filteredSchema;
}
function filterRootFields(type, operation, rootFieldFilter) {
    var config = toConfig(type);
    Object.keys(config.fields).forEach(function (fieldName) {
        if (!rootFieldFilter(operation, fieldName, config.fields[fieldName])) {
            delete config.fields[fieldName];
        }
    });
    return new graphql.GraphQLObjectType(config);
}
function filterObjectFields(type, fieldFilter) {
    var config = toConfig(type);
    Object.keys(config.fields).forEach(function (fieldName) {
        if (!fieldFilter(type.name, fieldName, config.fields[fieldName])) {
            delete config.fields[fieldName];
        }
    });
    return new graphql.GraphQLObjectType(config);
}

function cloneDirective(directive) {
    return new graphql.GraphQLDirective(toConfig(directive));
}
function cloneType(type) {
    if (graphql.isObjectType(type)) {
        var config = toConfig(type);
        return new graphql.GraphQLObjectType(tslib.__assign(tslib.__assign({}, config), { interfaces: typeof config.interfaces === 'function'
                ? config.interfaces
                : config.interfaces.slice() }));
    }
    else if (graphql.isInterfaceType(type)) {
        var config = toConfig(type);
        var newConfig = tslib.__assign(tslib.__assign({}, config), { interfaces: graphqlVersion() >= 15
                ? typeof config.interfaces === 'function'
                    ? config.interfaces
                    : config.interfaces.slice()
                : undefined });
        return new graphql.GraphQLInterfaceType(newConfig);
    }
    else if (graphql.isUnionType(type)) {
        var config = toConfig(type);
        return new graphql.GraphQLUnionType(tslib.__assign(tslib.__assign({}, config), { types: config.types.slice() }));
    }
    else if (graphql.isInputObjectType(type)) {
        return new graphql.GraphQLInputObjectType(toConfig(type));
    }
    else if (graphql.isEnumType(type)) {
        return new graphql.GraphQLEnumType(toConfig(type));
    }
    else if (graphql.isScalarType(type)) {
        return isSpecifiedScalarType(type)
            ? type
            : new graphql.GraphQLScalarType(toConfig(type));
    }
    throw new Error("Invalid type " + type);
}
function cloneSchema(schema) {
    return mapSchema(schema);
}

// polyfill for graphql prior to v13 which do not pass options to buildASTSchema
function buildSchema(ast, buildSchemaOptions) {
    return graphql.buildASTSchema(graphql.parse(ast), buildSchemaOptions);
}

function getResolversFromSchema(schema) {
    var resolvers = Object.create({});
    var typeMap = schema.getTypeMap();
    Object.keys(typeMap).forEach(function (typeName) {
        var type = typeMap[typeName];
        if (graphql.isScalarType(type)) {
            if (!isSpecifiedScalarType(type)) {
                resolvers[typeName] = cloneType(type);
            }
        }
        else if (graphql.isEnumType(type)) {
            resolvers[typeName] = {};
            var values = type.getValues();
            values.forEach(function (value) {
                resolvers[typeName][value.name] = value.value;
            });
        }
        else if (graphql.isInterfaceType(type)) {
            if (type.resolveType != null) {
                resolvers[typeName] = {
                    __resolveType: type.resolveType,
                };
            }
        }
        else if (graphql.isUnionType(type)) {
            if (type.resolveType != null) {
                resolvers[typeName] = {
                    __resolveType: type.resolveType,
                };
            }
        }
        else if (graphql.isObjectType(type)) {
            resolvers[typeName] = {};
            if (type.isTypeOf != null) {
                resolvers[typeName].__isTypeOf = type.isTypeOf;
            }
            var fields_1 = type.getFields();
            Object.keys(fields_1).forEach(function (fieldName) {
                var field = fields_1[fieldName];
                resolvers[typeName][fieldName] = {
                    resolve: field.resolve,
                    subscribe: field.subscribe,
                };
            });
        }
    });
    return resolvers;
}

// polyfill for graphql < v14.2 which does not support subscriptions
function extendSchema(schema, extension, options) {
    var subscriptionType = schema.getSubscriptionType();
    if (subscriptionType == null) {
        return graphql.extendSchema(schema, extension, options);
    }
    var resolvers = getResolversFromSchema(schema);
    var subscriptionTypeName = subscriptionType.name;
    var subscriptionResolvers = resolvers[subscriptionTypeName];
    var extendedSchema = graphql.extendSchema(schema, extension, options);
    var fields = extendedSchema.getSubscriptionType().getFields();
    Object.keys(subscriptionResolvers).forEach(function (fieldName) {
        fields[fieldName].subscribe = subscriptionResolvers[fieldName].subscribe;
    });
    return extendedSchema;
}

// A generic updater function for arrays or objects.
function updateEachKey(arrayOrObject, 
// The callback can return nothing or undefined to leave the key untouched, null to remove
// the key from the array or object, or a non-null V to replace the value.
updater) {
    var deletedCount = 0;
    Object.keys(arrayOrObject).forEach(function (key) {
        var result = updater(arrayOrObject[key], key);
        if (typeof result === 'undefined') {
            return;
        }
        if (result === null) {
            delete arrayOrObject[key];
            deletedCount++;
            return;
        }
        arrayOrObject[key] = result;
    });
    if (deletedCount > 0 && Array.isArray(arrayOrObject)) {
        // Remove any holes from the array due to deleted elements.
        arrayOrObject.splice(0).forEach(function (elem) {
            arrayOrObject.push(elem);
        });
    }
}

function createNamedStub(name, type) {
    var constructor;
    if (type === 'object') {
        constructor = graphql.GraphQLObjectType;
    }
    else if (type === 'interface') {
        constructor = graphql.GraphQLInterfaceType;
    }
    else {
        constructor = graphql.GraphQLInputObjectType;
    }
    return new constructor({
        name: name,
        fields: {
            __fake: {
                type: graphql.GraphQLString,
            },
        },
    });
}
function createStub(node, type) {
    switch (node.kind) {
        case graphql.Kind.LIST_TYPE:
            return new graphql.GraphQLList(createStub(node.type, type));
        case graphql.Kind.NON_NULL_TYPE:
            return new graphql.GraphQLNonNull(createStub(node.type, type));
        default:
            if (type === 'output') {
                return createNamedStub(node.name.value, 'object');
            }
            return createNamedStub(node.name.value, 'input');
    }
}
function isNamedStub(type) {
    if (graphql.isObjectType(type) || graphql.isInterfaceType(type) || graphql.isInputObjectType(type)) {
        var fields = type.getFields();
        var fieldNames = Object.keys(fields);
        return fieldNames.length === 1 && fields[fieldNames[0]].name === '__fake';
    }
    return false;
}
function getBuiltInForStub(type) {
    switch (type.name) {
        case graphql.GraphQLInt.name:
            return graphql.GraphQLInt;
        case graphql.GraphQLFloat.name:
            return graphql.GraphQLFloat;
        case graphql.GraphQLString.name:
            return graphql.GraphQLString;
        case graphql.GraphQLBoolean.name:
            return graphql.GraphQLBoolean;
        case graphql.GraphQLID.name:
            return graphql.GraphQLID;
        default:
            return type;
    }
}

// Update any references to named schema types that disagree with the named
// types found in schema.getTypeMap().
function healSchema(schema) {
    var typeMap = schema.getTypeMap();
    var directives = schema.getDirectives();
    var queryType = schema.getQueryType();
    var mutationType = schema.getMutationType();
    var subscriptionType = schema.getSubscriptionType();
    var newQueryTypeName = queryType != null
        ? typeMap[queryType.name] != null
            ? typeMap[queryType.name].name
            : undefined
        : undefined;
    var newMutationTypeName = mutationType != null
        ? typeMap[mutationType.name] != null
            ? typeMap[mutationType.name].name
            : undefined
        : undefined;
    var newSubscriptionTypeName = subscriptionType != null
        ? typeMap[subscriptionType.name] != null
            ? typeMap[subscriptionType.name].name
            : undefined
        : undefined;
    healTypes(typeMap, directives);
    var filteredTypeMap = {};
    Object.keys(typeMap).forEach(function (typeName) {
        if (!typeName.startsWith('__')) {
            filteredTypeMap[typeName] = typeMap[typeName];
        }
    });
    var healedSchema = new graphql.GraphQLSchema(tslib.__assign(tslib.__assign({}, toConfig(schema)), { query: newQueryTypeName ? filteredTypeMap[newQueryTypeName] : undefined, mutation: newMutationTypeName
            ? filteredTypeMap[newMutationTypeName]
            : undefined, subscription: newSubscriptionTypeName
            ? filteredTypeMap[newSubscriptionTypeName]
            : undefined, types: Object.keys(filteredTypeMap).map(function (typeName) { return filteredTypeMap[typeName]; }), directives: directives.slice() }));
    // Reconstruct the schema to reinitialize private variables
    // e.g. the stored implementation map and the proper root types.
    Object.assign(schema, healedSchema);
    return schema;
}
function healTypes(originalTypeMap, directives, config) {
    if (config === void 0) { config = {
        skipPruning: false,
    }; }
    var actualNamedTypeMap = Object.create(null);
    // If any of the .name properties of the GraphQLNamedType objects in
    // schema.getTypeMap() have changed, the keys of the type map need to
    // be updated accordingly.
    Object.entries(originalTypeMap).forEach(function (_a) {
        var typeName = _a[0], namedType = _a[1];
        if (namedType == null || typeName.startsWith('__')) {
            return;
        }
        var actualName = namedType.name;
        if (actualName.startsWith('__')) {
            return;
        }
        if (actualName in actualNamedTypeMap) {
            throw new Error("Duplicate schema type name " + actualName);
        }
        actualNamedTypeMap[actualName] = namedType;
        // Note: we are deliberately leaving namedType in the schema by its
        // original name (which might be different from actualName), so that
        // references by that name can be healed.
    });
    // Now add back every named type by its actual name.
    Object.entries(actualNamedTypeMap).forEach(function (_a) {
        var typeName = _a[0], namedType = _a[1];
        originalTypeMap[typeName] = namedType;
    });
    // Directive declaration argument types can refer to named types.
    directives.forEach(function (decl) {
        updateEachKey(decl.args, function (arg) {
            arg.type = healType(arg.type);
            return arg.type === null ? null : arg;
        });
    });
    Object.entries(originalTypeMap).forEach(function (_a) {
        var typeName = _a[0], namedType = _a[1];
        // Heal all named types, except for dangling references, kept only to redirect.
        if (!typeName.startsWith('__') && typeName in actualNamedTypeMap) {
            if (namedType != null) {
                healNamedType(namedType);
            }
        }
    });
    updateEachKey(originalTypeMap, function (_namedType, typeName) {
        // Dangling references to renamed types should remain in the schema
        // during healing, but must be removed now, so that the following
        // invariant holds for all names: schema.getType(name).name === name
        if (!typeName.startsWith('__') && !(typeName in actualNamedTypeMap)) {
            return null;
        }
    });
    if (!config.skipPruning) {
        pruneTypes$1(originalTypeMap, directives);
    }
    function healNamedType(type) {
        if (graphql.isObjectType(type)) {
            healFields(type);
            healInterfaces(type);
            return;
        }
        else if (graphql.isInterfaceType(type)) {
            healFields(type);
            if (graphqlVersion() >= 15) {
                healInterfaces(type);
            }
            return;
        }
        else if (graphql.isUnionType(type)) {
            healUnderlyingTypes(type);
            return;
        }
        else if (graphql.isInputObjectType(type)) {
            healInputFields(type);
            return;
        }
        else if (graphql.isLeafType(type)) {
            return;
        }
        throw new Error("Unexpected schema type: " + type);
    }
    function healFields(type) {
        updateEachKey(type.getFields(), function (field) {
            updateEachKey(field.args, function (arg) {
                arg.type = healType(arg.type);
                return arg.type === null ? null : arg;
            });
            field.type = healType(field.type);
            return field.type === null ? null : field;
        });
    }
    function healInterfaces(type) {
        updateEachKey(type.getInterfaces(), function (iface) {
            var healedType = healType(iface);
            return healedType;
        });
    }
    function healInputFields(type) {
        updateEachKey(type.getFields(), function (field) {
            field.type = healType(field.type);
            return field.type === null ? null : field;
        });
    }
    function healUnderlyingTypes(type) {
        updateEachKey(type.getTypes(), function (t) {
            var healedType = healType(t);
            return healedType;
        });
    }
    function healType(type) {
        // Unwrap the two known wrapper types
        if (graphql.isListType(type)) {
            var healedType = healType(type.ofType);
            return healedType != null ? new graphql.GraphQLList(healedType) : null;
        }
        else if (graphql.isNonNullType(type)) {
            var healedType = healType(type.ofType);
            return healedType != null ? new graphql.GraphQLNonNull(healedType) : null;
        }
        else if (graphql.isNamedType(type)) {
            // If a type annotation on a field or an argument or a union member is
            // any `GraphQLNamedType` with a `name`, then it must end up identical
            // to `schema.getType(name)`, since `schema.getTypeMap()` is the source
            // of truth for all named schema types.
            // Note that new types can still be simply added by adding a field, as
            // the official type will be undefined, not null.
            var officialType = originalTypeMap[type.name];
            if (officialType === undefined) {
                if (isNamedStub(type)) {
                    officialType = getBuiltInForStub(type);
                }
                else {
                    officialType = type;
                }
                originalTypeMap[type.name] = officialType;
            }
            return officialType;
        }
        return null;
    }
}
function pruneTypes$1(typeMap, directives) {
    var implementedInterfaces = {};
    Object.values(typeMap).forEach(function (namedType) {
        if (graphql.isObjectType(namedType) ||
            (graphqlVersion() >= 15 && graphql.isInterfaceType(namedType))) {
            namedType.getInterfaces().forEach(function (iface) {
                implementedInterfaces[iface.name] = true;
            });
        }
    });
    var prunedTypeMap = false;
    var typeNames = Object.keys(typeMap);
    for (var i = 0; i < typeNames.length; i++) {
        var typeName = typeNames[i];
        var type = typeMap[typeName];
        if (graphql.isObjectType(type) || graphql.isInputObjectType(type)) {
            // prune types with no fields
            if (!Object.keys(type.getFields()).length) {
                typeMap[typeName] = null;
                prunedTypeMap = true;
            }
        }
        else if (graphql.isUnionType(type)) {
            // prune unions without underlying types
            if (!type.getTypes().length) {
                typeMap[typeName] = null;
                prunedTypeMap = true;
            }
        }
        else if (graphql.isInterfaceType(type)) {
            // prune interfaces without fields or without implementations
            if (!Object.keys(type.getFields()).length ||
                !(type.name in implementedInterfaces)) {
                typeMap[typeName] = null;
                prunedTypeMap = true;
            }
        }
    }
    // every prune requires another round of healing
    if (prunedTypeMap) {
        healTypes(typeMap, directives);
    }
}

// Abstract base class of any visitor implementation, defining the available
// visitor methods along with their parameter types, and providing a static
// helper function for determining whether a subclass implements a given
// visitor method, as opposed to inheriting one of the stubs defined here.
var SchemaVisitor = /** @class */ (function () {
    function SchemaVisitor() {
    }
    // Determine if this SchemaVisitor (sub)class implements a particular
    // visitor method.
    SchemaVisitor.implementsVisitorMethod = function (methodName) {
        if (!methodName.startsWith('visit')) {
            return false;
        }
        var method = this.prototype[methodName];
        if (typeof method !== 'function') {
            return false;
        }
        if (this === SchemaVisitor) {
            // The SchemaVisitor class implements every visitor method.
            return true;
        }
        var stub = SchemaVisitor.prototype[methodName];
        if (method === stub) {
            // If this.prototype[methodName] was just inherited from SchemaVisitor,
            // then this class does not really implement the method.
            return false;
        }
        return true;
    };
    // Concrete subclasses of SchemaVisitor should override one or more of these
    // visitor methods, in order to express their interest in handling certain
    // schema types/locations. Each method may return null to remove the given
    // type from the schema, a non-null value of the same type to update the
    // type in the schema, or nothing to leave the type as it was.
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    SchemaVisitor.prototype.visitSchema = function (_schema) { };
    SchemaVisitor.prototype.visitScalar = function (_scalar) { };
    SchemaVisitor.prototype.visitObject = function (_object) { };
    SchemaVisitor.prototype.visitFieldDefinition = function (_field, _details) { };
    SchemaVisitor.prototype.visitArgumentDefinition = function (_argument, _details) { };
    SchemaVisitor.prototype.visitInterface = function (_iface) { };
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    SchemaVisitor.prototype.visitUnion = function (_union) { };
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    SchemaVisitor.prototype.visitEnum = function (_type) { };
    SchemaVisitor.prototype.visitEnumValue = function (_value, _details) { };
    SchemaVisitor.prototype.visitInputObject = function (_object) { };
    SchemaVisitor.prototype.visitInputFieldDefinition = function (_field, _details) { };
    return SchemaVisitor;
}());

/**
 * Creates a keyed JS object from an array, given a function to produce the keys
 * for each value in the array.
 *
 * This provides a convenient lookup for the array items if the key function
 * produces unique results.
 *
 *     const phoneBook = [
 *       { name: 'Jon', num: '555-1234' },
 *       { name: 'Jenny', num: '867-5309' }
 *     ]
 *
 *     // { Jon: { name: 'Jon', num: '555-1234' },
 *     //   Jenny: { name: 'Jenny', num: '867-5309' } }
 *     const entriesByName = keyMap(
 *       phoneBook,
 *       entry => entry.name
 *     )
 *
 *     // { name: 'Jenny', num: '857-6309' }
 *     const jennyEntry = entriesByName['Jenny']
 *
 */
function keyMap(list, keyFn) {
    return list.reduce(function (map, item) {
        map[keyFn(item)] = item;
        return map;
    }, Object.create(null));
}

// Similar to the graphql-js function of the same name, slightly simplified:
// https://github.com/graphql/graphql-js/blob/master/src/utilities/valueFromASTUntyped.js
function valueFromASTUntyped(valueNode) {
    switch (valueNode.kind) {
        case graphql.Kind.NULL:
            return null;
        case graphql.Kind.INT:
            return parseInt(valueNode.value, 10);
        case graphql.Kind.FLOAT:
            return parseFloat(valueNode.value);
        case graphql.Kind.STRING:
        case graphql.Kind.ENUM:
        case graphql.Kind.BOOLEAN:
            return valueNode.value;
        case graphql.Kind.LIST:
            return valueNode.values.map(valueFromASTUntyped);
        case graphql.Kind.OBJECT: {
            return keyValMap(valueNode.fields, function (field) { return field.name.value; }, function (field) { return valueFromASTUntyped(field.value); });
        }
        /* istanbul ignore next */
        default:
            throw new Error('Unexpected value kind: ' + valueNode.kind);
    }
}

// Generic function for visiting GraphQLSchema objects.
function visitSchema(schema, 
// To accommodate as many different visitor patterns as possible, the
// visitSchema function does not simply accept a single instance of the
// SchemaVisitor class, but instead accepts a function that takes the
// current VisitableSchemaType object and the name of a visitor method and
// returns an array of SchemaVisitor instances that implement the visitor
// method and have an interest in handling the given VisitableSchemaType
// object. In the simplest case, this function can always return an array
// containing a single visitor object, without even looking at the type or
// methodName parameters. In other cases, this function might sometimes
// return an empty array to indicate there are no visitors that should be
// applied to the given VisitableSchemaType object. For an example of a
// visitor pattern that benefits from this abstraction, see the
// SchemaDirectiveVisitor class below.
visitorOrVisitorSelector) {
    var visitorSelector = typeof visitorOrVisitorSelector === 'function'
        ? visitorOrVisitorSelector
        : function () { return visitorOrVisitorSelector; };
    // Helper function that calls visitorSelector and applies the resulting
    // visitors to the given type, with arguments [type, ...args].
    function callMethod(methodName, type) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        var visitors = visitorSelector(type, methodName);
        visitors = Array.isArray(visitors) ? visitors : [visitors];
        var finalType = type;
        visitors.every(function (visitorOrVisitorDef) {
            var newType;
            if (visitorOrVisitorDef instanceof SchemaVisitor) {
                newType = visitorOrVisitorDef[methodName].apply(visitorOrVisitorDef, tslib.__spreadArrays([finalType], args));
            }
            else if (graphql.isNamedType(finalType) &&
                (methodName === 'visitScalar' ||
                    methodName === 'visitEnum' ||
                    methodName === 'visitObject' ||
                    methodName === 'visitInputObject' ||
                    methodName === 'visitUnion' ||
                    methodName === 'visitInterface')) {
                var specifiers = getTypeSpecifiers$1(finalType, schema);
                var typeVisitor = getVisitor(visitorOrVisitorDef, specifiers);
                newType =
                    typeVisitor != null ? typeVisitor(finalType, schema) : undefined;
            }
            if (typeof newType === 'undefined') {
                // Keep going without modifying type.
                return true;
            }
            if (methodName === 'visitSchema' || graphql.isSchema(finalType)) {
                throw new Error("Method " + methodName + " cannot replace schema with " + newType);
            }
            if (newType === null) {
                // Stop the loop and return null form callMethod, which will cause
                // the type to be removed from the schema.
                finalType = null;
                return false;
            }
            // Update type to the new type returned by the visitor method, so that
            // later directives will see the new type, and callMethod will return
            // the final type.
            finalType = newType;
            return true;
        });
        // If there were no directives for this type object, or if all visitor
        // methods returned nothing, type will be returned unmodified.
        return finalType;
    }
    // Recursive helper function that calls any appropriate visitor methods for
    // each object in the schema, then traverses the object's children (if any).
    function visit(type) {
        if (graphql.isSchema(type)) {
            // Unlike the other types, the root GraphQLSchema object cannot be
            // replaced by visitor methods, because that would make life very hard
            // for SchemaVisitor subclasses that rely on the original schema object.
            callMethod('visitSchema', type);
            var typeMap_1 = type.getTypeMap();
            Object.entries(typeMap_1).forEach(function (_a) {
                var typeName = _a[0], namedType = _a[1];
                if (!typeName.startsWith('__') && namedType != null) {
                    // Call visit recursively to let it determine which concrete
                    // subclass of GraphQLNamedType we found in the type map.
                    // We do not use updateEachKey because we want to preserve
                    // deleted types in the typeMap so that other types that reference
                    // the deleted types can be healed.
                    typeMap_1[typeName] = visit(namedType);
                }
            });
            return type;
        }
        if (graphql.isObjectType(type)) {
            // Note that callMethod('visitObject', type) may not actually call any
            // methods, if there are no @directive annotations associated with this
            // type, or if this SchemaDirectiveVisitor subclass does not override
            // the visitObject method.
            var newObject = callMethod('visitObject', type);
            if (newObject != null) {
                visitFields(newObject);
            }
            return newObject;
        }
        if (graphql.isInterfaceType(type)) {
            var newInterface = callMethod('visitInterface', type);
            if (newInterface != null) {
                visitFields(newInterface);
            }
            return newInterface;
        }
        if (graphql.isInputObjectType(type)) {
            var newInputObject_1 = callMethod('visitInputObject', type);
            if (newInputObject_1 != null) {
                var fieldMap = newInputObject_1.getFields();
                updateEachKey(fieldMap, function (field) {
                    return callMethod('visitInputFieldDefinition', field, {
                        // Since we call a different method for input object fields, we
                        // can't reuse the visitFields function here.
                        objectType: newInputObject_1,
                    });
                });
            }
            return newInputObject_1;
        }
        if (graphql.isScalarType(type)) {
            return callMethod('visitScalar', type);
        }
        if (graphql.isUnionType(type)) {
            return callMethod('visitUnion', type);
        }
        if (graphql.isEnumType(type)) {
            var newEnum_1 = callMethod('visitEnum', type);
            if (newEnum_1 != null) {
                updateEachKey(newEnum_1.getValues(), function (value) {
                    return callMethod('visitEnumValue', value, {
                        enumType: newEnum_1,
                    });
                });
            }
            return newEnum_1;
        }
        throw new Error("Unexpected schema type: " + type);
    }
    function visitFields(type) {
        updateEachKey(type.getFields(), function (field) {
            // It would be nice if we could call visit(field) recursively here, but
            // GraphQLField is merely a type, not a value that can be detected using
            // an instanceof check, so we have to visit the fields in this lexical
            // context, so that TypeScript can validate the call to
            // visitFieldDefinition.
            var newField = callMethod('visitFieldDefinition', field, {
                // While any field visitor needs a reference to the field object, some
                // field visitors may also need to know the enclosing (parent) type,
                // perhaps to determine if the parent is a GraphQLObjectType or a
                // GraphQLInterfaceType. To obtain a reference to the parent, a
                // visitor method can have a second parameter, which will be an object
                // with an .objectType property referring to the parent.
                objectType: type,
            });
            if (newField.args != null) {
                updateEachKey(newField.args, function (arg) {
                    return callMethod('visitArgumentDefinition', arg, {
                        // Like visitFieldDefinition, visitArgumentDefinition takes a
                        // second parameter that provides additional context, namely the
                        // parent .field and grandparent .objectType. Remember that the
                        // current GraphQLSchema is always available via this.schema.
                        field: newField,
                        objectType: type,
                    });
                });
            }
            return newField;
        });
    }
    visit(schema);
    // Automatically update any references to named schema types replaced
    // during the traversal, so implementors don't have to worry about that.
    healSchema(schema);
    // Return schema for convenience, even though schema parameter has all updated types.
    return schema;
}
function getTypeSpecifiers$1(type, schema) {
    var specifiers = [exports.VisitSchemaKind.TYPE];
    if (graphql.isObjectType(type)) {
        specifiers.push(exports.VisitSchemaKind.COMPOSITE_TYPE, exports.VisitSchemaKind.OBJECT_TYPE);
        var query = schema.getQueryType();
        var mutation = schema.getMutationType();
        var subscription = schema.getSubscriptionType();
        if (type === query) {
            specifiers.push(exports.VisitSchemaKind.ROOT_OBJECT, exports.VisitSchemaKind.QUERY);
        }
        else if (type === mutation) {
            specifiers.push(exports.VisitSchemaKind.ROOT_OBJECT, exports.VisitSchemaKind.MUTATION);
        }
        else if (type === subscription) {
            specifiers.push(exports.VisitSchemaKind.ROOT_OBJECT, exports.VisitSchemaKind.SUBSCRIPTION);
        }
    }
    else if (graphql.isInputType(type)) {
        specifiers.push(exports.VisitSchemaKind.INPUT_OBJECT_TYPE);
    }
    else if (graphql.isInterfaceType(type)) {
        specifiers.push(exports.VisitSchemaKind.COMPOSITE_TYPE, exports.VisitSchemaKind.ABSTRACT_TYPE, exports.VisitSchemaKind.INTERFACE_TYPE);
    }
    else if (graphql.isUnionType(type)) {
        specifiers.push(exports.VisitSchemaKind.COMPOSITE_TYPE, exports.VisitSchemaKind.ABSTRACT_TYPE, exports.VisitSchemaKind.UNION_TYPE);
    }
    else if (graphql.isEnumType(type)) {
        specifiers.push(exports.VisitSchemaKind.ENUM_TYPE);
    }
    else if (graphql.isScalarType(type)) {
        specifiers.push(exports.VisitSchemaKind.SCALAR_TYPE);
    }
    return specifiers;
}
function getVisitor(visitorDef, specifiers) {
    var typeVisitor;
    var stack = tslib.__spreadArrays(specifiers);
    while (!typeVisitor && stack.length > 0) {
        var next = stack.pop();
        typeVisitor = visitorDef[next];
    }
    return typeVisitor != null ? typeVisitor : null;
}

var MAX_ARRAY_LENGTH = 10;
var MAX_RECURSIVE_DEPTH = 2;
/**
 * Used to print values in error messages.
 */
function inspect(value) {
    return formatValue(value, []);
}
function formatValue(value, seenValues) {
    switch (typeof value) {
        case 'string':
            return JSON.stringify(value);
        case 'function':
            return value.name
                ? "[function " + value.name + "]"
                : '[function]';
        case 'object':
            if (value === null) {
                return 'null';
            }
            return formatObjectValue(value, seenValues);
        default:
            return String(value);
    }
}
function formatObjectValue(value, previouslySeenValues) {
    if (previouslySeenValues.indexOf(value) !== -1) {
        return '[Circular]';
    }
    var seenValues = tslib.__spreadArrays(previouslySeenValues, [value]);
    var customInspectFn = getCustomFn(value);
    if (customInspectFn !== undefined) {
        var customValue = customInspectFn.call(value);
        // check for infinite recursion
        if (customValue !== value) {
            return typeof customValue === 'string'
                ? customValue
                : formatValue(customValue, seenValues);
        }
    }
    else if (Array.isArray(value)) {
        return formatArray(value, seenValues);
    }
    return formatObject(value, seenValues);
}
function formatObject(object, seenValues) {
    var keys = Object.keys(object);
    if (keys.length === 0) {
        return '{}';
    }
    if (seenValues.length > MAX_RECURSIVE_DEPTH) {
        return '[' + getObjectTag(object) + ']';
    }
    var properties = keys.map(function (key) {
        var value = formatValue(object[key], seenValues);
        return key + ': ' + value;
    });
    return '{ ' + properties.join(', ') + ' }';
}
function formatArray(array, seenValues) {
    if (array.length === 0) {
        return '[]';
    }
    if (seenValues.length > MAX_RECURSIVE_DEPTH) {
        return '[Array]';
    }
    var len = Math.min(MAX_ARRAY_LENGTH, array.length);
    var remaining = array.length - len;
    var items = [];
    for (var i = 0; i < len; ++i) {
        items.push(formatValue(array[i], seenValues));
    }
    if (remaining === 1) {
        items.push('... 1 more item');
    }
    else if (remaining > 1) {
        items.push("... " + remaining.toString(10) + " more items");
    }
    return '[' + items.join(', ') + ']';
}
function getCustomFn(obj) {
    if (typeof obj.inspect === 'function') {
        return obj.inspect;
    }
}
function getObjectTag(obj) {
    var tag = Object.prototype.toString
        .call(obj)
        .replace(/^\[object /, '')
        .replace(/]$/, '');
    if (tag === 'Object' && typeof obj.constructor === 'function') {
        var name_1 = obj.constructor.name;
        if (typeof name_1 === 'string' && name_1 !== '') {
            return name_1;
        }
    }
    return tag;
}

/**
 * Prepares an object map of argument values given a list of argument
 * definitions and list of argument AST nodes.
 *
 * Note: The returned value is a plain Object with a prototype, since it is
 * exposed to user code. Care should be taken to not pull values from the
 * Object prototype.
 */
function getArgumentValues(def, node, variableValues) {
    if (variableValues === void 0) { variableValues = {}; }
    var _a;
    var variableMap = toObjMap(variableValues);
    var coercedValues = {};
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    var argumentNodes = (_a = node.arguments) !== null && _a !== void 0 ? _a : [];
    var argNodeMap = keyMap(argumentNodes, function (arg) { return arg.name.value; });
    for (var _i = 0, _b = def.args; _i < _b.length; _i++) {
        var argDef = _b[_i];
        var name_1 = argDef.name;
        var argType = argDef.type;
        var argumentNode = argNodeMap[name_1];
        if (!argumentNode) {
            if (argDef.defaultValue !== undefined) {
                coercedValues[name_1] = argDef.defaultValue;
            }
            else if (graphql.isNonNullType(argType)) {
                throw new graphql.GraphQLError("Argument \"" + name_1 + "\" of required type \"" + inspect(argType) + "\" " +
                    'was not provided.', node);
            }
            continue;
        }
        var valueNode = argumentNode.value;
        var isNull = valueNode.kind === graphql.Kind.NULL;
        if (valueNode.kind === graphql.Kind.VARIABLE) {
            var variableName = valueNode.name.value;
            if (variableValues == null || !(variableName in variableMap)) {
                if (argDef.defaultValue !== undefined) {
                    coercedValues[name_1] = argDef.defaultValue;
                }
                else if (graphql.isNonNullType(argType)) {
                    throw new graphql.GraphQLError("Argument \"" + name_1 + "\" of required type \"" + inspect(argType) + "\" " +
                        ("was provided the variable \"$" + variableName + "\" which was not provided a runtime value."), valueNode);
                }
                continue;
            }
            isNull = variableValues[variableName] == null;
        }
        if (isNull && graphql.isNonNullType(argType)) {
            throw new graphql.GraphQLError("Argument \"" + name_1 + "\" of non-null type \"" + inspect(argType) + "\" " +
                'must not be null.', valueNode);
        }
        var coercedValue = graphql.valueFromAST(valueNode, argType, variableValues);
        if (coercedValue === undefined) {
            // Note: ValuesOfCorrectTypeRule validation should catch this before
            // execution. This is a runtime check to ensure execution does not
            // continue with an invalid argument value.
            throw new graphql.GraphQLError("Argument \"" + name_1 + "\" has invalid value " + graphql.print(valueNode) + ".", valueNode);
        }
        coercedValues[name_1] = coercedValue;
    }
    return coercedValues;
}

// This class represents a reusable implementation of a @directive that may
// appear in a GraphQL schema written in Schema Definition Language.
//
// By overriding one or more visit{Object,Union,...} methods, a subclass
// registers interest in certain schema types, such as GraphQLObjectType,
// GraphQLUnionType, etc. When SchemaDirectiveVisitor.visitSchemaDirectives is
// called with a GraphQLSchema object and a map of visitor subclasses, the
// overidden methods of those subclasses allow the visitors to obtain
// references to any type objects that have @directives attached to them,
// enabling visitors to inspect or modify the schema as appropriate.
//
// For example, if a directive called @rest(url: "...") appears after a field
// definition, a SchemaDirectiveVisitor subclass could provide meaning to that
// directive by overriding the visitFieldDefinition method (which receives a
// GraphQLField parameter), and then the body of that visitor method could
// manipulate the field's resolver function to fetch data from a REST endpoint
// described by the url argument passed to the @rest directive:
//
//   const typeDefs = `
//   type Query {
//     people: [Person] @rest(url: "/api/v1/people")
//   }`;
//
//   const schema = makeExecutableSchema({ typeDefs });
//
//   SchemaDirectiveVisitor.visitSchemaDirectives(schema, {
//     rest: class extends SchemaDirectiveVisitor {
//       public visitFieldDefinition(field: GraphQLField<any, any>) {
//         const { url } = this.args;
//         field.resolve = () => fetch(url);
//       }
//     }
//   });
//
// The subclass in this example is defined as an anonymous class expression,
// for brevity. A truly reusable SchemaDirectiveVisitor would most likely be
// defined in a library using a named class declaration, and then exported for
// consumption by other modules and packages.
//
// See below for a complete list of overridable visitor methods, their
// parameter types, and more details about the properties exposed by instances
// of the SchemaDirectiveVisitor class.
var SchemaDirectiveVisitor = /** @class */ (function (_super) {
    tslib.__extends(SchemaDirectiveVisitor, _super);
    // Mark the constructor protected to enforce passing SchemaDirectiveVisitor
    // subclasses (not instances) to visitSchemaDirectives.
    function SchemaDirectiveVisitor(config) {
        var _this = _super.call(this) || this;
        _this.name = config.name;
        _this.args = config.args;
        _this.visitedType = config.visitedType;
        _this.schema = config.schema;
        _this.context = config.context;
        return _this;
    }
    // Override this method to return a custom GraphQLDirective (or modify one
    // already present in the schema) to enforce argument types, provide default
    // argument values, or specify schema locations where this @directive may
    // appear. By default, any declaration found in the schema will be returned.
    SchemaDirectiveVisitor.getDirectiveDeclaration = function (directiveName, schema) {
        return schema.getDirective(directiveName);
    };
    // Call SchemaDirectiveVisitor.visitSchemaDirectives to visit every
    // @directive in the schema and create an appropriate SchemaDirectiveVisitor
    // instance to visit the object decorated by the @directive.
    SchemaDirectiveVisitor.visitSchemaDirectives = function (schema, 
    // The keys of this object correspond to directive names as they appear
    // in the schema, and the values should be subclasses (not instances!)
    // of the SchemaDirectiveVisitor class. This distinction is important
    // because a new SchemaDirectiveVisitor instance will be created each
    // time a matching directive is found in the schema AST, with arguments
    // and other metadata specific to that occurrence. To help prevent the
    // mistake of passing instances, the SchemaDirectiveVisitor constructor
    // method is marked as protected.
    directiveVisitors, 
    // Optional context object that will be available to all visitor instances
    // via this.context. Defaults to an empty null-prototype object.
    context) {
        if (context === void 0) { context = Object.create(null); }
        // If the schema declares any directives for public consumption, record
        // them here so that we can properly coerce arguments when/if we encounter
        // an occurrence of the directive while walking the schema below.
        var declaredDirectives = this.getDeclaredDirectives(schema, directiveVisitors);
        // Map from directive names to lists of SchemaDirectiveVisitor instances
        // created while visiting the schema.
        var createdVisitors = keyValMap(Object.keys(directiveVisitors), function (item) { return item; }, function () { return []; });
        var directiveVisitorMap = toObjMap(directiveVisitors);
        function visitorSelector(type, methodName) {
            var directiveNodes = type.astNode != null ? type.astNode.directives : [];
            var extensionASTNodes = type.extensionASTNodes;
            if (extensionASTNodes != null) {
                extensionASTNodes.forEach(function (extensionASTNode) {
                    directiveNodes = directiveNodes.concat(extensionASTNode.directives);
                });
            }
            var visitors = [];
            directiveNodes.forEach(function (directiveNode) {
                var directiveName = directiveNode.name.value;
                if (!(directiveName in directiveVisitorMap)) {
                    return;
                }
                var visitorClass = directiveVisitorMap[directiveName];
                // Avoid creating visitor objects if visitorClass does not override
                // the visitor method named by methodName.
                if (!visitorClass.implementsVisitorMethod(methodName)) {
                    return;
                }
                var decl = declaredDirectives[directiveName];
                var args;
                if (decl != null) {
                    // If this directive was explicitly declared, use the declared
                    // argument types (and any default values) to check, coerce, and/or
                    // supply default values for the given arguments.
                    args = getArgumentValues(decl, directiveNode);
                }
                else {
                    // If this directive was not explicitly declared, just convert the
                    // argument nodes to their corresponding JavaScript values.
                    args = Object.create(null);
                    if (directiveNode.arguments != null) {
                        directiveNode.arguments.forEach(function (arg) {
                            args[arg.name.value] = valueFromASTUntyped(arg.value);
                        });
                    }
                }
                // As foretold in comments near the top of the visitSchemaDirectives
                // method, this is where instances of the SchemaDirectiveVisitor class
                // get created and assigned names. While subclasses could override the
                // constructor method, the constructor is marked as protected, so
                // these are the only arguments that will ever be passed.
                visitors.push(new visitorClass({
                    name: directiveName,
                    args: args,
                    visitedType: type,
                    schema: schema,
                    context: context,
                }));
            });
            if (visitors.length > 0) {
                visitors.forEach(function (visitor) {
                    createdVisitors[visitor.name].push(visitor);
                });
            }
            return visitors;
        }
        visitSchema(schema, visitorSelector);
        return createdVisitors;
    };
    SchemaDirectiveVisitor.getDeclaredDirectives = function (schema, directiveVisitors) {
        var directiveVisitorMap = toObjMap(directiveVisitors);
        var declaredDirectives = keyMap(schema.getDirectives(), function (d) { return d.name; });
        // If the visitor subclass overrides getDirectiveDeclaration, and it
        // returns a non-null GraphQLDirective, use that instead of any directive
        // declared in the schema itself. Reasoning: if a SchemaDirectiveVisitor
        // goes to the trouble of implementing getDirectiveDeclaration, it should
        // be able to rely on that implementation.
        Object.entries(directiveVisitors).forEach(function (_a) {
            var directiveName = _a[0], visitorClass = _a[1];
            var decl = visitorClass.getDirectiveDeclaration(directiveName, schema);
            if (decl != null) {
                declaredDirectives[directiveName] = decl;
            }
        });
        Object.entries(declaredDirectives).forEach(function (_a) {
            var name = _a[0], decl = _a[1];
            if (!(name in directiveVisitorMap)) {
                // SchemaDirectiveVisitors.visitSchemaDirectives might be called
                // multiple times with partial directiveVisitors maps, so it's not
                // necessarily an error for directiveVisitors to be missing an
                // implementation of a directive that was declared in the schema.
                return;
            }
            var visitorClass = directiveVisitorMap[name];
            decl.locations.forEach(function (loc) {
                var visitorMethodName = directiveLocationToVisitorMethodName(loc);
                if (SchemaVisitor.implementsVisitorMethod(visitorMethodName) &&
                    !visitorClass.implementsVisitorMethod(visitorMethodName)) {
                    // While visitor subclasses may implement extra visitor methods,
                    // it's definitely a mistake if the GraphQLDirective declares itself
                    // applicable to certain schema locations, and the visitor subclass
                    // does not implement all the corresponding methods.
                    throw new Error("SchemaDirectiveVisitor for @" + name + " must implement " + visitorMethodName + " method");
                }
            });
        });
        return declaredDirectives;
    };
    return SchemaDirectiveVisitor;
}(SchemaVisitor));
// Convert a string like "FIELD_DEFINITION" to "visitFieldDefinition".
function directiveLocationToVisitorMethodName(loc) {
    return ('visit' +
        loc.replace(/([^_]*)_?/g, function (_wholeMatch, part) {
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        }));
}

function forEachField(schema, fn) {
    var typeMap = schema.getTypeMap();
    Object.keys(typeMap).forEach(function (typeName) {
        var type = typeMap[typeName];
        // TODO: maybe have an option to include these?
        if (!graphql.getNamedType(type).name.startsWith('__') && graphql.isObjectType(type)) {
            var fields_1 = type.getFields();
            Object.keys(fields_1).forEach(function (fieldName) {
                var field = fields_1[fieldName];
                fn(field, typeName, fieldName);
            });
        }
    });
}

function forEachDefaultValue(schema, fn) {
    var typeMap = schema.getTypeMap();
    Object.keys(typeMap).forEach(function (typeName) {
        var type = typeMap[typeName];
        if (!graphql.getNamedType(type).name.startsWith('__')) {
            if (graphql.isObjectType(type)) {
                var fields_1 = type.getFields();
                Object.keys(fields_1).forEach(function (fieldName) {
                    var field = fields_1[fieldName];
                    field.args.forEach(function (arg) {
                        arg.defaultValue = fn(arg.type, arg.defaultValue);
                    });
                });
            }
            else if (graphql.isInputObjectType(type)) {
                var fields_2 = type.getFields();
                Object.keys(fields_2).forEach(function (fieldName) {
                    var field = fields_2[fieldName];
                    field.defaultValue = fn(field.type, field.defaultValue);
                });
            }
        }
    });
}

function applySchemaTransforms(originalSchema, transforms) {
    return transforms.reduce(function (schema, transform) {
        return transform.transformSchema != null
            ? transform.transformSchema(cloneSchema(schema))
            : schema;
    }, originalSchema);
}
function applyRequestTransforms(originalRequest, transforms) {
    return transforms.reduce(function (request, transform) {
        return transform.transformRequest != null
            ? transform.transformRequest(request)
            : request;
    }, originalRequest);
}
function applyResultTransforms(originalResult, transforms) {
    return transforms.reduceRight(function (result, transform) {
        return transform.transformResult != null
            ? transform.transformResult(result)
            : result;
    }, originalResult);
}

function linkToFetcher(link) {
    return function (fetcherOperation) {
        return apolloLink.toPromise(apolloLink.execute(link, fetcherOperation));
    };
}

function observableToAsyncIterable(observable) {
    var _a;
    var pullQueue = [];
    var pushQueue = [];
    var listening = true;
    var pushValue = function (value) {
        if (pullQueue.length !== 0) {
            pullQueue.shift()({ value: value, done: false });
        }
        else {
            pushQueue.push({ value: value });
        }
    };
    var pushError = function (error) {
        if (pullQueue.length !== 0) {
            pullQueue.shift()({ value: { errors: [error] }, done: false });
        }
        else {
            pushQueue.push({ value: { errors: [error] } });
        }
    };
    var pullValue = function () {
        return new Promise(function (resolve) {
            if (pushQueue.length !== 0) {
                var element = pushQueue.shift();
                // either {value: {errors: [...]}} or {value: ...}
                resolve(tslib.__assign(tslib.__assign({}, element), { done: false }));
            }
            else {
                pullQueue.push(resolve);
            }
        });
    };
    var subscription = observable.subscribe({
        next: function (value) {
            pushValue(value);
        },
        error: function (err) {
            pushError(err);
        },
    });
    var emptyQueue = function () {
        if (listening) {
            listening = false;
            subscription.unsubscribe();
            pullQueue.forEach(function (resolve) { return resolve({ value: undefined, done: true }); });
            pullQueue.length = 0;
            pushQueue.length = 0;
        }
    };
    return _a = {
            next: function () {
                return listening ? pullValue() : this.return();
            },
            return: function () {
                emptyQueue();
                return Promise.resolve({ value: undefined, done: true });
            },
            throw: function (error) {
                emptyQueue();
                return Promise.reject(error);
            }
        },
        _a[iterall.$$asyncIterator] = function () {
            return this;
        },
        _a;
}

/**
 * Given an AsyncIterable and a callback function, return an AsyncIterator
 * which produces values mapped via calling the callback function.
 */
function mapAsyncIterator(iterator, callback, rejectCallback) {
    var _a;
    var $return;
    var abruptClose;
    if (typeof iterator.return === 'function') {
        $return = iterator.return;
        abruptClose = function (error) {
            var rethrow = function () { return Promise.reject(error); };
            return $return.call(iterator).then(rethrow, rethrow);
        };
    }
    function mapResult(result) {
        return result.done
            ? result
            : asyncMapValue(result.value, callback).then(iteratorResult, abruptClose);
    }
    var mapReject;
    if (rejectCallback) {
        // Capture rejectCallback to ensure it cannot be null.
        var reject_1 = rejectCallback;
        mapReject = function (error) {
            return asyncMapValue(error, reject_1).then(iteratorResult, abruptClose);
        };
    }
    return _a = {
            next: function () {
                return iterator.next().then(mapResult, mapReject);
            },
            return: function () {
                return $return
                    ? $return.call(iterator).then(mapResult, mapReject)
                    : Promise.resolve({ value: undefined, done: true });
            },
            throw: function (error) {
                if (typeof iterator.throw === 'function') {
                    return iterator.throw(error).then(mapResult, mapReject);
                }
                return Promise.reject(error).catch(abruptClose);
            }
        },
        _a[iterall.$$asyncIterator] = function () {
            return this;
        },
        _a;
}
function asyncMapValue(value, callback) {
    return new Promise(function (resolve) { return resolve(callback(value)); });
}
function iteratorResult(value) {
    return { value: value, done: false };
}

function getDelegatingOperation(parentType, schema) {
    if (parentType === schema.getMutationType()) {
        return 'mutation';
    }
    else if (parentType === schema.getSubscriptionType()) {
        return 'subscription';
    }
    return 'query';
}
function createRequestFromInfo(_a) {
    var info = _a.info, _b = _a.operation, operation = _b === void 0 ? getDelegatingOperation(info.parentType, info.schema) : _b, _c = _a.fieldName, fieldName = _c === void 0 ? info.fieldName : _c, selectionSet = _a.selectionSet, fieldNodes = _a.fieldNodes;
    return createRequest({
        sourceSchema: info.schema,
        sourceParentType: info.parentType,
        sourceFieldName: info.fieldName,
        fragments: info.fragments,
        variableDefinitions: info.operation.variableDefinitions,
        variableValues: info.variableValues,
        targetOperation: operation,
        targetFieldName: fieldName,
        selectionSet: selectionSet,
        fieldNodes: selectionSet != null
            ? undefined
            : fieldNodes != null
                ? fieldNodes
                : info.fieldNodes,
    });
}
function createRequest(_a) {
    var sourceSchema = _a.sourceSchema, sourceParentType = _a.sourceParentType, sourceFieldName = _a.sourceFieldName, fragments = _a.fragments, variableDefinitions = _a.variableDefinitions, variableValues = _a.variableValues, targetOperation = _a.targetOperation, targetFieldName = _a.targetFieldName, selectionSet = _a.selectionSet, fieldNodes = _a.fieldNodes;
    var argumentNodes;
    var newSelectionSet = selectionSet;
    if (!selectionSet && fieldNodes != null) {
        var selections = fieldNodes.reduce(function (acc, fieldNode) {
            return fieldNode.selectionSet != null
                ? acc.concat(fieldNode.selectionSet.selections)
                : acc;
        }, []);
        newSelectionSet = selections.length
            ? {
                kind: graphql.Kind.SELECTION_SET,
                selections: selections,
            }
            : undefined;
        argumentNodes = fieldNodes[0].arguments;
    }
    else {
        argumentNodes = [];
    }
    var newVariables = Object.create(null);
    var variableDefinitionMap = Object.create(null);
    variableDefinitions.forEach(function (def) {
        var varName = def.variable.name.value;
        variableDefinitionMap[varName] = def;
        var varType = graphql.typeFromAST(sourceSchema, def.type);
        newVariables[varName] = serializeInputValue(varType, variableValues[varName]);
    });
    var argumentNodeMap = keyMap(argumentNodes, function (arg) { return arg.name.value; });
    updateArgumentsWithDefaults(sourceParentType, sourceFieldName, argumentNodeMap, variableDefinitionMap, newVariables);
    var rootfieldNode = {
        kind: graphql.Kind.FIELD,
        alias: null,
        arguments: Object.keys(argumentNodeMap).map(function (argName) { return argumentNodeMap[argName]; }),
        selectionSet: newSelectionSet,
        name: {
            kind: graphql.Kind.NAME,
            value: targetFieldName || fieldNodes[0].name.value,
        },
    };
    var operationDefinition = {
        kind: graphql.Kind.OPERATION_DEFINITION,
        operation: targetOperation,
        variableDefinitions: Object.keys(variableDefinitionMap).map(function (varName) { return variableDefinitionMap[varName]; }),
        selectionSet: {
            kind: graphql.Kind.SELECTION_SET,
            selections: [rootfieldNode],
        },
    };
    var fragmentDefinitions = Object.keys(fragments).map(function (fragmentName) { return fragments[fragmentName]; });
    var document = {
        kind: graphql.Kind.DOCUMENT,
        definitions: tslib.__spreadArrays([operationDefinition], fragmentDefinitions),
    };
    return {
        document: document,
        variables: newVariables,
    };
}
function updateArgumentsWithDefaults(sourceParentType, sourceFieldName, argumentNodeMap, variableDefinitionMap, variableValues) {
    var sourceField = sourceParentType.getFields()[sourceFieldName];
    sourceField.args.forEach(function (argument) {
        var argName = argument.name;
        var sourceArgType = argument.type;
        if (argumentNodeMap[argName] === undefined) {
            var defaultValue = argument.defaultValue;
            if (defaultValue !== undefined) {
                updateArgument(argName, sourceArgType, argumentNodeMap, variableDefinitionMap, variableValues, serializeInputValue(sourceArgType, defaultValue));
            }
        }
    });
}

function delegateToSchema(options) {
    if (graphql.isSchema(options)) {
        throw new Error('Passing positional arguments to delegateToSchema is deprecated. ' +
            'Please pass named parameters instead.');
    }
    var info = options.info, _a = options.operation, operation = _a === void 0 ? getDelegatingOperation(info.parentType, info.schema) : _a, _b = options.fieldName, fieldName = _b === void 0 ? info.fieldName : _b, _c = options.returnType, returnType = _c === void 0 ? info.returnType : _c, selectionSet = options.selectionSet, fieldNodes = options.fieldNodes;
    var request = createRequestFromInfo({
        info: info,
        operation: operation,
        fieldName: fieldName,
        selectionSet: selectionSet,
        fieldNodes: fieldNodes,
    });
    return delegateRequest(tslib.__assign(tslib.__assign({}, options), { request: request,
        operation: operation,
        fieldName: fieldName,
        returnType: returnType }));
}
function buildDelegationTransforms(subschemaOrSubschemaConfig, info, context, targetSchema, fieldName, args, returnType, transforms, skipTypeMerging) {
    var delegationTransforms = [
        new CheckResultAndHandleErrors(info, fieldName, subschemaOrSubschemaConfig, context, returnType, skipTypeMerging),
    ];
    if (info.mergeInfo != null) {
        delegationTransforms.push(new AddReplacementSelectionSets(info.schema, info.mergeInfo.replacementSelectionSets), new AddMergedTypeFragments(info.schema, info.mergeInfo.mergedTypes));
    }
    delegationTransforms = delegationTransforms.concat(transforms);
    delegationTransforms.push(new ExpandAbstractTypes(info.schema, targetSchema));
    if (info.mergeInfo != null) {
        delegationTransforms.push(new AddReplacementFragments(targetSchema, info.mergeInfo.replacementFragments));
    }
    if (args != null) {
        delegationTransforms.push(new AddArgumentsAsVariables(targetSchema, args));
    }
    delegationTransforms.push(new FilterToSchema(targetSchema), new AddTypenameToAbstract(targetSchema));
    return delegationTransforms;
}
function delegateRequest(_a) {
    var request = _a.request, subschemaOrSubschemaConfig = _a.schema, rootValue = _a.rootValue, info = _a.info, _b = _a.operation, operation = _b === void 0 ? getDelegatingOperation(info.parentType, info.schema) : _b, _c = _a.fieldName, fieldName = _c === void 0 ? info.fieldName : _c, args = _a.args, _d = _a.returnType, returnType = _d === void 0 ? info.returnType : _d, context = _a.context, _e = _a.transforms, transforms = _e === void 0 ? [] : _e, skipValidation = _a.skipValidation, skipTypeMerging = _a.skipTypeMerging;
    var targetSchema;
    var targetRootValue;
    var requestTransforms = transforms.slice();
    var subschemaConfig;
    if (isSubschemaConfig(subschemaOrSubschemaConfig)) {
        subschemaConfig = subschemaOrSubschemaConfig;
        targetSchema = subschemaConfig.schema;
        targetRootValue =
            rootValue != null
                ? rootValue
                : subschemaConfig.rootValue != null
                    ? subschemaConfig.rootValue
                    : info.rootValue;
        if (subschemaConfig.transforms != null) {
            requestTransforms = requestTransforms.concat(subschemaConfig.transforms);
        }
    }
    else {
        targetSchema = subschemaOrSubschemaConfig;
        targetRootValue = rootValue != null ? rootValue : info.rootValue;
    }
    var delegationTransforms = buildDelegationTransforms(subschemaOrSubschemaConfig, info, context, targetSchema, fieldName, args, returnType, requestTransforms.reverse(), skipTypeMerging);
    var processedRequest = applyRequestTransforms(request, delegationTransforms);
    if (!skipValidation) {
        var errors = graphql.validate(targetSchema, processedRequest.document);
        if (errors.length > 0) {
            var combinedError = combineErrors(errors);
            throw combinedError;
        }
    }
    if (operation === 'query' || operation === 'mutation') {
        var executor = createExecutor(targetSchema, targetRootValue, context, subschemaConfig);
        var executionResult = executor({
            document: processedRequest.document,
            context: context,
            variables: processedRequest.variables,
        });
        if (executionResult instanceof Promise) {
            return executionResult.then(function (originalResult) {
                return applyResultTransforms(originalResult, delegationTransforms);
            });
        }
        return applyResultTransforms(executionResult, delegationTransforms);
    }
    var subscriber = createSubscriber(targetSchema, targetRootValue, context, subschemaConfig);
    return subscriber({
        document: processedRequest.document,
        context: context,
        variables: processedRequest.variables,
    }).then(function (subscriptionResult) {
        if (iterall.isAsyncIterable(subscriptionResult)) {
            // "subscribe" to the subscription result and map the result through the transforms
            return mapAsyncIterator(subscriptionResult, function (result) {
                var _a;
                var transformedResult = applyResultTransforms(result, delegationTransforms);
                // wrap with fieldName to return for an additional round of resolutioon
                // with payload as rootValue
                return _a = {},
                    _a[info.fieldName] = transformedResult,
                    _a;
            });
        }
        return applyResultTransforms(subscriptionResult, delegationTransforms);
    });
}
function createExecutor(schema, rootValue, context, subschemaConfig) {
    var fetcher;
    var targetRootValue = rootValue;
    if (subschemaConfig != null) {
        if (subschemaConfig.dispatcher != null) {
            var dynamicLinkOrFetcher = subschemaConfig.dispatcher(context);
            fetcher =
                typeof dynamicLinkOrFetcher === 'function'
                    ? dynamicLinkOrFetcher
                    : linkToFetcher(dynamicLinkOrFetcher);
        }
        else if (subschemaConfig.link != null) {
            fetcher = linkToFetcher(subschemaConfig.link);
        }
        else if (subschemaConfig.fetcher != null) {
            fetcher = subschemaConfig.fetcher;
        }
        if (!fetcher && !rootValue && subschemaConfig.rootValue != null) {
            targetRootValue = subschemaConfig.rootValue;
        }
    }
    if (fetcher != null) {
        return function (_a) {
            var document = _a.document, graphqlContext = _a.context, variables = _a.variables;
            return fetcher({
                query: document,
                variables: variables,
                context: { graphqlContext: graphqlContext },
            });
        };
    }
    return function (_a) {
        var document = _a.document, graphqlContext = _a.context, variables = _a.variables;
        return graphql.execute({
            schema: schema,
            document: document,
            rootValue: targetRootValue,
            contextValue: graphqlContext,
            variableValues: variables,
        });
    };
}
function createSubscriber(schema, rootValue, context, subschemaConfig) {
    var link;
    var targetRootValue = rootValue;
    if (subschemaConfig != null) {
        if (subschemaConfig.dispatcher != null) {
            link = subschemaConfig.dispatcher(context);
        }
        else if (subschemaConfig.link != null) {
            link = subschemaConfig.link;
        }
        if (!link && !rootValue && subschemaConfig.rootValue != null) {
            targetRootValue = subschemaConfig.rootValue;
        }
    }
    if (link != null) {
        return function (_a) {
            var document = _a.document, graphqlContext = _a.context, variables = _a.variables;
            var operation = {
                query: document,
                variables: variables,
                context: { graphqlContext: graphqlContext },
            };
            var observable = apolloLink.execute(link, operation);
            return Promise.resolve(observableToAsyncIterable(observable));
        };
    }
    return function (_a) {
        var document = _a.document, graphqlContext = _a.context, variables = _a.variables;
        return graphql.subscribe({
            schema: schema,
            document: document,
            rootValue: targetRootValue,
            contextValue: graphqlContext,
            variableValues: variables,
        });
    };
}

// @schemaDefinition: A GraphQL type schema in shorthand
// @resolvers: Definitions for resolvers to be merged with schema
var SchemaError = /** @class */ (function (_super) {
    tslib.__extends(SchemaError, _super);
    function SchemaError(message) {
        var _this = _super.call(this, message) || this;
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        return _this;
    }
    return SchemaError;
}(Error));

// If we have any union or interface types throw if no there is no resolveType or isTypeOf resolvers
function checkForResolveTypeResolver(schema, requireResolversForResolveType) {
    Object.keys(schema.getTypeMap())
        .map(function (typeName) { return schema.getType(typeName); })
        .forEach(function (type) {
        if (!graphql.isAbstractType(type)) {
            return;
        }
        if (!type.resolveType) {
            if (!requireResolversForResolveType) {
                return;
            }
            throw new SchemaError("Type \"" + type.name + "\" is missing a \"__resolveType\" resolver. Pass false into " +
                '"resolverValidationOptions.requireResolversForResolveType" to disable this error.');
        }
    });
}

function extendResolversFromInterfaces(schema, resolvers) {
    var typeNames = Object.keys(tslib.__assign(tslib.__assign({}, schema.getTypeMap()), resolvers));
    var extendedResolvers = {};
    typeNames.forEach(function (typeName) {
        var typeResolvers = resolvers[typeName];
        var type = schema.getType(typeName);
        if (graphql.isObjectType(type) ||
            (graphqlVersion() >= 15 && graphql.isInterfaceType(type))) {
            var interfaceResolvers = type
                .getInterfaces()
                .map(function (iFace) { return resolvers[iFace.name]; });
            extendedResolvers[typeName] = Object.assign.apply(Object, tslib.__spreadArrays([{}], interfaceResolvers, [typeResolvers]));
        }
        else if (typeResolvers != null) {
            extendedResolvers[typeName] = typeResolvers;
        }
    });
    return extendedResolvers;
}

function addResolversToSchema(schemaOrOptions, legacyInputResolvers, legacyInputValidationOptions) {
    var options = graphql.isSchema(schemaOrOptions)
        ? {
            schema: schemaOrOptions,
            resolvers: legacyInputResolvers,
            resolverValidationOptions: legacyInputValidationOptions,
        }
        : schemaOrOptions;
    var schema = options.schema, inputResolvers = options.resolvers, defaultFieldResolver = options.defaultFieldResolver, _a = options.resolverValidationOptions, resolverValidationOptions = _a === void 0 ? {} : _a, _b = options.inheritResolversFromInterfaces, inheritResolversFromInterfaces = _b === void 0 ? false : _b;
    var _c = resolverValidationOptions.allowResolversNotInSchema, allowResolversNotInSchema = _c === void 0 ? false : _c, requireResolversForResolveType = resolverValidationOptions.requireResolversForResolveType;
    var resolvers = inheritResolversFromInterfaces
        ? extendResolversFromInterfaces(schema, inputResolvers)
        : inputResolvers;
    var typeMap = schema.getTypeMap();
    Object.keys(resolvers).forEach(function (typeName) {
        var resolverValue = resolvers[typeName];
        var resolverType = typeof resolverValue;
        if (resolverType !== 'object' && resolverType !== 'function') {
            throw new SchemaError("\"" + typeName + "\" defined in resolvers, but has invalid value \"" + resolverValue + "\". A resolver's value must be of type object or function.");
        }
        var type = schema.getType(typeName);
        if (!type && typeName !== '__schema') {
            if (allowResolversNotInSchema) {
                return;
            }
            throw new SchemaError("\"" + typeName + "\" defined in resolvers, but not in schema");
        }
        if (graphql.isScalarType(type)) {
            // Support -- without recommending -- overriding default scalar types
            Object.keys(resolverValue).forEach(function (fieldName) {
                if (fieldName.startsWith('__')) {
                    type[fieldName.substring(2)] = resolverValue[fieldName];
                }
                else {
                    type[fieldName] = resolverValue[fieldName];
                }
            });
        }
        else if (graphql.isEnumType(type)) {
            // We've encountered an enum resolver that is being used to provide an
            // internal enum value.
            // Reference: https://www.apollographql.com/docs/graphql-tools/scalars.html#internal-values
            Object.keys(resolverValue).forEach(function (fieldName) {
                if (!type.getValue(fieldName)) {
                    if (allowResolversNotInSchema) {
                        return;
                    }
                    throw new SchemaError(typeName + "." + fieldName + " was defined in resolvers, but enum is not in schema");
                }
            });
            var config = toConfig(type);
            var values = type.getValues();
            var newValues = keyValMap(values, function (value) { return value.name; }, function (value) {
                var newValue = Object.keys(resolverValue).includes(value.name)
                    ? resolverValue[value.name]
                    : value.name;
                return {
                    value: newValue,
                    deprecationReason: value.deprecationReason,
                    description: value.description,
                    astNode: value.astNode,
                };
            });
            // healSchema called later to update all fields to new type
            typeMap[typeName] = new graphql.GraphQLEnumType(tslib.__assign(tslib.__assign({}, config), { values: newValues }));
        }
        else if (graphql.isUnionType(type)) {
            Object.keys(resolverValue).forEach(function (fieldName) {
                if (fieldName.startsWith('__')) {
                    // this is for isTypeOf and resolveType and all the other stuff.
                    type[fieldName.substring(2)] = resolverValue[fieldName];
                    return;
                }
                if (allowResolversNotInSchema) {
                    return;
                }
                throw new SchemaError(typeName + " was defined in resolvers, but it's not an object");
            });
        }
        else if (graphql.isObjectType(type) || graphql.isInterfaceType(type)) {
            Object.keys(resolverValue).forEach(function (fieldName) {
                if (fieldName.startsWith('__')) {
                    // this is for isTypeOf and resolveType and all the other stuff.
                    type[fieldName.substring(2)] = resolverValue[fieldName];
                    return;
                }
                var fields = type.getFields();
                var field = fields[fieldName];
                if (field == null) {
                    if (allowResolversNotInSchema) {
                        return;
                    }
                    throw new SchemaError(typeName + "." + fieldName + " defined in resolvers, but not in schema");
                }
                var fieldResolve = resolverValue[fieldName];
                if (typeof fieldResolve === 'function') {
                    // for convenience. Allows shorter syntax in resolver definition file
                    field.resolve = fieldResolve;
                }
                else {
                    if (typeof fieldResolve !== 'object') {
                        throw new SchemaError("Resolver " + typeName + "." + fieldName + " must be object or function");
                    }
                    setFieldProperties(field, fieldResolve);
                }
            });
        }
    });
    checkForResolveTypeResolver(schema, requireResolversForResolveType);
    // serialize all default values prior to healing fields with new scalar/enum types.
    forEachDefaultValue(schema, serializeInputValue);
    // schema may have new scalar/enum types that require healing
    healSchema(schema);
    // reparse all default values with new parsing functions.
    forEachDefaultValue(schema, parseInputValue);
    if (defaultFieldResolver != null) {
        forEachField(schema, function (field) {
            if (!field.resolve) {
                field.resolve = defaultFieldResolver;
            }
        });
    }
    return schema;
}
function setFieldProperties(field, propertiesObj) {
    Object.keys(propertiesObj).forEach(function (propertyName) {
        field[propertyName] = propertiesObj[propertyName];
    });
}

// wraps all resolvers of query, mutation or subscription fields
// with the provided function to simulate a root schema level resolver
function addSchemaLevelResolver(schema, fn) {
    // TODO test that schema is a schema, fn is a function
    var rootTypes = [
        schema.getQueryType(),
        schema.getMutationType(),
        schema.getSubscriptionType(),
    ].filter(function (x) { return Boolean(x); });
    rootTypes.forEach(function (type) {
        if (type != null) {
            // XXX this should run at most once per request to simulate a true root resolver
            // for graphql-js this is an approximation that works with queries but not mutations
            var rootResolveFn_1 = runAtMostOncePerRequest(fn);
            var fields_1 = type.getFields();
            Object.keys(fields_1).forEach(function (fieldName) {
                // XXX if the type is a subscription, a same query AST will be ran multiple times so we
                // deactivate here the runOnce if it's a subscription. This may not be optimal though...
                if (type === schema.getSubscriptionType()) {
                    fields_1[fieldName].resolve = wrapResolver(fields_1[fieldName].resolve, fn);
                }
                else {
                    fields_1[fieldName].resolve = wrapResolver(fields_1[fieldName].resolve, rootResolveFn_1);
                }
            });
        }
    });
}
// XXX badly named function. this doesn't really wrap, it just chains resolvers...
function wrapResolver(innerResolver, outerResolver) {
    return function (obj, args, ctx, info) {
        return Promise.resolve(outerResolver(obj, args, ctx, info)).then(function (root) {
            if (innerResolver != null) {
                return innerResolver(root, args, ctx, info);
            }
            return graphql.defaultFieldResolver(root, args, ctx, info);
        });
    };
}
// XXX this function only works for resolvers
// XXX very hacky way to remember if the function
// already ran for this request. This will only work
// if people don't actually cache the operation.
// if they do cache the operation, they will have to
// manually remove the __runAtMostOnce before every request.
function runAtMostOncePerRequest(fn) {
    var value;
    var randomNumber = Math.random();
    return function (root, args, ctx, info) {
        if (!info.operation['__runAtMostOnce']) {
            info.operation['__runAtMostOnce'] = {};
        }
        if (!info.operation['__runAtMostOnce'][randomNumber]) {
            info.operation['__runAtMostOnce'][randomNumber] = true;
            value = fn(root, args, ctx, info);
        }
        return value;
    };
}

function assertResolversPresent(schema, resolverValidationOptions) {
    if (resolverValidationOptions === void 0) { resolverValidationOptions = {}; }
    var _a = resolverValidationOptions.requireResolversForArgs, requireResolversForArgs = _a === void 0 ? false : _a, _b = resolverValidationOptions.requireResolversForNonScalar, requireResolversForNonScalar = _b === void 0 ? false : _b, _c = resolverValidationOptions.requireResolversForAllFields, requireResolversForAllFields = _c === void 0 ? false : _c;
    if (requireResolversForAllFields &&
        (requireResolversForArgs || requireResolversForNonScalar)) {
        throw new TypeError('requireResolversForAllFields takes precedence over the more specific assertions. ' +
            'Please configure either requireResolversForAllFields or requireResolversForArgs / ' +
            'requireResolversForNonScalar, but not a combination of them.');
    }
    forEachField(schema, function (field, typeName, fieldName) {
        // requires a resolver for *every* field.
        if (requireResolversForAllFields) {
            expectResolver(field, typeName, fieldName);
        }
        // requires a resolver on every field that has arguments
        if (requireResolversForArgs && field.args.length > 0) {
            expectResolver(field, typeName, fieldName);
        }
        // requires a resolver on every field that returns a non-scalar type
        if (requireResolversForNonScalar &&
            !graphql.isScalarType(graphql.getNamedType(field.type))) {
            expectResolver(field, typeName, fieldName);
        }
    });
}
function expectResolver(field, typeName, fieldName) {
    if (!field.resolve) {
        // eslint-disable-next-line no-console
        console.warn("Resolver missing for \"" + typeName + "." + fieldName + "\". To disable this warning check https://github.com/apollostack/graphql-tools/issues/131");
        return;
    }
    if (typeof field.resolve !== 'function') {
        throw new SchemaError("Resolver \"" + typeName + "." + fieldName + "\" must be a function");
    }
}

function attachDirectiveResolvers(schema, directiveResolvers) {
    if (typeof directiveResolvers !== 'object') {
        throw new Error("Expected directiveResolvers to be of type object, got " + typeof directiveResolvers);
    }
    if (Array.isArray(directiveResolvers)) {
        throw new Error('Expected directiveResolvers to be of type object, got Array');
    }
    var schemaDirectives = Object.create(null);
    Object.keys(directiveResolvers).forEach(function (directiveName) {
        schemaDirectives[directiveName] = /** @class */ (function (_super) {
            tslib.__extends(class_1, _super);
            function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            class_1.prototype.visitFieldDefinition = function (field) {
                var resolver = directiveResolvers[directiveName];
                var originalResolver = field.resolve != null ? field.resolve : graphql.defaultFieldResolver;
                var directiveArgs = this.args;
                field.resolve = function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i] = arguments[_i];
                    }
                    var source = args[0] /* original args */, context = args[2], info = args[3];
                    return resolver(function () {
                        return new Promise(function (resolve, reject) {
                            var result = originalResolver.apply(field, args);
                            if (result instanceof Error) {
                                reject(result);
                            }
                            resolve(result);
                        });
                    }, source, directiveArgs, context, info);
                };
            };
            return class_1;
        }(SchemaDirectiveVisitor));
    });
    SchemaDirectiveVisitor.visitSchemaDirectives(schema, schemaDirectives);
}

// takes a GraphQL-JS schema and an object of connectors, then attaches
// the connectors to the context by wrapping each query or mutation resolve
// function with a function that attaches connectors if they don't exist.
// attaches connectors only once to make sure they are singletons
var attachConnectorsToContext = deprecatedDecorator.deprecated({
    version: '0.7.0',
    url: 'https://github.com/apollostack/graphql-tools/issues/140',
}, function (schema, connectors) {
    if (!schema || !graphql.isSchema(schema)) {
        throw new Error('schema must be an instance of GraphQLSchema. ' +
            'This error could be caused by installing more than one version of GraphQL-JS');
    }
    if (typeof connectors !== 'object') {
        var connectorType = typeof connectors;
        throw new Error("Expected connectors to be of type object, got " + connectorType);
    }
    if (Object.keys(connectors).length === 0) {
        throw new Error('Expected connectors to not be an empty object');
    }
    if (Array.isArray(connectors)) {
        throw new Error('Expected connectors to be of type object, got Array');
    }
    if (schema['_apolloConnectorsAttached']) {
        throw new Error('Connectors already attached to context, cannot attach more than once');
    }
    schema['_apolloConnectorsAttached'] = true;
    var attachconnectorFn = function (root, _args, ctx) {
        if (typeof ctx !== 'object') {
            // if in any way possible, we should throw an error when the attachconnectors
            // function is called, not when a query is executed.
            var contextType = typeof ctx;
            throw new Error("Cannot attach connector because context is not an object: " + contextType);
        }
        if (typeof ctx.connectors === 'undefined') {
            ctx.connectors = {};
        }
        Object.keys(connectors).forEach(function (connectorName) {
            var connector = connectors[connectorName];
            if (connector.prototype != null) {
                ctx.connectors[connectorName] = new connector(ctx);
            }
            else {
                throw new Error('Connector must be a function or an class');
            }
        });
        return root;
    };
    addSchemaLevelResolver(schema, attachconnectorFn);
});

function extractExtensionDefinitions(ast) {
    var extensionDefs = ast.definitions.filter(function (def) {
        return def.kind === graphql.Kind.OBJECT_TYPE_EXTENSION ||
            (graphqlVersion() >= 13 && def.kind === graphql.Kind.INTERFACE_TYPE_EXTENSION) ||
            def.kind === graphql.Kind.INPUT_OBJECT_TYPE_EXTENSION ||
            def.kind === graphql.Kind.UNION_TYPE_EXTENSION ||
            def.kind === graphql.Kind.ENUM_TYPE_EXTENSION ||
            def.kind === graphql.Kind.SCALAR_TYPE_EXTENSION ||
            def.kind === graphql.Kind.SCHEMA_EXTENSION;
    });
    return tslib.__assign(tslib.__assign({}, ast), { definitions: extensionDefs });
}
function filterExtensionDefinitions(ast) {
    var extensionDefs = ast.definitions.filter(function (def) {
        return def.kind !== graphql.Kind.OBJECT_TYPE_EXTENSION &&
            def.kind !== graphql.Kind.INTERFACE_TYPE_EXTENSION &&
            def.kind !== graphql.Kind.INPUT_OBJECT_TYPE_EXTENSION &&
            def.kind !== graphql.Kind.UNION_TYPE_EXTENSION &&
            def.kind !== graphql.Kind.ENUM_TYPE_EXTENSION &&
            def.kind !== graphql.Kind.SCALAR_TYPE_EXTENSION &&
            def.kind !== graphql.Kind.SCHEMA_EXTENSION;
    });
    return tslib.__assign(tslib.__assign({}, ast), { definitions: extensionDefs });
}

function concatenateTypeDefs(typeDefinitionsAry, calledFunctionRefs) {
    if (calledFunctionRefs === void 0) { calledFunctionRefs = []; }
    var resolvedTypeDefinitions = [];
    typeDefinitionsAry.forEach(function (typeDef) {
        if (typeof typeDef === 'function') {
            if (calledFunctionRefs.indexOf(typeDef) === -1) {
                calledFunctionRefs.push(typeDef);
                resolvedTypeDefinitions = resolvedTypeDefinitions.concat(concatenateTypeDefs(typeDef(), calledFunctionRefs));
            }
        }
        else if (typeof typeDef === 'string') {
            resolvedTypeDefinitions.push(typeDef.trim());
        }
        else if (typeDef.kind !== undefined) {
            resolvedTypeDefinitions.push(graphql.print(typeDef).trim());
        }
        else {
            var type = typeof typeDef;
            throw new SchemaError("typeDef array must contain only strings and functions, got " + type);
        }
    });
    return uniq(resolvedTypeDefinitions.map(function (x) { return x.trim(); })).join('\n');
}
function uniq(array) {
    return array.reduce(function (accumulator, currentValue) {
        return accumulator.indexOf(currentValue) === -1
            ? tslib.__spreadArrays(accumulator, [currentValue]) : accumulator;
    }, []);
}

function buildSchemaFromTypeDefinitions(typeDefinitions, parseOptions) {
    // TODO: accept only array here, otherwise interfaces get confusing.
    var myDefinitions = typeDefinitions;
    var astDocument;
    if (isDocumentNode(typeDefinitions)) {
        astDocument = typeDefinitions;
    }
    else if (typeof myDefinitions !== 'string') {
        if (!Array.isArray(myDefinitions)) {
            var type = typeof myDefinitions;
            throw new SchemaError("typeDefs must be a string, array or schema AST, got " + type);
        }
        myDefinitions = concatenateTypeDefs(myDefinitions);
    }
    if (typeof myDefinitions === 'string') {
        astDocument = graphql.parse(myDefinitions, parseOptions);
    }
    var typesAst = filterExtensionDefinitions(astDocument);
    var backcompatOptions = { commentDescriptions: true };
    var schema = graphql.buildASTSchema(typesAst, backcompatOptions);
    var extensionsAst = extractExtensionDefinitions(astDocument);
    if (extensionsAst.definitions.length > 0) {
        schema = graphql.extendSchema(schema, extensionsAst, backcompatOptions);
    }
    return schema;
}
function isDocumentNode(typeDefinitions) {
    return typeDefinitions.kind !== undefined;
}

function chainResolvers(resolvers) {
    return function (root, args, ctx, info) {
        return resolvers.reduce(function (prev, curResolver) {
            if (curResolver != null) {
                return curResolver(prev, args, ctx, info);
            }
            return graphql.defaultFieldResolver(prev, args, ctx, info);
        }, root);
    };
}

/*
 * fn: The function to decorate with the logger
 * logger: an object instance of type Logger
 * hint: an optional hint to add to the error's message
 */
function decorateWithLogger(fn, logger, hint) {
    var resolver = fn != null ? fn : graphql.defaultFieldResolver;
    var logError = function (e) {
        // TODO: clone the error properly
        var newE = new Error();
        newE.stack = e.stack;
        /* istanbul ignore else: always get the hint from addErrorLoggingToSchema */
        if (hint) {
            newE['originalMessage'] = e.message;
            newE['message'] = "Error in resolver " + hint + "\n" + e.message;
        }
        logger.log(newE);
    };
    return function (root, args, ctx, info) {
        try {
            var result = resolver(root, args, ctx, info);
            // If the resolver returns a Promise log any Promise rejects.
            if (result &&
                typeof result.then === 'function' &&
                typeof result.catch === 'function') {
                result.catch(function (reason) {
                    // make sure that it's an error we're logging.
                    var error = reason instanceof Error ? reason : new Error(reason);
                    logError(error);
                    // We don't want to leave an unhandled exception so pass on error.
                    return reason;
                });
            }
            return result;
        }
        catch (e) {
            logError(e);
            // we want to pass on the error, just in case.
            throw e;
        }
    };
}

function makeExecutableSchema(_a) {
    var typeDefs = _a.typeDefs, _b = _a.resolvers, resolvers = _b === void 0 ? {} : _b, connectors = _a.connectors, logger = _a.logger, _c = _a.allowUndefinedInResolve, allowUndefinedInResolve = _c === void 0 ? true : _c, _d = _a.resolverValidationOptions, resolverValidationOptions = _d === void 0 ? {} : _d, directiveResolvers = _a.directiveResolvers, schemaDirectives = _a.schemaDirectives, _e = _a.parseOptions, parseOptions = _e === void 0 ? {} : _e, _f = _a.inheritResolversFromInterfaces, inheritResolversFromInterfaces = _f === void 0 ? false : _f;
    // Validate and clean up arguments
    if (typeof resolverValidationOptions !== 'object') {
        throw new SchemaError('Expected `resolverValidationOptions` to be an object');
    }
    if (!typeDefs) {
        throw new SchemaError('Must provide typeDefs');
    }
    // We allow passing in an array of resolver maps, in which case we merge them
    var resolverMap = Array.isArray(resolvers)
        ? resolvers
            .filter(function (resolverObj) { return typeof resolverObj === 'object'; })
            .reduce(mergeDeep, {})
        : resolvers;
    // Arguments are now validated and cleaned up
    var schema = buildSchemaFromTypeDefinitions(typeDefs, parseOptions);
    addResolversToSchema({
        schema: schema,
        resolvers: resolverMap,
        resolverValidationOptions: resolverValidationOptions,
        inheritResolversFromInterfaces: inheritResolversFromInterfaces,
    });
    assertResolversPresent(schema, resolverValidationOptions);
    if (!allowUndefinedInResolve) {
        addCatchUndefinedToSchema(schema);
    }
    if (logger != null) {
        addErrorLoggingToSchema(schema, logger);
    }
    if (typeof resolvers['__schema'] === 'function') {
        // TODO a bit of a hack now, better rewrite generateSchema to attach it there.
        // not doing that now, because I'd have to rewrite a lot of tests.
        addSchemaLevelResolver(schema, resolvers['__schema']);
    }
    if (connectors != null) {
        // connectors are optional, at least for now. That means you can just import them in the resolve
        // function if you want.
        attachConnectorsToContext(schema, connectors);
    }
    if (directiveResolvers != null) {
        attachDirectiveResolvers(schema, directiveResolvers);
    }
    if (schemaDirectives != null) {
        SchemaDirectiveVisitor.visitSchemaDirectives(schema, schemaDirectives);
    }
    return schema;
}
function decorateToCatchUndefined(fn, hint) {
    var resolve = fn == null ? graphql.defaultFieldResolver : fn;
    return function (root, args, ctx, info) {
        var result = resolve(root, args, ctx, info);
        if (typeof result === 'undefined') {
            throw new Error("Resolver for \"" + hint + "\" returned undefined");
        }
        return result;
    };
}
function addCatchUndefinedToSchema(schema) {
    forEachField(schema, function (field, typeName, fieldName) {
        var errorHint = typeName + "." + fieldName;
        field.resolve = decorateToCatchUndefined(field.resolve, errorHint);
    });
}
function addErrorLoggingToSchema(schema, logger) {
    if (!logger) {
        throw new Error('Must provide a logger');
    }
    if (typeof logger.log !== 'function') {
        throw new Error('Logger.log must be a function');
    }
    forEachField(schema, function (field, typeName, fieldName) {
        var errorHint = typeName + "." + fieldName;
        field.resolve = decorateWithLogger(field.resolve, logger, errorHint);
    });
}

// These functions are preserved for backwards compatibility.
// They are not simply rexported with new (old) names so as to allow
// typedoc to annotate them.
function addResolveFunctionsToSchema(schemaOrOptions, legacyInputResolvers, legacyInputValidationOptions) {
    return addResolversToSchema(schemaOrOptions, legacyInputResolvers, legacyInputValidationOptions);
}
function addSchemaLevelResolveFunction(schema, fn) {
    addSchemaLevelResolver(schema, fn);
}
function assertResolveFunctionsPresent(schema, resolverValidationOptions) {
    if (resolverValidationOptions === void 0) { resolverValidationOptions = {}; }
    assertResolversPresent(schema, resolverValidationOptions);
}

function getFinalPromise(object) {
    return Promise.resolve(object).then(function (resolvedObject) {
        if (resolvedObject == null) {
            return resolvedObject;
        }
        if (Array.isArray(resolvedObject)) {
            return Promise.all(resolvedObject.map(function (o) { return getFinalPromise(o); }));
        }
        else if (typeof resolvedObject === 'object') {
            var keys_1 = Object.keys(resolvedObject);
            return Promise.all(keys_1.map(function (key) { return getFinalPromise(resolvedObject[key]); })).then(function (awaitedValues) {
                for (var i = 0; i < keys_1.length; i++) {
                    resolvedObject[keys_1[i]] = awaitedValues[i];
                }
                return resolvedObject;
            });
        }
        return resolvedObject;
    });
}
var AwaitVariablesLink = /** @class */ (function (_super) {
    tslib.__extends(AwaitVariablesLink, _super);
    function AwaitVariablesLink() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    AwaitVariablesLink.prototype.request = function (operation, forward) {
        return new apolloLink.Observable(function (observer) {
            var subscription;
            getFinalPromise(operation.variables)
                .then(function (resolvedVariables) {
                operation.variables = resolvedVariables;
                subscription = forward(operation).subscribe({
                    next: observer.next.bind(observer),
                    error: observer.error.bind(observer),
                    complete: observer.complete.bind(observer),
                });
            })
                .catch(observer.error.bind(observer));
            return function () {
                if (subscription != null) {
                    subscription.unsubscribe();
                }
            };
        });
    };
    return AwaitVariablesLink;
}(apolloLink.ApolloLink));

/* eslint-disable import/no-nodejs-modules */
var FormDataWithStreamSupport = /** @class */ (function (_super) {
    tslib.__extends(FormDataWithStreamSupport, _super);
    function FormDataWithStreamSupport(options) {
        var _this = _super.call(this, options) || this;
        _this.hasUnknowableLength = false;
        return _this;
    }
    FormDataWithStreamSupport.prototype.append = function (key, value, optionsOrFilename) {
        if (optionsOrFilename === void 0) { optionsOrFilename = {}; }
        // allow filename as single option
        var options = typeof optionsOrFilename === 'string'
            ? { filename: optionsOrFilename }
            : optionsOrFilename;
        // empty or either doesn't have path or not an http response
        if (!options.knownLength &&
            !Buffer.isBuffer(value) &&
            typeof value !== 'string' &&
            !value.path &&
            !(value.readable && hasOwnProperty(value, 'httpVersion'))) {
            this.hasUnknowableLength = true;
        }
        _super.prototype.append.call(this, key, value, options);
    };
    FormDataWithStreamSupport.prototype.getLength = function (callback) {
        if (this.hasUnknowableLength) {
            return null;
        }
        return _super.prototype.getLength.call(this, callback);
    };
    FormDataWithStreamSupport.prototype.getLengthSync = function () {
        if (this.hasUnknowableLength) {
            return null;
        }
        // eslint-disable-next-line no-sync
        return _super.prototype.getLengthSync.call(this);
    };
    return FormDataWithStreamSupport;
}(FormData));
var createServerHttpLink = function (options) {
    return apolloLink.concat(new AwaitVariablesLink(), apolloUploadClient.createUploadLink(tslib.__assign(tslib.__assign({}, options), { fetch: fetch, FormData: FormDataWithStreamSupport, isExtractableFile: function (value) {
            return apolloUploadClient.isExtractableFile(value) || (value === null || value === void 0 ? void 0 : value.createReadStream);
        }, formDataAppendFile: function (form, index, file) {
            if (file.createReadStream != null) {
                form.append(index, file.createReadStream(), {
                    filename: file.filename,
                    contentType: file.mimetype,
                });
            }
            else {
                apolloUploadClient.formDataAppendFile(form, index, file);
            }
        } })));
};

/**
 * This function wraps addMocksToSchema for more convenience
 */
function mockServer(schema, mocks, preserveResolvers) {
    if (preserveResolvers === void 0) { preserveResolvers = false; }
    var mySchema;
    if (!graphql.isSchema(schema)) {
        // TODO: provide useful error messages here if this fails
        mySchema = buildSchemaFromTypeDefinitions(schema);
    }
    else {
        mySchema = schema;
    }
    addMocksToSchema({ schema: mySchema, mocks: mocks, preserveResolvers: preserveResolvers });
    return { query: function (query, vars) { return graphql.graphql(mySchema, query, {}, {}, vars); } };
}
var defaultMockMap = new Map();
defaultMockMap.set('Int', function () { return Math.round(Math.random() * 200) - 100; });
defaultMockMap.set('Float', function () { return Math.random() * 200 - 100; });
defaultMockMap.set('String', function () { return 'Hello World'; });
defaultMockMap.set('Boolean', function () { return Math.random() > 0.5; });
defaultMockMap.set('ID', function () { return uuid.v4(); });
// TODO allow providing a seed such that lengths of list could be deterministic
// this could be done by using casual to get a random list length if the casual
// object is global.
function addMocksToSchema(_a) {
    var schema = _a.schema, _b = _a.mocks, mocks = _b === void 0 ? {} : _b, _c = _a.preserveResolvers, preserveResolvers = _c === void 0 ? false : _c;
    if (!schema) {
        throw new Error('Must provide schema to mock');
    }
    if (!graphql.isSchema(schema)) {
        throw new Error('Value at "schema" must be of type GraphQLSchema');
    }
    if (!isObject$1(mocks)) {
        throw new Error('mocks must be of type Object');
    }
    // use Map internally, because that API is nicer.
    var mockFunctionMap = new Map();
    Object.keys(mocks).forEach(function (typeName) {
        mockFunctionMap.set(typeName, mocks[typeName]);
    });
    mockFunctionMap.forEach(function (mockFunction, mockTypeName) {
        if (typeof mockFunction !== 'function') {
            throw new Error("mockFunctionMap[" + mockTypeName + "] must be a function");
        }
    });
    var mockType = function (type, _typeName, fieldName) {
        // order of precendence for mocking:
        // 1. if the object passed in already has fieldName, just use that
        // --> if it's a function, that becomes your resolver
        // --> if it's a value, the mock resolver will return that
        // 2. if the nullableType is a list, recurse
        // 2. if there's a mock defined for this typeName, that will be used
        // 3. if there's no mock defined, use the default mocks for this type
        return function (root, args, context, info) {
            // nullability doesn't matter for the purpose of mocking.
            var fieldType = graphql.getNullableType(type);
            var namedFieldType = graphql.getNamedType(fieldType);
            if (fieldName && root && typeof root[fieldName] !== 'undefined') {
                var result = void 0;
                // if we're here, the field is already defined
                if (typeof root[fieldName] === 'function') {
                    result = root[fieldName](root, args, context, info);
                    if (result instanceof MockList) {
                        result = result.mock(root, args, context, info, fieldType, mockType);
                    }
                }
                else {
                    result = root[fieldName];
                }
                // Now we merge the result with the default mock for this type.
                // This allows overriding defaults while writing very little code.
                if (mockFunctionMap.has(namedFieldType.name)) {
                    var mock = mockFunctionMap.get(namedFieldType.name);
                    result = mergeMocks(mock.bind(null, root, args, context, info), result);
                }
                return result;
            }
            if (graphql.isListType(fieldType)) {
                return [
                    mockType(fieldType.ofType)(root, args, context, info),
                    mockType(fieldType.ofType)(root, args, context, info),
                ];
            }
            if (mockFunctionMap.has(fieldType.name) && !graphql.isAbstractType(fieldType)) {
                // the object passed doesn't have this field, so we apply the default mock
                var mock = mockFunctionMap.get(fieldType.name);
                return mock(root, args, context, info);
            }
            if (graphql.isObjectType(fieldType)) {
                // objects don't return actual data, we only need to mock scalars!
                return {};
            }
            // if a mock function is provided for unionType or interfaceType, execute it to resolve the concrete type
            // otherwise randomly pick a type from all implementation types
            if (graphql.isAbstractType(fieldType)) {
                var implementationType = void 0;
                if (mockFunctionMap.has(fieldType.name)) {
                    var mock = mockFunctionMap.get(fieldType.name);
                    var interfaceMockObj = mock(root, args, context, info);
                    if (!interfaceMockObj || !interfaceMockObj.__typename) {
                        return Error("Please return a __typename in \"" + fieldType.name + "\"");
                    }
                    implementationType = schema.getType(interfaceMockObj.__typename);
                }
                else {
                    var possibleTypes = schema.getPossibleTypes(fieldType);
                    implementationType = getRandomElement(possibleTypes);
                }
                return tslib.__assign({ __typename: implementationType }, mockType(implementationType)(root, args, context, info));
            }
            if (graphql.isEnumType(fieldType)) {
                return getRandomElement(fieldType.getValues()).value;
            }
            if (defaultMockMap.has(fieldType.name)) {
                var defaultMock = defaultMockMap.get(fieldType.name);
                return defaultMock(root, args, context, info);
            }
            // if we get to here, we don't have a value, and we don't have a mock for this type,
            // we could return undefined, but that would be hard to debug, so we throw instead.
            // however, we returning it instead of throwing it, so preserveResolvers can handle the failures.
            return Error("No mock defined for type \"" + fieldType.name + "\"");
        };
    };
    forEachField(schema, function (field, typeName, fieldName) {
        assignResolveType(field.type, preserveResolvers);
        var mockResolver = mockType(field.type, typeName, fieldName);
        // we have to handle the root mutation and root query types differently,
        // because no resolver is called at the root.
        var queryType = schema.getQueryType();
        var isOnQueryType = queryType != null && queryType.name === typeName;
        var mutationType = schema.getMutationType();
        var isOnMutationType = mutationType != null && mutationType.name === typeName;
        if (isOnQueryType || isOnMutationType) {
            if (mockFunctionMap.has(typeName)) {
                var rootMock_1 = mockFunctionMap.get(typeName);
                // XXX: BUG in here, need to provide proper signature for rootMock.
                if (typeof rootMock_1(undefined, {}, {}, {})[fieldName] ===
                    'function') {
                    mockResolver = function (root, args, context, info) {
                        var updatedRoot = root !== null && root !== void 0 ? root : {}; // TODO: should we clone instead?
                        updatedRoot[fieldName] = rootMock_1(root, args, context, info)[fieldName];
                        // XXX this is a bit of a hack to still use mockType, which
                        // lets you mock lists etc. as well
                        // otherwise we could just set field.resolve to rootMock()[fieldName]
                        // it's like pretending there was a resolver that ran before
                        // the root resolver.
                        return mockType(field.type, typeName, fieldName)(updatedRoot, args, context, info);
                    };
                }
            }
        }
        if (!preserveResolvers || !field.resolve) {
            field.resolve = mockResolver;
        }
        else {
            var oldResolver_1 = field.resolve;
            field.resolve = function (rootObject, args, context, info) {
                return Promise.all([
                    mockResolver(rootObject, args, context, info),
                    oldResolver_1(rootObject, args, context, info),
                ]).then(function (values) {
                    var mockedValue = values[0], resolvedValue = values[1];
                    // In case we couldn't mock
                    if (mockedValue instanceof Error) {
                        // only if value was not resolved, populate the error.
                        if (undefined === resolvedValue) {
                            throw mockedValue;
                        }
                        return resolvedValue;
                    }
                    if (resolvedValue instanceof Date && mockedValue instanceof Date) {
                        return undefined !== resolvedValue ? resolvedValue : mockedValue;
                    }
                    if (isObject$1(mockedValue) && isObject$1(resolvedValue)) {
                        // Object.assign() won't do here, as we need to all properties, including
                        // the non-enumerable ones and defined using Object.defineProperty
                        var emptyObject = Object.create(Object.getPrototypeOf(resolvedValue));
                        return copyOwnProps(emptyObject, resolvedValue, mockedValue);
                    }
                    return undefined !== resolvedValue ? resolvedValue : mockedValue;
                });
            };
        }
    });
}
function isObject$1(thing) {
    return thing === Object(thing) && !Array.isArray(thing);
}
// returns a random element from that ary
function getRandomElement(ary) {
    var sample = Math.floor(Math.random() * ary.length);
    return ary[sample];
}
function mergeObjects(a, b) {
    return Object.assign(a, b);
}
function copyOwnPropsIfNotPresent(target, source) {
    Object.getOwnPropertyNames(source).forEach(function (prop) {
        if (!Object.getOwnPropertyDescriptor(target, prop)) {
            var propertyDescriptor = Object.getOwnPropertyDescriptor(source, prop);
            Object.defineProperty(target, prop, propertyDescriptor == null ? {} : propertyDescriptor);
        }
    });
}
function copyOwnProps(target) {
    var sources = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        sources[_i - 1] = arguments[_i];
    }
    sources.forEach(function (source) {
        var chain = source;
        while (chain != null) {
            copyOwnPropsIfNotPresent(target, chain);
            chain = Object.getPrototypeOf(chain);
        }
    });
    return target;
}
// takes either an object or a (possibly nested) array
// and completes the customMock object with any fields
// defined on genericMock
// only merges objects or arrays. Scalars are returned as is
function mergeMocks(genericMockFunction, customMock) {
    if (Array.isArray(customMock)) {
        return customMock.map(function (el) { return mergeMocks(genericMockFunction, el); });
    }
    if (isObject$1(customMock)) {
        return mergeObjects(genericMockFunction(), customMock);
    }
    return customMock;
}
function getResolveType(namedFieldType) {
    if (graphql.isAbstractType(namedFieldType)) {
        return namedFieldType.resolveType;
    }
}
function assignResolveType(type, preserveResolvers) {
    var fieldType = graphql.getNullableType(type);
    var namedFieldType = graphql.getNamedType(fieldType);
    var oldResolveType = getResolveType(namedFieldType);
    if (preserveResolvers && oldResolveType != null && oldResolveType.length) {
        return;
    }
    if (graphql.isInterfaceType(namedFieldType) || graphql.isUnionType(namedFieldType)) {
        // the default `resolveType` always returns null. We add a fallback
        // resolution that works with how unions and interface are mocked
        namedFieldType.resolveType = function (data, _context, info) { return info.schema.getType(data.__typename); };
    }
}
var MockList = /** @class */ (function () {
    // wrappedFunction can return another MockList or a value
    function MockList(len, wrappedFunction) {
        this.len = len;
        if (typeof wrappedFunction !== 'undefined') {
            if (typeof wrappedFunction !== 'function') {
                throw new Error('Second argument to MockList must be a function or undefined');
            }
            this.wrappedFunction = wrappedFunction;
        }
    }
    MockList.prototype.mock = function (root, args, context, info, fieldType, mockTypeFunc) {
        var arr;
        if (Array.isArray(this.len)) {
            arr = new Array(this.randint(this.len[0], this.len[1]));
        }
        else {
            arr = new Array(this.len);
        }
        for (var i = 0; i < arr.length; i++) {
            if (typeof this.wrappedFunction === 'function') {
                var res = this.wrappedFunction(root, args, context, info);
                if (res instanceof MockList) {
                    var nullableType = graphql.getNullableType(fieldType.ofType);
                    arr[i] = res.mock(root, args, context, info, nullableType, mockTypeFunc);
                }
                else {
                    arr[i] = res;
                }
            }
            else {
                arr[i] = mockTypeFunc(fieldType.ofType)(root, args, context, info);
            }
        }
        return arr;
    };
    MockList.prototype.randint = function (low, high) {
        return Math.floor(Math.random() * (high - low + 1) + low);
    };
    return MockList;
}());
// retain addMockFunctionsToSchema for backwards compatibility
function addMockFunctionsToSchema(_a) {
    var schema = _a.schema, _b = _a.mocks, mocks = _b === void 0 ? {} : _b, _c = _a.preserveResolvers, preserveResolvers = _c === void 0 ? false : _c;
    addMocksToSchema({ schema: schema, mocks: mocks, preserveResolvers: preserveResolvers });
}

var GraphQLUpload = new graphql.GraphQLScalarType({
    name: 'Upload',
    description: 'The `Upload` scalar type represents a file upload.',
    parseValue: function (value) {
        if (value != null && value.promise instanceof Promise) {
            // graphql-upload v10
            return value.promise;
        }
        else if (value instanceof Promise) {
            // graphql-upload v9
            return value;
        }
        throw new graphql.GraphQLError('Upload value invalid.');
    },
    // serialization requires to support schema stitching
    serialize: function (value) { return value; },
    parseLiteral: function (ast) {
        throw new graphql.GraphQLError('Upload literal unsupported.', ast);
    },
});

var parsedIntrospectionQuery = graphql.parse(graphql.getIntrospectionQuery());
function introspectSchema(linkOrFetcher, linkContext) {
    var fetcher = typeof linkOrFetcher === 'function'
        ? linkOrFetcher
        : linkToFetcher(linkOrFetcher);
    return fetcher({
        query: parsedIntrospectionQuery,
        context: linkContext,
    }).then(function (introspectionResult) {
        if ((Array.isArray(introspectionResult.errors) &&
            introspectionResult.errors.length) ||
            !introspectionResult.data.__schema) {
            if (Array.isArray(introspectionResult.errors)) {
                var combinedError = combineErrors(introspectionResult.errors);
                throw combinedError;
            }
            else {
                throw new Error('Could not obtain introspection result, received: ' +
                    JSON.stringify(introspectionResult));
            }
        }
        else {
            var schema = graphql.buildClientSchema(introspectionResult.data);
            return schema;
        }
    });
}

/**
 * Resolver that knows how to:
 * a) handle aliases for proxied schemas
 * b) handle errors from proxied schemas
 * c) handle external to internal enum coversion
 */
function defaultMergedResolver(parent, args, context, info) {
    if (!parent) {
        return null;
    }
    var responseKey = getResponseKeyFromInfo(info);
    var errors = getErrors(parent, responseKey);
    // check to see if parent is not a proxied result, i.e. if parent resolver was manually overwritten
    // See https://github.com/apollographql/graphql-tools/issues/967
    if (!errors) {
        return graphql.defaultFieldResolver(parent, args, context, info);
    }
    var result = parent[responseKey];
    var subschema = getSubschema(parent, responseKey);
    return handleResult(result, errors, subschema, context, info);
}

function makeMergedType(type) {
    if (graphql.isObjectType(type)) {
        type.isTypeOf = undefined;
        var fieldMap_1 = type.getFields();
        Object.keys(fieldMap_1).forEach(function (fieldName) {
            fieldMap_1[fieldName].resolve = defaultMergedResolver;
            fieldMap_1[fieldName].subscribe = null;
        });
    }
    else if (graphql.isAbstractType(type)) {
        type.resolveType = function (parent) { return resolveFromParentTypename(parent); };
    }
}

function generateProxyingResolvers(_a) {
    var subschemaConfig = _a.subschemaConfig, transforms = _a.transforms;
    var targetSchema = subschemaConfig.schema;
    var operationTypes = {
        query: targetSchema.getQueryType(),
        mutation: targetSchema.getMutationType(),
        subscription: targetSchema.getSubscriptionType(),
    };
    var createProxyingResolver = subschemaConfig.createProxyingResolver != null
        ? subschemaConfig.createProxyingResolver
        : defaultCreateProxyingResolver;
    var resolvers = {};
    Object.keys(operationTypes).forEach(function (operation) {
        var resolveField = operation === 'subscription' ? 'subscribe' : 'resolve';
        var rootType = operationTypes[operation];
        if (rootType != null) {
            var typeName_1 = rootType.name;
            var fields = rootType.getFields();
            resolvers[typeName_1] = {};
            Object.keys(fields).forEach(function (fieldName) {
                var _a;
                var proxyingResolver = createProxyingResolver(subschemaConfig, transforms, operation, fieldName);
                var finalResolver = createPossiblyNestedProxyingResolver(subschemaConfig, proxyingResolver);
                resolvers[typeName_1][fieldName] = (_a = {},
                    _a[resolveField] = finalResolver,
                    _a);
            });
        }
    });
    return resolvers;
}
function createPossiblyNestedProxyingResolver(subschemaConfig, proxyingResolver) {
    return function (parent, args, context, info) {
        if (parent != null) {
            var responseKey = getResponseKeyFromInfo(info);
            var errors = getErrors(parent, responseKey);
            // Check to see if the parent contains a proxied result
            if (errors != null) {
                var subschema = getSubschema(parent, responseKey);
                // If there is a proxied result from this subschema, return it
                // This can happen even for a root field when the root type ia
                // also nested as a field within a different type.
                if (subschemaConfig === subschema) {
                    return handleResult(parent[responseKey], errors, subschema, context, info);
                }
            }
        }
        return proxyingResolver(parent, args, context, info);
    };
}
function defaultCreateProxyingResolver(schema, transforms) {
    return function (_parent, _args, context, info) {
        return delegateToSchema({
            schema: schema,
            context: context,
            info: info,
            transforms: transforms,
        });
    };
}
function stripResolvers(schema) {
    var typeMap = schema.getTypeMap();
    Object.keys(typeMap).forEach(function (typeName) {
        if (!typeName.startsWith('__')) {
            makeMergedType(typeMap[typeName]);
        }
    });
}

function wrapSchema(subschemaOrSubschemaConfig, transforms) {
    var subschemaConfig = isSubschemaConfig(subschemaOrSubschemaConfig)
        ? subschemaOrSubschemaConfig
        : { schema: subschemaOrSubschemaConfig };
    var schema = cloneSchema(subschemaConfig.schema);
    stripResolvers(schema);
    var resolvers = generateProxyingResolvers({
        subschemaConfig: subschemaConfig,
        transforms: transforms,
    });
    addResolversToSchema({ schema: schema, resolvers: resolvers });
    var schemaTransforms = [];
    if (subschemaConfig.transforms != null) {
        schemaTransforms = schemaTransforms.concat(subschemaConfig.transforms);
    }
    if (transforms != null) {
        schemaTransforms = schemaTransforms.concat(transforms);
    }
    return applySchemaTransforms(schema, schemaTransforms);
}

var backcompatOptions = { commentDescriptions: true };
function typeFromAST(node) {
    switch (node.kind) {
        case graphql.Kind.OBJECT_TYPE_DEFINITION:
            return makeObjectType(node);
        case graphql.Kind.INTERFACE_TYPE_DEFINITION:
            return makeInterfaceType(node);
        case graphql.Kind.ENUM_TYPE_DEFINITION:
            return makeEnumType(node);
        case graphql.Kind.UNION_TYPE_DEFINITION:
            return makeUnionType(node);
        case graphql.Kind.SCALAR_TYPE_DEFINITION:
            return makeScalarType(node);
        case graphql.Kind.INPUT_OBJECT_TYPE_DEFINITION:
            return makeInputObjectType(node);
        case graphql.Kind.DIRECTIVE_DEFINITION:
            return makeDirective(node);
        default:
            return null;
    }
}
function makeObjectType(node) {
    var config = {
        name: node.name.value,
        fields: function () { return makeFields(node.fields); },
        interfaces: function () {
            return node.interfaces.map(function (iface) {
                return createNamedStub(iface.name.value, 'interface');
            });
        },
        description: getDescription(node, backcompatOptions),
    };
    return new graphql.GraphQLObjectType(config);
}
function makeInterfaceType(node) {
    var config = {
        name: node.name.value,
        fields: function () { return makeFields(node.fields); },
        interfaces: graphqlVersion() >= 15
            ? function () {
                return node.interfaces.map(function (iface) {
                    return createNamedStub(iface.name.value, 'interface');
                });
            }
            : undefined,
        description: getDescription(node, backcompatOptions),
        resolveType: function (parent) { return resolveFromParentTypename(parent); },
    };
    return new graphql.GraphQLInterfaceType(config);
}
function makeEnumType(node) {
    var values = keyValMap(node.values, function (value) { return value.name.value; }, function (value) { return ({
        description: getDescription(value, backcompatOptions),
    }); });
    return new graphql.GraphQLEnumType({
        name: node.name.value,
        values: values,
        description: getDescription(node, backcompatOptions),
    });
}
function makeUnionType(node) {
    return new graphql.GraphQLUnionType({
        name: node.name.value,
        types: function () {
            return node.types.map(function (type) { return createNamedStub(type.name.value, 'object'); });
        },
        description: getDescription(node, backcompatOptions),
        resolveType: function (parent) { return resolveFromParentTypename(parent); },
    });
}
function makeScalarType(node) {
    return new graphql.GraphQLScalarType({
        name: node.name.value,
        description: getDescription(node, backcompatOptions),
        serialize: function () { return null; },
        // Note: validation calls the parse functions to determine if a
        // literal value is correct. Returning null would cause use of custom
        // scalars to always fail validation. Returning false causes them to
        // always pass validation.
        parseValue: function () { return false; },
        parseLiteral: function () { return false; },
    });
}
function makeInputObjectType(node) {
    return new graphql.GraphQLInputObjectType({
        name: node.name.value,
        fields: function () { return makeValues(node.fields); },
        description: getDescription(node, backcompatOptions),
    });
}
function makeFields(nodes) {
    return keyValMap(nodes, function (node) { return node.name.value; }, function (node) {
        var deprecatedDirective = node.directives.find(function (directive) { return directive.name.value === 'deprecated'; });
        var deprecationReason;
        if (deprecatedDirective != null) {
            var deprecatedArgument = deprecatedDirective.arguments.find(function (arg) { return arg.name.value === 'reason'; });
            deprecationReason = deprecatedArgument.value.value;
        }
        return {
            type: createStub(node.type, 'output'),
            args: makeValues(node.arguments),
            description: getDescription(node, backcompatOptions),
            deprecationReason: deprecationReason,
        };
    });
}
function makeValues(nodes) {
    return keyValMap(nodes, function (node) { return node.name.value; }, function (node) {
        var type = createStub(node.type, 'input');
        return {
            type: type,
            defaultValue: node.defaultValue,
            description: getDescription(node, backcompatOptions),
        };
    });
}
function makeDirective(node) {
    var locations = [];
    node.locations.forEach(function (location) {
        if (location.value in graphql.DirectiveLocation) {
            locations.push(location.value);
        }
    });
    return new graphql.GraphQLDirective({
        name: node.name.value,
        description: node.description != null ? node.description.value : null,
        args: makeValues(node.arguments),
        locations: locations,
    });
}
// graphql < v13 does not export getDescription
function getDescription(node, options) {
    if (node.description != null) {
        return node.description.value;
    }
    if (options.commentDescriptions) {
        var rawValue = getLeadingCommentBlock(node);
        if (rawValue !== undefined) {
            return dedentBlockStringValue("\n" + rawValue);
        }
    }
}
function getLeadingCommentBlock(node) {
    var loc = node.loc;
    if (!loc) {
        return;
    }
    var comments = [];
    var token = loc.startToken.prev;
    while (token != null &&
        token.kind === graphql.TokenKind.COMMENT &&
        token.next != null &&
        token.prev != null &&
        token.line + 1 === token.next.line &&
        token.line !== token.prev.line) {
        var value = String(token.value);
        comments.push(value);
        token = token.prev;
    }
    return comments.length > 0 ? comments.reverse().join('\n') : undefined;
}
function dedentBlockStringValue(rawString) {
    // Expand a block string's raw value into independent lines.
    var lines = rawString.split(/\r\n|[\n\r]/g);
    // Remove common indentation from all lines but first.
    var commonIndent = getBlockStringIndentation(lines);
    if (commonIndent !== 0) {
        for (var i = 1; i < lines.length; i++) {
            lines[i] = lines[i].slice(commonIndent);
        }
    }
    // Remove leading and trailing blank lines.
    while (lines.length > 0 && isBlank(lines[0])) {
        lines.shift();
    }
    while (lines.length > 0 && isBlank(lines[lines.length - 1])) {
        lines.pop();
    }
    // Return a string of the lines joined with U+000A.
    return lines.join('\n');
}
/**
 * @internal
 */
function getBlockStringIndentation(lines) {
    var commonIndent = null;
    for (var i = 1; i < lines.length; i++) {
        var line = lines[i];
        var indent = leadingWhitespace(line);
        if (indent === line.length) {
            continue; // skip empty lines
        }
        if (commonIndent === null || indent < commonIndent) {
            commonIndent = indent;
            if (commonIndent === 0) {
                break;
            }
        }
    }
    return commonIndent === null ? 0 : commonIndent;
}
function leadingWhitespace(str) {
    var i = 0;
    while (i < str.length && (str[i] === ' ' || str[i] === '\t')) {
        i++;
    }
    return i;
}
function isBlank(str) {
    return leadingWhitespace(str) === str.length;
}

function concatInlineFragments(type, fragments) {
    var fragmentSelections = fragments.reduce(function (selections, fragment) {
        return selections.concat(fragment.selectionSet.selections);
    }, []);
    var deduplicatedFragmentSelection = deduplicateSelection(fragmentSelections);
    return {
        kind: graphql.Kind.INLINE_FRAGMENT,
        typeCondition: {
            kind: graphql.Kind.NAMED_TYPE,
            name: {
                kind: graphql.Kind.NAME,
                value: type,
            },
        },
        selectionSet: {
            kind: graphql.Kind.SELECTION_SET,
            selections: deduplicatedFragmentSelection,
        },
    };
}
function deduplicateSelection(nodes) {
    var selectionMap = nodes.reduce(function (map, node) {
        var _a, _b, _c;
        switch (node.kind) {
            case 'Field': {
                if (node.alias != null) {
                    if (node.alias.value in map) {
                        return map;
                    }
                    return tslib.__assign(tslib.__assign({}, map), (_a = {}, _a[node.alias.value] = node, _a));
                }
                if (node.name.value in map) {
                    return map;
                }
                return tslib.__assign(tslib.__assign({}, map), (_b = {}, _b[node.name.value] = node, _b));
            }
            case 'FragmentSpread': {
                if (node.name.value in map) {
                    return map;
                }
                return tslib.__assign(tslib.__assign({}, map), (_c = {}, _c[node.name.value] = node, _c));
            }
            case 'InlineFragment': {
                if (map.__fragment != null) {
                    var fragment = map.__fragment;
                    return tslib.__assign(tslib.__assign({}, map), { __fragment: concatInlineFragments(fragment.typeCondition.name.value, [fragment, node]) });
                }
                return tslib.__assign(tslib.__assign({}, map), { __fragment: node });
            }
            default: {
                return map;
            }
        }
    }, Object.create(null));
    var selection = Object.keys(selectionMap).reduce(function (selectionList, node) { return selectionList.concat(selectionMap[node]); }, []);
    return selection;
}
function parseFragmentToInlineFragment(definitions) {
    if (definitions.trim().startsWith('fragment')) {
        var document_1 = graphql.parse(definitions);
        for (var _i = 0, _a = document_1.definitions; _i < _a.length; _i++) {
            var definition = _a[_i];
            if (definition.kind === graphql.Kind.FRAGMENT_DEFINITION) {
                return {
                    kind: graphql.Kind.INLINE_FRAGMENT,
                    typeCondition: definition.typeCondition,
                    selectionSet: definition.selectionSet,
                };
            }
        }
    }
    var query = graphql.parse("{" + definitions + "}")
        .definitions[0];
    for (var _b = 0, _c = query.selectionSet.selections; _b < _c.length; _b++) {
        var selection = _c[_b];
        if (selection.kind === graphql.Kind.INLINE_FRAGMENT) {
            return selection;
        }
    }
    throw new Error('Could not parse fragment');
}

function parseSelectionSet(selectionSet) {
    var query = graphql.parse(selectionSet).definitions[0];
    return query.selectionSet;
}
function typeContainsSelectionSet(type, selectionSet) {
    var fields = type.getFields();
    for (var _i = 0, _a = selectionSet.selections; _i < _a.length; _i++) {
        var selection = _a[_i];
        if (selection.kind === graphql.Kind.FIELD) {
            var field = fields[selection.name.value];
            if (field == null) {
                return false;
            }
            if (selection.selectionSet != null) {
                return typeContainsSelectionSet(graphql.getNamedType(field.type), selection.selectionSet);
            }
        }
        else if (selection.kind === graphql.Kind.INLINE_FRAGMENT) {
            var containsSelectionSet = typeContainsSelectionSet(type, selection.selectionSet);
            if (!containsSelectionSet) {
                return false;
            }
        }
    }
    return true;
}

function createMergeInfo(allSchemas, typeCandidates, mergeTypes) {
    return {
        delegate: function (operation, fieldName, args, context, info, transforms) {
            if (transforms === void 0) { transforms = []; }
            var schema = guessSchemaByRootField(allSchemas, operation, fieldName);
            var expandTransforms = new ExpandAbstractTypes(info.schema, schema);
            var fragmentTransform = new AddReplacementFragments(schema, info.mergeInfo.replacementFragments);
            return delegateToSchema({
                schema: schema,
                operation: operation,
                fieldName: fieldName,
                args: args,
                context: context,
                info: info,
                transforms: tslib.__spreadArrays(transforms, [expandTransforms, fragmentTransform]),
            });
        },
        delegateToSchema: function (options) {
            return delegateToSchema(tslib.__assign(tslib.__assign({}, options), { transforms: options.transforms }));
        },
        fragments: [],
        replacementSelectionSets: undefined,
        replacementFragments: undefined,
        mergedTypes: createMergedTypes(typeCandidates, mergeTypes),
    };
}
function createMergedTypes(typeCandidates, mergeTypes) {
    var mergedTypes = Object.create(null);
    Object.keys(typeCandidates).forEach(function (typeName) {
        if (graphql.isObjectType(typeCandidates[typeName][0].type)) {
            var mergedTypeCandidates = typeCandidates[typeName].filter(function (typeCandidate) {
                return typeCandidate.subschema != null &&
                    isSubschemaConfig(typeCandidate.subschema) &&
                    typeCandidate.subschema.merge != null &&
                    hasOwnProperty(typeCandidate.subschema.merge, typeName);
            });
            if (mergeTypes === true ||
                (typeof mergeTypes === 'function' &&
                    mergeTypes(typeName, typeCandidates[typeName])) ||
                (Array.isArray(mergeTypes) && mergeTypes.includes(typeName)) ||
                mergedTypeCandidates.length) {
                var subschemas_1 = [];
                var requiredSelections_1 = [
                    parseSelectionSet('{ __typename }').selections[0],
                ];
                var fields_1 = Object.create({});
                var typeMaps_1 = new Map();
                var selectionSets_1 = new Map();
                mergedTypeCandidates.forEach(function (typeCandidate) {
                    var subschemaConfig = typeCandidate.subschema;
                    var transformedSubschema = typeCandidate.transformedSubschema;
                    typeMaps_1.set(subschemaConfig, transformedSubschema.getTypeMap());
                    var type = transformedSubschema.getType(typeName);
                    var fieldMap = type.getFields();
                    Object.keys(fieldMap).forEach(function (fieldName) {
                        if (!(fieldName in fields_1)) {
                            fields_1[fieldName] = [];
                        }
                        fields_1[fieldName].push(subschemaConfig);
                    });
                    var mergedTypeConfig = subschemaConfig.merge[typeName];
                    if (mergedTypeConfig.selectionSet) {
                        var selectionSet = parseSelectionSet(mergedTypeConfig.selectionSet);
                        requiredSelections_1 = requiredSelections_1.concat(selectionSet.selections);
                        selectionSets_1.set(subschemaConfig, selectionSet);
                    }
                    if (!mergedTypeConfig.resolve) {
                        mergedTypeConfig.resolve = function (originalResult, context, info, subschema, selectionSet) {
                            return delegateToSchema({
                                schema: subschema,
                                operation: 'query',
                                fieldName: mergedTypeConfig.fieldName,
                                args: mergedTypeConfig.args(originalResult),
                                selectionSet: selectionSet,
                                context: context,
                                info: info,
                                skipTypeMerging: true,
                            });
                        };
                    }
                    subschemas_1.push(subschemaConfig);
                });
                mergedTypes[typeName] = {
                    subschemas: subschemas_1,
                    typeMaps: typeMaps_1,
                    selectionSets: selectionSets_1,
                    containsSelectionSet: new Map(),
                    uniqueFields: Object.create({}),
                    nonUniqueFields: Object.create({}),
                };
                subschemas_1.forEach(function (subschema) {
                    var type = typeMaps_1.get(subschema)[typeName];
                    var subschemaMap = new Map();
                    subschemas_1
                        .filter(function (s) { return s !== subschema; })
                        .forEach(function (s) {
                        var selectionSet = selectionSets_1.get(s);
                        if (selectionSet != null &&
                            typeContainsSelectionSet(type, selectionSet)) {
                            subschemaMap.set(selectionSet, true);
                        }
                    });
                    mergedTypes[typeName].containsSelectionSet.set(subschema, subschemaMap);
                });
                Object.keys(fields_1).forEach(function (fieldName) {
                    var supportedBySubschemas = fields_1[fieldName];
                    if (supportedBySubschemas.length === 1) {
                        mergedTypes[typeName].uniqueFields[fieldName] =
                            supportedBySubschemas[0];
                    }
                    else {
                        mergedTypes[typeName].nonUniqueFields[fieldName] = supportedBySubschemas;
                    }
                });
                mergedTypes[typeName].selectionSet = {
                    kind: graphql.Kind.SELECTION_SET,
                    selections: requiredSelections_1,
                };
            }
        }
    });
    return mergedTypes;
}
function completeMergeInfo(mergeInfo, resolvers) {
    var replacementSelectionSets = Object.create(null);
    Object.keys(resolvers).forEach(function (typeName) {
        var type = resolvers[typeName];
        if (graphql.isScalarType(type)) {
            return;
        }
        Object.keys(type).forEach(function (fieldName) {
            var field = type[fieldName];
            if (field.selectionSet) {
                var selectionSet = parseSelectionSet(field.selectionSet);
                if (!(typeName in replacementSelectionSets)) {
                    replacementSelectionSets[typeName] = Object.create(null);
                }
                var typeReplacementSelectionSets = replacementSelectionSets[typeName];
                if (!(fieldName in typeReplacementSelectionSets)) {
                    typeReplacementSelectionSets[fieldName] = {
                        kind: graphql.Kind.SELECTION_SET,
                        selections: [],
                    };
                }
                typeReplacementSelectionSets[fieldName].selections = typeReplacementSelectionSets[fieldName].selections.concat(selectionSet.selections);
            }
            if (field.fragment) {
                mergeInfo.fragments.push({
                    field: fieldName,
                    fragment: field.fragment,
                });
            }
        });
    });
    var mapping = Object.create(null);
    mergeInfo.fragments.forEach(function (_a) {
        var field = _a.field, fragment = _a.fragment;
        var parsedFragment = parseFragmentToInlineFragment(fragment);
        var actualTypeName = parsedFragment.typeCondition.name.value;
        if (!(actualTypeName in mapping)) {
            mapping[actualTypeName] = Object.create(null);
        }
        var typeMapping = mapping[actualTypeName];
        if (!(field in typeMapping)) {
            typeMapping[field] = [];
        }
        typeMapping[field].push(parsedFragment);
    });
    var replacementFragments = Object.create(null);
    Object.keys(mapping).forEach(function (typeName) {
        Object.keys(mapping[typeName]).forEach(function (field) {
            if (!(typeName in replacementFragments)) {
                replacementFragments[typeName] = Object.create(null);
            }
            var typeReplacementFragments = replacementFragments[typeName];
            typeReplacementFragments[field] = concatInlineFragments(typeName, mapping[typeName][field]);
        });
    });
    mergeInfo.replacementSelectionSets = replacementSelectionSets;
    mergeInfo.replacementFragments = replacementFragments;
    return mergeInfo;
}
function operationToRootType(operation, schema) {
    if (operation === 'subscription') {
        return schema.getSubscriptionType();
    }
    else if (operation === 'mutation') {
        return schema.getMutationType();
    }
    return schema.getQueryType();
}
function guessSchemaByRootField(schemas, operation, fieldName) {
    for (var _i = 0, schemas_1 = schemas; _i < schemas_1.length; _i++) {
        var schema = schemas_1[_i];
        var rootObject = operationToRootType(operation, schema);
        if (rootObject != null) {
            var fields = rootObject.getFields();
            if (fieldName in fields) {
                return schema;
            }
        }
    }
    throw new Error("Could not find subschema with field `" + operation + "." + fieldName + "`");
}

function mergeSchemas(_a) {
    var _b = _a.subschemas, subschemas = _b === void 0 ? [] : _b, _c = _a.types, types = _c === void 0 ? [] : _c, typeDefs = _a.typeDefs, _d = _a.schemas, schemaLikeObjects = _d === void 0 ? [] : _d, onTypeConflict = _a.onTypeConflict, _e = _a.resolvers, resolvers = _e === void 0 ? {} : _e, schemaDirectives = _a.schemaDirectives, inheritResolversFromInterfaces = _a.inheritResolversFromInterfaces, _f = _a.mergeTypes, mergeTypes = _f === void 0 ? false : _f, mergeDirectives = _a.mergeDirectives, _g = _a.queryTypeName, queryTypeName = _g === void 0 ? 'Query' : _g, _h = _a.mutationTypeName, mutationTypeName = _h === void 0 ? 'Mutation' : _h, _j = _a.subscriptionTypeName, subscriptionTypeName = _j === void 0 ? 'Subscription' : _j;
    var allSchemas = [];
    var typeCandidates = Object.create(null);
    var typeMap = Object.create(null);
    var extensions = [];
    var directives = [];
    var schemas = tslib.__spreadArrays(subschemas);
    if (typeDefs) {
        schemas.push(typeDefs);
    }
    if (types != null) {
        schemas.push(types);
    }
    schemas = tslib.__spreadArrays(schemas, schemaLikeObjects);
    schemas.forEach(function (schemaLikeObject) {
        var _a;
        if (graphql.isSchema(schemaLikeObject) || isSubschemaConfig(schemaLikeObject)) {
            var schema_1 = wrapSchema(schemaLikeObject);
            allSchemas.push(schema_1);
            var operationTypes_1 = (_a = {},
                _a[queryTypeName] = schema_1.getQueryType(),
                _a[mutationTypeName] = schema_1.getMutationType(),
                _a[subscriptionTypeName] = schema_1.getSubscriptionType(),
                _a);
            Object.keys(operationTypes_1).forEach(function (typeName) {
                if (operationTypes_1[typeName] != null) {
                    addTypeCandidate(typeCandidates, typeName, {
                        schema: schema_1,
                        type: operationTypes_1[typeName],
                        subschema: schemaLikeObject,
                        transformedSubschema: schema_1,
                    });
                }
            });
            if (mergeDirectives) {
                var directiveInstances = schema_1.getDirectives();
                directiveInstances.forEach(function (directive) {
                    directives.push(directive);
                });
            }
            var originalTypeMap_1 = schema_1.getTypeMap();
            Object.keys(originalTypeMap_1).forEach(function (typeName) {
                var type = originalTypeMap_1[typeName];
                if (graphql.isNamedType(type) &&
                    graphql.getNamedType(type).name.slice(0, 2) !== '__' &&
                    type !== operationTypes_1.Query &&
                    type !== operationTypes_1.Mutation &&
                    type !== operationTypes_1.Subscription) {
                    addTypeCandidate(typeCandidates, type.name, {
                        schema: schema_1,
                        type: type,
                        subschema: schemaLikeObject,
                        transformedSubschema: schema_1,
                    });
                }
            });
        }
        else if (typeof schemaLikeObject === 'string' ||
            (schemaLikeObject != null &&
                schemaLikeObject.kind === graphql.Kind.DOCUMENT)) {
            var parsedSchemaDocument = typeof schemaLikeObject === 'string'
                ? graphql.parse(schemaLikeObject)
                : schemaLikeObject;
            parsedSchemaDocument.definitions.forEach(function (def) {
                var type = typeFromAST(def);
                if (graphql.isDirective(type) && mergeDirectives) {
                    directives.push(type);
                }
                else if (type != null && !graphql.isDirective(type)) {
                    addTypeCandidate(typeCandidates, type.name, {
                        type: type,
                    });
                }
            });
            var extensionsDocument = extractExtensionDefinitions(parsedSchemaDocument);
            if (extensionsDocument.definitions.length > 0) {
                extensions.push(extensionsDocument);
            }
        }
        else if (Array.isArray(schemaLikeObject)) {
            schemaLikeObject.forEach(function (type) {
                addTypeCandidate(typeCandidates, type.name, {
                    type: type,
                });
            });
        }
        else {
            throw new Error('Invalid schema passed');
        }
    });
    var mergeInfo = createMergeInfo(allSchemas, typeCandidates, mergeTypes);
    var finalResolvers;
    if (typeof resolvers === 'function') {
        finalResolvers = resolvers(mergeInfo);
    }
    else if (Array.isArray(resolvers)) {
        finalResolvers = resolvers.reduce(function (left, right) {
            return mergeDeep(left, typeof right === 'function' ? right(mergeInfo) : right);
        }, {});
        if (Array.isArray(resolvers)) {
            finalResolvers = resolvers.reduce(mergeDeep, {});
        }
    }
    else {
        finalResolvers = resolvers;
    }
    if (finalResolvers == null) {
        finalResolvers = {};
    }
    mergeInfo = completeMergeInfo(mergeInfo, finalResolvers);
    Object.keys(typeCandidates).forEach(function (typeName) {
        if (typeName === queryTypeName ||
            typeName === mutationTypeName ||
            typeName === subscriptionTypeName ||
            (mergeTypes === true &&
                !graphql.isScalarType(typeCandidates[typeName][0].type)) ||
            (typeof mergeTypes === 'function' &&
                mergeTypes(typeName, typeCandidates[typeName])) ||
            (Array.isArray(mergeTypes) && mergeTypes.includes(typeName)) ||
            typeName in mergeInfo.mergedTypes) {
            typeMap[typeName] = merge(typeName, typeCandidates[typeName]);
        }
        else {
            var candidateSelector = onTypeConflict != null
                ? onTypeConflictToCandidateSelector(onTypeConflict)
                : function (cands) { return cands[cands.length - 1]; };
            typeMap[typeName] = candidateSelector(typeCandidates[typeName]).type;
        }
    });
    healTypes(typeMap, directives, { skipPruning: true });
    var mergedSchema = new graphql.GraphQLSchema({
        query: typeMap[queryTypeName],
        mutation: typeMap[mutationTypeName],
        subscription: typeMap[subscriptionTypeName],
        types: Object.keys(typeMap).map(function (key) { return typeMap[key]; }),
        directives: directives.length
            ? directives.map(function (directive) { return cloneDirective(directive); })
            : undefined,
    });
    extensions.forEach(function (extension) {
        mergedSchema = extendSchema(mergedSchema, extension, {
            commentDescriptions: true,
        });
    });
    addResolversToSchema({
        schema: mergedSchema,
        resolvers: finalResolvers,
        inheritResolversFromInterfaces: inheritResolversFromInterfaces,
    });
    forEachField(mergedSchema, function (field) {
        if (field.resolve != null) {
            var fieldResolver_1 = field.resolve;
            field.resolve = function (parent, args, context, info) {
                var newInfo = tslib.__assign(tslib.__assign({}, info), { mergeInfo: mergeInfo });
                return fieldResolver_1(parent, args, context, newInfo);
            };
        }
        if (field.subscribe != null) {
            var fieldResolver_2 = field.subscribe;
            field.subscribe = function (parent, args, context, info) {
                var newInfo = tslib.__assign(tslib.__assign({}, info), { mergeInfo: mergeInfo });
                return fieldResolver_2(parent, args, context, newInfo);
            };
        }
    });
    if (schemaDirectives != null) {
        SchemaDirectiveVisitor.visitSchemaDirectives(mergedSchema, schemaDirectives);
    }
    return mergedSchema;
}
function addTypeCandidate(typeCandidates, name, typeCandidate) {
    if (!(name in typeCandidates)) {
        typeCandidates[name] = [];
    }
    typeCandidates[name].push(typeCandidate);
}
function onTypeConflictToCandidateSelector(onTypeConflict) {
    return function (cands) {
        return cands.reduce(function (prev, next) {
            var type = onTypeConflict(prev.type, next.type, {
                left: {
                    schema: prev.schema,
                },
                right: {
                    schema: next.schema,
                },
            });
            if (prev.type === type) {
                return prev;
            }
            else if (next.type === type) {
                return next;
            }
            return {
                schemaName: 'unknown',
                type: type,
            };
        });
    };
}
function merge(typeName, candidates) {
    var initialCandidateType = candidates[0].type;
    if (candidates.some(function (candidate) {
        return candidate.type.constructor !== initialCandidateType.constructor;
    })) {
        throw new Error("Cannot merge different type categories into common type " + typeName + ".");
    }
    if (graphql.isObjectType(initialCandidateType)) {
        return new graphql.GraphQLObjectType({
            name: typeName,
            fields: candidates.reduce(function (acc, candidate) { return (tslib.__assign(tslib.__assign({}, acc), toConfig(candidate.type).fields)); }, {}),
            interfaces: candidates.reduce(function (acc, candidate) {
                var interfaces = toConfig(candidate.type).interfaces;
                return interfaces != null ? acc.concat(interfaces) : acc;
            }, []),
        });
    }
    else if (graphql.isInterfaceType(initialCandidateType)) {
        var config = {
            name: typeName,
            fields: candidates.reduce(function (acc, candidate) { return (tslib.__assign(tslib.__assign({}, acc), toConfig(candidate.type).fields)); }, {}),
            interfaces: graphqlVersion() >= 15
                ? candidates.reduce(function (acc, candidate) {
                    var interfaces = toConfig(candidate.type).interfaces;
                    return interfaces != null ? acc.concat(interfaces) : acc;
                }, [])
                : undefined,
        };
        return new graphql.GraphQLInterfaceType(config);
    }
    else if (graphql.isUnionType(initialCandidateType)) {
        return new graphql.GraphQLUnionType({
            name: typeName,
            types: candidates.reduce(function (acc, candidate) { return acc.concat(toConfig(candidate.type).types); }, []),
        });
    }
    else if (graphql.isEnumType(initialCandidateType)) {
        return new graphql.GraphQLEnumType({
            name: typeName,
            values: candidates.reduce(function (acc, candidate) { return (tslib.__assign(tslib.__assign({}, acc), toConfig(candidate.type).values)); }, {}),
        });
    }
    else if (graphql.isScalarType(initialCandidateType)) {
        throw new Error("Cannot merge type " + typeName + ". Merging not supported for GraphQLScalarType.");
    }
    else {
        // not reachable.
        throw new Error("Type " + typeName + " has unknown GraphQL type.");
    }
}

// This function is deprecated in favor of wrapSchema as the name is misleading.
// transformSchema does not just "transform" a schema, it wraps a schema with transforms
// using a round of delegation.
// The applySchemaTransforms function actually "transforms" the schema and is used during wrapping.
function transformSchema(subschemaOrSubschemaConfig, transforms) {
    var schema = wrapSchema(subschemaOrSubschemaConfig, transforms);
    schema.transforms = transforms.slice().reverse();
    return schema;
}

var RenameTypes = /** @class */ (function () {
    function RenameTypes(renamer, options) {
        this.renamer = renamer;
        this.map = Object.create(null);
        this.reverseMap = Object.create(null);
        var _a = options != null ? options : {}, _b = _a.renameBuiltins, renameBuiltins = _b === void 0 ? false : _b, _c = _a.renameScalars, renameScalars = _c === void 0 ? true : _c;
        this.renameBuiltins = renameBuiltins;
        this.renameScalars = renameScalars;
    }
    RenameTypes.prototype.transformSchema = function (originalSchema) {
        var _a;
        var _this = this;
        return mapSchema(originalSchema, (_a = {},
            _a[exports.MapperKind.TYPE] = function (type) {
                if (isSpecifiedScalarType(type) && !_this.renameBuiltins) {
                    return undefined;
                }
                if (graphql.isScalarType(type) && !_this.renameScalars) {
                    return undefined;
                }
                var oldName = type.name;
                var newName = _this.renamer(oldName);
                if (newName !== undefined && newName !== oldName) {
                    _this.map[oldName] = newName;
                    _this.reverseMap[newName] = oldName;
                    var newConfig = tslib.__assign(tslib.__assign({}, toConfig(type)), { name: newName });
                    if (graphql.isObjectType(type)) {
                        return new graphql.GraphQLObjectType(newConfig);
                    }
                    else if (graphql.isInterfaceType(type)) {
                        return new graphql.GraphQLInterfaceType(newConfig);
                    }
                    else if (graphql.isUnionType(type)) {
                        return new graphql.GraphQLUnionType(newConfig);
                    }
                    else if (graphql.isInputObjectType(type)) {
                        return new graphql.GraphQLInputObjectType(newConfig);
                    }
                    else if (graphql.isEnumType(type)) {
                        return new graphql.GraphQLEnumType(newConfig);
                    }
                    else if (graphql.isScalarType(type)) {
                        return new graphql.GraphQLScalarType(newConfig);
                    }
                    throw new Error("Unknown type " + type + ".");
                }
            },
            _a[exports.MapperKind.ROOT_OBJECT] = function () {
                return undefined;
            },
            _a));
    };
    RenameTypes.prototype.transformRequest = function (originalRequest) {
        var _a;
        var _this = this;
        var newDocument = graphql.visit(originalRequest.document, (_a = {},
            _a[graphql.Kind.NAMED_TYPE] = function (node) {
                var name = node.name.value;
                if (name in _this.reverseMap) {
                    return tslib.__assign(tslib.__assign({}, node), { name: {
                            kind: graphql.Kind.NAME,
                            value: _this.reverseMap[name],
                        } });
                }
            },
            _a));
        return {
            document: newDocument,
            variables: originalRequest.variables,
        };
    };
    RenameTypes.prototype.transformResult = function (result) {
        return tslib.__assign(tslib.__assign({}, result), { data: this.transformData(result.data) });
    };
    RenameTypes.prototype.transformData = function (data) {
        var _this = this;
        if (data == null) {
            return data;
        }
        else if (Array.isArray(data)) {
            return data.map(function (value) { return _this.transformData(value); });
        }
        else if (typeof data === 'object') {
            return this.transformObject(data);
        }
        return data;
    };
    RenameTypes.prototype.transformObject = function (object) {
        var _this = this;
        Object.keys(object).forEach(function (key) {
            var value = object[key];
            if (key === '__typename') {
                if (value in _this.map) {
                    object[key] = _this.map[value];
                }
            }
            else {
                object[key] = _this.transformData(value);
            }
        });
        return object;
    };
    return RenameTypes;
}());

var FilterTypes = /** @class */ (function () {
    function FilterTypes(filter) {
        this.filter = filter;
    }
    FilterTypes.prototype.transformSchema = function (schema) {
        var _a;
        var _this = this;
        return mapSchema(schema, (_a = {},
            _a[exports.MapperKind.TYPE] = function (type) {
                if (_this.filter(type)) {
                    return undefined;
                }
                return null;
            },
            _a));
    };
    return FilterTypes;
}());

var RenameRootTypes = /** @class */ (function () {
    function RenameRootTypes(renamer) {
        this.renamer = renamer;
        this.map = Object.create(null);
        this.reverseMap = Object.create(null);
    }
    RenameRootTypes.prototype.transformSchema = function (originalSchema) {
        var _a;
        var _this = this;
        return mapSchema(originalSchema, (_a = {},
            _a[exports.MapperKind.ROOT_OBJECT] = function (type) {
                var oldName = type.name;
                var newName = _this.renamer(oldName);
                if (newName !== undefined && newName !== oldName) {
                    _this.map[oldName] = newName;
                    _this.reverseMap[newName] = oldName;
                    return new graphql.GraphQLObjectType(tslib.__assign(tslib.__assign({}, toConfig(type)), { name: newName }));
                }
            },
            _a));
    };
    RenameRootTypes.prototype.transformRequest = function (originalRequest) {
        var _a;
        var _this = this;
        var newDocument = graphql.visit(originalRequest.document, (_a = {},
            _a[graphql.Kind.NAMED_TYPE] = function (node) {
                var name = node.name.value;
                if (name in _this.reverseMap) {
                    return tslib.__assign(tslib.__assign({}, node), { name: {
                            kind: graphql.Kind.NAME,
                            value: _this.reverseMap[name],
                        } });
                }
            },
            _a));
        return {
            document: newDocument,
            variables: originalRequest.variables,
        };
    };
    RenameRootTypes.prototype.transformResult = function (result) {
        return tslib.__assign(tslib.__assign({}, result), { data: this.transformData(result.data) });
    };
    RenameRootTypes.prototype.transformData = function (data) {
        var _this = this;
        if (data == null) {
            return data;
        }
        else if (Array.isArray(data)) {
            return data.map(function (value) { return _this.transformData(value); });
        }
        else if (typeof data === 'object') {
            return this.transformObject(data);
        }
        return data;
    };
    RenameRootTypes.prototype.transformObject = function (object) {
        var _this = this;
        Object.keys(object).forEach(function (key) {
            var value = object[key];
            if (key === '__typename') {
                if (value in _this.map) {
                    object[key] = _this.map[value];
                }
            }
            else {
                object[key] = _this.transformData(value);
            }
        });
        return object;
    };
    return RenameRootTypes;
}());

function isEmptyObject(obj) {
    if (obj == null) {
        return true;
    }
    return Object.keys(obj).length === 0;
}

var TransformCompositeFields = /** @class */ (function () {
    function TransformCompositeFields(fieldTransformer, fieldNodeTransformer) {
        this.fieldTransformer = fieldTransformer;
        this.fieldNodeTransformer = fieldNodeTransformer;
        this.mapping = {};
    }
    TransformCompositeFields.prototype.transformSchema = function (originalSchema) {
        var _a;
        var _this = this;
        this.transformedSchema = mapSchema(originalSchema, (_a = {},
            _a[exports.MapperKind.OBJECT_TYPE] = function (type) {
                return _this.transformFields(type, _this.fieldTransformer);
            },
            _a[exports.MapperKind.INTERFACE_TYPE] = function (type) {
                return _this.transformFields(type, _this.fieldTransformer);
            },
            _a));
        return this.transformedSchema;
    };
    TransformCompositeFields.prototype.transformRequest = function (originalRequest) {
        var fragments = Object.create(null);
        originalRequest.document.definitions
            .filter(function (def) { return def.kind === graphql.Kind.FRAGMENT_DEFINITION; })
            .forEach(function (def) {
            fragments[def.name.value] = def;
        });
        var document = this.transformDocument(originalRequest.document, this.mapping, this.fieldNodeTransformer, fragments);
        return tslib.__assign(tslib.__assign({}, originalRequest), { document: document });
    };
    TransformCompositeFields.prototype.transformFields = function (type, fieldTransformer) {
        var _this = this;
        var typeConfig = toConfig(type);
        var fields = type.getFields();
        var newFields = {};
        Object.keys(fields).forEach(function (fieldName) {
            var field = fields[fieldName];
            var transformedField = fieldTransformer(type.name, fieldName, field);
            if (typeof transformedField === 'undefined') {
                newFields[fieldName] = typeConfig.fields[fieldName];
            }
            else if (transformedField !== null) {
                var newName = transformedField.name;
                if (newName) {
                    newFields[newName] =
                        transformedField.field != null
                            ? transformedField.field
                            : typeConfig.fields[fieldName];
                    if (newName !== fieldName) {
                        var typeName = type.name;
                        if (!(typeName in _this.mapping)) {
                            _this.mapping[typeName] = {};
                        }
                        _this.mapping[typeName][newName] = fieldName;
                    }
                }
                else {
                    newFields[fieldName] = transformedField;
                }
            }
        });
        if (isEmptyObject(newFields)) {
            return null;
        }
        if (graphql.isObjectType(type)) {
            return new graphql.GraphQLObjectType(tslib.__assign(tslib.__assign({}, toConfig(type)), { fields: newFields }));
        }
        else if (graphql.isInterfaceType(type)) {
            return new graphql.GraphQLInterfaceType(tslib.__assign(tslib.__assign({}, toConfig(type)), { fields: newFields }));
        }
    };
    TransformCompositeFields.prototype.transformDocument = function (document, mapping, fieldNodeTransformer, fragments) {
        var _a;
        if (fragments === void 0) { fragments = {}; }
        var typeInfo = new graphql.TypeInfo(this.transformedSchema);
        var newDocument = graphql.visit(document, graphql.visitWithTypeInfo(typeInfo, {
            leave: (_a = {},
                _a[graphql.Kind.SELECTION_SET] = function (node) {
                    var parentType = typeInfo.getParentType();
                    if (parentType != null) {
                        var parentTypeName_1 = parentType.name;
                        var newSelections_1 = [];
                        node.selections.forEach(function (selection) {
                            if (selection.kind !== graphql.Kind.FIELD) {
                                newSelections_1.push(selection);
                                return;
                            }
                            var newName = selection.name.value;
                            var transformedSelection = fieldNodeTransformer != null
                                ? fieldNodeTransformer(parentTypeName_1, newName, selection, fragments)
                                : selection;
                            if (Array.isArray(transformedSelection)) {
                                newSelections_1 = newSelections_1.concat(transformedSelection);
                                return;
                            }
                            if (transformedSelection.kind !== graphql.Kind.FIELD) {
                                newSelections_1.push(transformedSelection);
                                return;
                            }
                            var typeMapping = mapping[parentTypeName_1];
                            if (typeMapping == null) {
                                newSelections_1.push(transformedSelection);
                                return;
                            }
                            var oldName = mapping[parentTypeName_1][newName];
                            if (oldName == null) {
                                newSelections_1.push(transformedSelection);
                                return;
                            }
                            newSelections_1.push(tslib.__assign(tslib.__assign({}, transformedSelection), { name: {
                                    kind: graphql.Kind.NAME,
                                    value: oldName,
                                }, alias: {
                                    kind: graphql.Kind.NAME,
                                    value: newName,
                                } }));
                        });
                        return tslib.__assign(tslib.__assign({}, node), { selections: newSelections_1 });
                    }
                },
                _a),
        }));
        return newDocument;
    };
    return TransformCompositeFields;
}());

var TransformObjectFields = /** @class */ (function () {
    function TransformObjectFields(objectFieldTransformer, fieldNodeTransformer) {
        this.objectFieldTransformer = objectFieldTransformer;
        this.fieldNodeTransformer = fieldNodeTransformer;
    }
    TransformObjectFields.prototype.transformSchema = function (originalSchema) {
        var _this = this;
        var compositeToObjectFieldTransformer = function (typeName, fieldName, field) {
            if (graphql.isObjectType(originalSchema.getType(typeName))) {
                return _this.objectFieldTransformer(typeName, fieldName, field);
            }
            return undefined;
        };
        this.transformer = new TransformCompositeFields(compositeToObjectFieldTransformer, this.fieldNodeTransformer);
        return this.transformer.transformSchema(originalSchema);
    };
    TransformObjectFields.prototype.transformRequest = function (originalRequest) {
        return this.transformer.transformRequest(originalRequest);
    };
    return TransformObjectFields;
}());

var TransformRootFields = /** @class */ (function () {
    function TransformRootFields(rootFieldTransformer, fieldNodeTransformer) {
        var rootToObjectFieldTransformer = function (typeName, fieldName, field) {
            if (typeName === 'Query' ||
                typeName === 'Mutation' ||
                typeName === 'Subscription') {
                return rootFieldTransformer(typeName, fieldName, field);
            }
            return undefined;
        };
        this.transformer = new TransformObjectFields(rootToObjectFieldTransformer, fieldNodeTransformer);
    }
    TransformRootFields.prototype.transformSchema = function (originalSchema) {
        return this.transformer.transformSchema(originalSchema);
    };
    TransformRootFields.prototype.transformRequest = function (originalRequest) {
        return this.transformer.transformRequest(originalRequest);
    };
    return TransformRootFields;
}());

var RenameRootFields = /** @class */ (function () {
    function RenameRootFields(renamer) {
        this.transformer = new TransformRootFields(function (operation, fieldName, field) { return ({
            name: renamer(operation, fieldName, field),
        }); });
    }
    RenameRootFields.prototype.transformSchema = function (originalSchema) {
        return this.transformer.transformSchema(originalSchema);
    };
    RenameRootFields.prototype.transformRequest = function (originalRequest) {
        return this.transformer.transformRequest(originalRequest);
    };
    return RenameRootFields;
}());

var FilterRootFields = /** @class */ (function () {
    function FilterRootFields(filter) {
        this.transformer = new TransformRootFields(function (operation, fieldName, field) {
            if (filter(operation, fieldName, field)) {
                return undefined;
            }
            return null;
        });
    }
    FilterRootFields.prototype.transformSchema = function (originalSchema) {
        return this.transformer.transformSchema(originalSchema);
    };
    return FilterRootFields;
}());

var RenameObjectFields = /** @class */ (function () {
    function RenameObjectFields(renamer) {
        this.transformer = new TransformObjectFields(function (typeName, fieldName, field) { return ({
            name: renamer(typeName, fieldName, field),
        }); });
    }
    RenameObjectFields.prototype.transformSchema = function (originalSchema) {
        return this.transformer.transformSchema(originalSchema);
    };
    RenameObjectFields.prototype.transformRequest = function (originalRequest) {
        return this.transformer.transformRequest(originalRequest);
    };
    return RenameObjectFields;
}());

var FilterObjectFields = /** @class */ (function () {
    function FilterObjectFields(filter) {
        this.transformer = new TransformObjectFields(function (typeName, fieldName, field) {
            return filter(typeName, fieldName, field) ? undefined : null;
        });
    }
    FilterObjectFields.prototype.transformSchema = function (originalSchema) {
        return this.transformer.transformSchema(originalSchema);
    };
    return FilterObjectFields;
}());

var TransformInterfaceFields = /** @class */ (function () {
    function TransformInterfaceFields(interfaceFieldTransformer, fieldNodeTransformer) {
        this.interfaceFieldTransformer = interfaceFieldTransformer;
        this.fieldNodeTransformer = fieldNodeTransformer;
    }
    TransformInterfaceFields.prototype.transformSchema = function (originalSchema) {
        var _this = this;
        var compositeToObjectFieldTransformer = function (typeName, fieldName, field) {
            if (graphql.isInterfaceType(originalSchema.getType(typeName))) {
                return _this.interfaceFieldTransformer(typeName, fieldName, field);
            }
            return undefined;
        };
        this.transformer = new TransformCompositeFields(compositeToObjectFieldTransformer, this.fieldNodeTransformer);
        return this.transformer.transformSchema(originalSchema);
    };
    TransformInterfaceFields.prototype.transformRequest = function (originalRequest) {
        return this.transformer.transformRequest(originalRequest);
    };
    return TransformInterfaceFields;
}());

var RenameInterfaceFields = /** @class */ (function () {
    function RenameInterfaceFields(renamer) {
        this.transformer = new TransformInterfaceFields(function (typeName, fieldName, field) { return ({
            name: renamer(typeName, fieldName, field),
        }); });
    }
    RenameInterfaceFields.prototype.transformSchema = function (originalSchema) {
        return this.transformer.transformSchema(originalSchema);
    };
    RenameInterfaceFields.prototype.transformRequest = function (originalRequest) {
        return this.transformer.transformRequest(originalRequest);
    };
    return RenameInterfaceFields;
}());

var FilterInterfaceFields = /** @class */ (function () {
    function FilterInterfaceFields(filter) {
        this.transformer = new TransformInterfaceFields(function (typeName, fieldName, field) {
            return filter(typeName, fieldName, field) ? undefined : null;
        });
    }
    FilterInterfaceFields.prototype.transformSchema = function (originalSchema) {
        return this.transformer.transformSchema(originalSchema);
    };
    return FilterInterfaceFields;
}());

var TransformQuery = /** @class */ (function () {
    function TransformQuery(_a) {
        var path = _a.path, queryTransformer = _a.queryTransformer, _b = _a.resultTransformer, resultTransformer = _b === void 0 ? function (result) { return result; } : _b, _c = _a.errorPathTransformer, errorPathTransformer = _c === void 0 ? function (errorPath) { return [].concat(errorPath); } : _c, _d = _a.fragments, fragments = _d === void 0 ? {} : _d;
        this.path = path;
        this.queryTransformer = queryTransformer;
        this.resultTransformer = resultTransformer;
        this.errorPathTransformer = errorPathTransformer;
        this.fragments = fragments;
    }
    TransformQuery.prototype.transformRequest = function (originalRequest) {
        var _a;
        var _this = this;
        var document = originalRequest.document;
        var pathLength = this.path.length;
        var index = 0;
        var newDocument = graphql.visit(document, (_a = {},
            _a[graphql.Kind.FIELD] = {
                enter: function (node) {
                    if (index === pathLength || node.name.value !== _this.path[index]) {
                        return false;
                    }
                    index++;
                    if (index === pathLength) {
                        var selectionSet = _this.queryTransformer(node.selectionSet, _this.fragments);
                        return tslib.__assign(tslib.__assign({}, node), { selectionSet: selectionSet });
                    }
                },
                leave: function () {
                    index--;
                },
            },
            _a));
        return tslib.__assign(tslib.__assign({}, originalRequest), { document: newDocument });
    };
    TransformQuery.prototype.transformResult = function (originalResult) {
        var data = this.transformData(originalResult.data);
        var errors = originalResult.errors;
        return {
            data: data,
            errors: errors != null ? this.transformErrors(errors) : undefined,
        };
    };
    TransformQuery.prototype.transformData = function (data) {
        var leafIndex = this.path.length - 1;
        var index = 0;
        var newData = data;
        if (newData) {
            var next = this.path[index];
            while (index < leafIndex) {
                if (data[next]) {
                    newData = newData[next];
                }
                else {
                    break;
                }
                index++;
                next = this.path[index];
            }
            newData[next] = this.resultTransformer(newData[next]);
        }
        return newData;
    };
    TransformQuery.prototype.transformErrors = function (errors) {
        var _this = this;
        return errors.map(function (error) {
            var path = error.path;
            var match = true;
            var index = 0;
            while (index < _this.path.length) {
                if (path[index] !== _this.path[index]) {
                    match = false;
                    break;
                }
                index++;
            }
            var newPath = match
                ? path
                    .slice(0, index)
                    .concat(_this.errorPathTransformer(path.slice(index)))
                : path;
            return new graphql.GraphQLError(error.message, error.nodes, error.source, error.positions, newPath, error.originalError, error.extensions);
        });
    };
    return TransformQuery;
}());

var MapFields = /** @class */ (function () {
    function MapFields(fieldNodeTransformerMap) {
        this.transformer = new TransformObjectFields(function (_typeName, _fieldName, field) { return toConfig(field); }, function (typeName, fieldName, fieldNode, fragments) {
            var typeTransformers = fieldNodeTransformerMap[typeName];
            if (typeTransformers == null) {
                return fieldNode;
            }
            var fieldNodeTransformer = typeTransformers[fieldName];
            if (fieldNodeTransformer == null) {
                return fieldNode;
            }
            return fieldNodeTransformer(fieldNode, fragments);
        });
    }
    MapFields.prototype.transformSchema = function (schema) {
        return this.transformer.transformSchema(schema);
    };
    MapFields.prototype.transformRequest = function (request) {
        return this.transformer.transformRequest(request);
    };
    return MapFields;
}());

var ExtendSchema = /** @class */ (function () {
    function ExtendSchema(_a) {
        var typeDefs = _a.typeDefs, _b = _a.resolvers, resolvers = _b === void 0 ? {} : _b, defaultFieldResolver = _a.defaultFieldResolver, fieldNodeTransformerMap = _a.fieldNodeTransformerMap;
        this.typeDefs = typeDefs;
        this.resolvers = resolvers;
        this.defaultFieldResolver =
            defaultFieldResolver != null
                ? defaultFieldResolver
                : defaultMergedResolver;
        this.transformer = new MapFields(fieldNodeTransformerMap != null ? fieldNodeTransformerMap : {});
    }
    ExtendSchema.prototype.transformSchema = function (schema) {
        this.transformer.transformSchema(schema);
        return addResolversToSchema({
            schema: this.typeDefs
                ? graphql.extendSchema(schema, graphql.parse(this.typeDefs))
                : schema,
            resolvers: this.resolvers != null ? this.resolvers : {},
            defaultFieldResolver: this.defaultFieldResolver,
        });
    };
    ExtendSchema.prototype.transformRequest = function (originalRequest) {
        return this.transformer.transformRequest(originalRequest);
    };
    return ExtendSchema;
}());

function renameFieldNode(fieldNode, name) {
    return tslib.__assign(tslib.__assign({}, fieldNode), { alias: {
            kind: graphql.Kind.NAME,
            value: fieldNode.alias != null ? fieldNode.alias.value : fieldNode.name.value,
        }, name: {
            kind: graphql.Kind.NAME,
            value: name,
        } });
}
function preAliasFieldNode(fieldNode, str) {
    return tslib.__assign(tslib.__assign({}, fieldNode), { alias: {
            kind: graphql.Kind.NAME,
            value: "" + str + (fieldNode.alias != null ? fieldNode.alias.value : fieldNode.name.value),
        } });
}
function wrapFieldNode(fieldNode, path) {
    var newFieldNode = fieldNode;
    path.forEach(function (fieldName) {
        newFieldNode = {
            kind: graphql.Kind.FIELD,
            name: {
                kind: graphql.Kind.NAME,
                value: fieldName,
            },
            selectionSet: {
                kind: graphql.Kind.SELECTION_SET,
                selections: [fieldNode],
            },
        };
    });
    return newFieldNode;
}
function collectFields$1(selectionSet, fragments, fields, visitedFragmentNames) {
    if (fields === void 0) { fields = []; }
    if (visitedFragmentNames === void 0) { visitedFragmentNames = {}; }
    if (selectionSet != null) {
        selectionSet.selections.forEach(function (selection) {
            switch (selection.kind) {
                case graphql.Kind.FIELD:
                    fields.push(selection);
                    break;
                case graphql.Kind.INLINE_FRAGMENT:
                    collectFields$1(selection.selectionSet, fragments, fields, visitedFragmentNames);
                    break;
                case graphql.Kind.FRAGMENT_SPREAD: {
                    var fragmentName = selection.name.value;
                    if (!visitedFragmentNames[fragmentName]) {
                        visitedFragmentNames[fragmentName] = true;
                        collectFields$1(fragments[fragmentName].selectionSet, fragments, fields, visitedFragmentNames);
                    }
                    break;
                }
            }
        });
    }
    return fields;
}
function hoistFieldNodes(_a) {
    var fieldNode = _a.fieldNode, fieldNames = _a.fieldNames, _b = _a.path, path = _b === void 0 ? [] : _b, _c = _a.delimeter, delimeter = _c === void 0 ? '__gqltf__' : _c, fragments = _a.fragments;
    var alias = fieldNode.alias != null ? fieldNode.alias.value : fieldNode.name.value;
    var newFieldNodes = [];
    if (path.length) {
        var remainingPathSegments_1 = path.slice();
        var initialPathSegment_1 = remainingPathSegments_1.shift();
        collectFields$1(fieldNode.selectionSet, fragments).forEach(function (possibleFieldNode) {
            if (possibleFieldNode.name.value === initialPathSegment_1) {
                newFieldNodes = newFieldNodes.concat(hoistFieldNodes({
                    fieldNode: preAliasFieldNode(possibleFieldNode, "" + alias + delimeter),
                    fieldNames: fieldNames,
                    path: remainingPathSegments_1,
                    delimeter: delimeter,
                    fragments: fragments,
                }));
            }
        });
    }
    else {
        collectFields$1(fieldNode.selectionSet, fragments).forEach(function (possibleFieldNode) {
            if (!fieldNames || fieldNames.includes(possibleFieldNode.name.value)) {
                newFieldNodes.push(preAliasFieldNode(possibleFieldNode, "" + alias + delimeter));
            }
        });
    }
    return newFieldNodes;
}

function appendFields(typeMap, typeName, fields) {
    var type = typeMap[typeName];
    if (type != null) {
        var typeConfig = toConfig(type);
        var newFields_1 = toObjMap(typeConfig.fields);
        Object.keys(fields).forEach(function (fieldName) {
            newFields_1[fieldName] = fields[fieldName];
        });
        type = new graphql.GraphQLObjectType(tslib.__assign(tslib.__assign({}, typeConfig), { fields: newFields_1 }));
    }
    else {
        type = new graphql.GraphQLObjectType({
            name: typeName,
            fields: fields,
        });
    }
    typeMap[typeName] = type;
}
function removeFields(typeMap, typeName, testFn) {
    var type = typeMap[typeName];
    var typeConfig = toConfig(type);
    var originalFields = typeConfig.fields;
    var newFields = {};
    var removedFields = {};
    Object.keys(originalFields).forEach(function (fieldName) {
        if (testFn(fieldName, originalFields[fieldName])) {
            removedFields[fieldName] = originalFields[fieldName];
        }
        else {
            newFields[fieldName] = originalFields[fieldName];
        }
    });
    type = new graphql.GraphQLObjectType(tslib.__assign(tslib.__assign({}, typeConfig), { fields: newFields }));
    typeMap[typeName] = type;
    return removedFields;
}

function createMergedResolver(_a) {
    var fromPath = _a.fromPath, dehoist = _a.dehoist, _b = _a.delimeter, delimeter = _b === void 0 ? '__gqltf__' : _b;
    var parentErrorResolver = function (parent, args, context, info) {
        return parent instanceof Error
            ? parent
            : defaultMergedResolver(parent, args, context, info);
    };
    var unwrappingResolver = fromPath != null
        ? function (parent, args, context, info) {
            return parentErrorResolver(unwrapResult(parent, info, fromPath), args, context, info);
        }
        : parentErrorResolver;
    var dehoistingResolver = dehoist
        ? function (parent, args, context, info) {
            return unwrappingResolver(dehoistResult(parent, delimeter), args, context, info);
        }
        : unwrappingResolver;
    var noParentResolver = function (parent, args, context, info) { return (parent ? dehoistingResolver(parent, args, context, info) : {}); };
    return noParentResolver;
}

var WrapFields = /** @class */ (function () {
    function WrapFields(outerTypeName, wrappingFieldNames, wrappingTypeNames, fieldNames) {
        var _a, _b;
        var _this = this;
        this.outerTypeName = outerTypeName;
        this.wrappingFieldNames = wrappingFieldNames;
        this.wrappingTypeNames = wrappingTypeNames;
        this.numWraps = wrappingFieldNames.length;
        this.fieldNames = fieldNames;
        var remainingWrappingFieldNames = this.wrappingFieldNames.slice();
        var outerMostWrappingFieldName = remainingWrappingFieldNames.shift();
        this.transformer = new MapFields((_a = {},
            _a[outerTypeName] = (_b = {},
                _b[outerMostWrappingFieldName] = function (fieldNode, fragments) {
                    return hoistFieldNodes({
                        fieldNode: fieldNode,
                        path: remainingWrappingFieldNames,
                        fieldNames: _this.fieldNames,
                        fragments: fragments,
                    });
                },
                _b),
            _a));
    }
    WrapFields.prototype.transformSchema = function (schema) {
        var _a, _b;
        var _this = this;
        var typeMap = schema.getTypeMap();
        var targetFields = removeFields(typeMap, this.outerTypeName, !this.fieldNames
            ? function () { return true; }
            : function (fieldName) { return _this.fieldNames.includes(fieldName); });
        var wrapIndex = this.numWraps - 1;
        var innerMostWrappingTypeName = this.wrappingTypeNames[wrapIndex];
        appendFields(typeMap, innerMostWrappingTypeName, targetFields);
        for (wrapIndex--; wrapIndex > -1; wrapIndex--) {
            appendFields(typeMap, this.wrappingTypeNames[wrapIndex], (_a = {},
                _a[this.wrappingFieldNames[wrapIndex + 1]] = {
                    type: typeMap[this.wrappingTypeNames[wrapIndex + 1]],
                    resolve: defaultMergedResolver,
                },
                _a));
        }
        appendFields(typeMap, this.outerTypeName, (_b = {},
            _b[this.wrappingFieldNames[0]] = {
                type: typeMap[this.wrappingTypeNames[0]],
                resolve: createMergedResolver({ dehoist: true }),
            },
            _b));
        healSchema(schema);
        return this.transformer.transformSchema(schema);
    };
    WrapFields.prototype.transformRequest = function (originalRequest) {
        return this.transformer.transformRequest(originalRequest);
    };
    return WrapFields;
}());

var WrapType = /** @class */ (function () {
    function WrapType(outerTypeName, innerTypeName, fieldName) {
        this.transformer = new WrapFields(outerTypeName, [fieldName], [innerTypeName], undefined);
    }
    WrapType.prototype.transformSchema = function (schema) {
        return this.transformer.transformSchema(schema);
    };
    WrapType.prototype.transformRequest = function (originalRequest) {
        return this.transformer.transformRequest(originalRequest);
    };
    return WrapType;
}());

var HoistField = /** @class */ (function () {
    function HoistField(typeName, path, newFieldName) {
        var _a, _b;
        var _this = this;
        this.typeName = typeName;
        this.path = path;
        this.newFieldName = newFieldName;
        this.pathToField = this.path.slice();
        this.oldFieldName = this.pathToField.pop();
        this.transformer = new MapFields((_a = {},
            _a[typeName] = (_b = {},
                _b[newFieldName] = function (fieldNode) {
                    return wrapFieldNode(renameFieldNode(fieldNode, _this.oldFieldName), _this.pathToField);
                },
                _b),
            _a));
    }
    HoistField.prototype.transformSchema = function (schema) {
        var _a;
        var _this = this;
        var typeMap = schema.getTypeMap();
        var innerType = this.pathToField.reduce(function (acc, pathSegment) {
            return graphql.getNullableType(acc.getFields()[pathSegment].type);
        }, typeMap[this.typeName]);
        var targetField = removeFields(typeMap, innerType.name, function (fieldName) { return fieldName === _this.oldFieldName; })[this.oldFieldName];
        var targetType = targetField.type;
        appendFields(typeMap, this.typeName, (_a = {},
            _a[this.newFieldName] = {
                type: targetType,
                resolve: createMergedResolver({ fromPath: this.pathToField }),
            },
            _a));
        healSchema(schema);
        return this.transformer.transformSchema(schema);
    };
    HoistField.prototype.transformRequest = function (originalRequest) {
        return this.transformer.transformRequest(originalRequest);
    };
    return HoistField;
}());

var ReplaceFieldWithFragment = /** @class */ (function () {
    function ReplaceFieldWithFragment(targetSchema, fragments) {
        this.targetSchema = targetSchema;
        this.mapping = {};
        for (var _i = 0, fragments_1 = fragments; _i < fragments_1.length; _i++) {
            var _a = fragments_1[_i], field = _a.field, fragment = _a.fragment;
            var parsedFragment = parseFragmentToInlineFragment$1(fragment);
            var actualTypeName = parsedFragment.typeCondition.name.value;
            if (!(actualTypeName in this.mapping)) {
                this.mapping[actualTypeName] = Object.create(null);
            }
            var typeMapping = this.mapping[actualTypeName];
            if (!(field in typeMapping)) {
                typeMapping[field] = [parsedFragment];
            }
            else {
                typeMapping[field].push(parsedFragment);
            }
        }
    }
    ReplaceFieldWithFragment.prototype.transformRequest = function (originalRequest) {
        var document = replaceFieldsWithFragments$1(this.targetSchema, originalRequest.document, this.mapping);
        return tslib.__assign(tslib.__assign({}, originalRequest), { document: document });
    };
    return ReplaceFieldWithFragment;
}());
function replaceFieldsWithFragments$1(targetSchema, document, mapping) {
    var _a;
    var typeInfo = new graphql.TypeInfo(targetSchema);
    return graphql.visit(document, graphql.visitWithTypeInfo(typeInfo, (_a = {},
        _a[graphql.Kind.SELECTION_SET] = function (node) {
            var parentType = typeInfo.getParentType();
            if (parentType != null) {
                var parentTypeName_1 = parentType.name;
                var selections_1 = node.selections;
                if (parentTypeName_1 in mapping) {
                    node.selections.forEach(function (selection) {
                        if (selection.kind === graphql.Kind.FIELD) {
                            var name_1 = selection.name.value;
                            var fragments = mapping[parentTypeName_1][name_1];
                            if (fragments != null && fragments.length > 0) {
                                var fragment = concatInlineFragments(parentTypeName_1, fragments);
                                selections_1 = selections_1.concat(fragment);
                            }
                        }
                    });
                }
                if (selections_1 !== node.selections) {
                    return tslib.__assign(tslib.__assign({}, node), { selections: selections_1 });
                }
            }
        },
        _a)));
}
function parseFragmentToInlineFragment$1(definitions) {
    if (definitions.trim().startsWith('fragment')) {
        var document_1 = graphql.parse(definitions);
        for (var _i = 0, _a = document_1.definitions; _i < _a.length; _i++) {
            var definition = _a[_i];
            if (definition.kind === graphql.Kind.FRAGMENT_DEFINITION) {
                return {
                    kind: graphql.Kind.INLINE_FRAGMENT,
                    typeCondition: definition.typeCondition,
                    selectionSet: definition.selectionSet,
                };
            }
        }
    }
    var query = graphql.parse("{" + definitions + "}")
        .definitions[0];
    for (var _b = 0, _c = query.selectionSet.selections; _b < _c.length; _b++) {
        var selection = _c[_b];
        if (selection.kind === graphql.Kind.INLINE_FRAGMENT) {
            return selection;
        }
    }
    throw new Error('Could not parse fragment');
}

var WrapQuery = /** @class */ (function () {
    function WrapQuery(path, wrapper, extractor) {
        this.path = path;
        this.wrapper = wrapper;
        this.extractor = extractor;
    }
    WrapQuery.prototype.transformRequest = function (originalRequest) {
        var _a;
        var _this = this;
        var document = originalRequest.document;
        var fieldPath = [];
        var ourPath = JSON.stringify(this.path);
        var newDocument = graphql.visit(document, (_a = {},
            _a[graphql.Kind.FIELD] = {
                enter: function (node) {
                    fieldPath.push(node.name.value);
                    if (ourPath === JSON.stringify(fieldPath)) {
                        var wrapResult = _this.wrapper(node.selectionSet);
                        // Selection can be either a single selection or a selection set. If it's just one selection,
                        // let's wrap it in a selection set. Otherwise, keep it as is.
                        var selectionSet = wrapResult != null && wrapResult.kind === graphql.Kind.SELECTION_SET
                            ? wrapResult
                            : {
                                kind: graphql.Kind.SELECTION_SET,
                                selections: [wrapResult],
                            };
                        return tslib.__assign(tslib.__assign({}, node), { selectionSet: selectionSet });
                    }
                },
                leave: function () {
                    fieldPath.pop();
                },
            },
            _a));
        return tslib.__assign(tslib.__assign({}, originalRequest), { document: newDocument });
    };
    WrapQuery.prototype.transformResult = function (originalResult) {
        var rootData = originalResult.data;
        if (rootData != null) {
            var data = rootData;
            var path = tslib.__spreadArrays(this.path);
            while (path.length > 1) {
                var next = path.shift();
                if (data[next]) {
                    data = data[next];
                }
            }
            data[path[0]] = this.extractor(data[path[0]]);
        }
        return {
            data: rootData,
            errors: originalResult.errors,
        };
    };
    return WrapQuery;
}());

var ExtractField = /** @class */ (function () {
    function ExtractField(_a) {
        var from = _a.from, to = _a.to;
        this.from = from;
        this.to = to;
    }
    ExtractField.prototype.transformRequest = function (originalRequest) {
        var _a, _b;
        var fromSelection;
        var ourPathFrom = JSON.stringify(this.from);
        var ourPathTo = JSON.stringify(this.to);
        var fieldPath = [];
        graphql.visit(originalRequest.document, (_a = {},
            _a[graphql.Kind.FIELD] = {
                enter: function (node) {
                    fieldPath.push(node.name.value);
                    if (ourPathFrom === JSON.stringify(fieldPath)) {
                        fromSelection = node.selectionSet;
                        return graphql.BREAK;
                    }
                },
                leave: function () {
                    fieldPath.pop();
                },
            },
            _a));
        fieldPath = [];
        var newDocument = graphql.visit(originalRequest.document, (_b = {},
            _b[graphql.Kind.FIELD] = {
                enter: function (node) {
                    fieldPath.push(node.name.value);
                    if (ourPathTo === JSON.stringify(fieldPath) &&
                        fromSelection != null) {
                        return tslib.__assign(tslib.__assign({}, node), { selectionSet: fromSelection });
                    }
                },
                leave: function () {
                    fieldPath.pop();
                },
            },
            _b));
        return tslib.__assign(tslib.__assign({}, originalRequest), { document: newDocument });
    };
    return ExtractField;
}());

function makeRemoteExecutableSchema(_a) {
    var schemaOrTypeDefs = _a.schema, link = _a.link, fetcher = _a.fetcher, _b = _a.createResolver, createResolver = _b === void 0 ? defaultCreateRemoteResolver : _b, _c = _a.createSubscriptionResolver, createSubscriptionResolver = _c === void 0 ? defaultCreateRemoteSubscriptionResolver : _c, buildSchemaOptions = _a.buildSchemaOptions;
    var finalFetcher = fetcher;
    if (finalFetcher == null && link != null) {
        finalFetcher = linkToFetcher(link);
    }
    var targetSchema = typeof schemaOrTypeDefs === 'string'
        ? buildSchema(schemaOrTypeDefs, buildSchemaOptions)
        : schemaOrTypeDefs;
    return wrapSchema({
        schema: targetSchema,
        createProxyingResolver: function (_schema, _transforms, operation) {
            if (operation === 'query' || operation === 'mutation') {
                return createResolver(finalFetcher);
            }
            return createSubscriptionResolver(link);
        },
    });
}
function defaultCreateRemoteResolver(fetcher) {
    return function (_parent, _args, context, info) {
        return delegateToSchema({
            schema: { schema: info.schema, fetcher: fetcher },
            context: context,
            info: info,
        });
    };
}
function defaultCreateRemoteSubscriptionResolver(link) {
    return function (_parent, _args, context, info) {
        return delegateToSchema({
            schema: { schema: info.schema, link: link },
            context: context,
            info: info,
        });
    };
}

exports.AddArgumentsAsVariables = AddArgumentsAsVariables;
exports.AddMergedTypeSelectionSets = AddMergedTypeFragments;
exports.AddReplacementFragments = AddReplacementFragments;
exports.AddReplacementSelectionSets = AddReplacementSelectionSets;
exports.AddTypenameToAbstract = AddTypenameToAbstract;
exports.AwaitVariablesLink = AwaitVariablesLink;
exports.CheckResultAndHandleErrors = CheckResultAndHandleErrors;
exports.ExpandAbstractTypes = ExpandAbstractTypes;
exports.ExtendSchema = ExtendSchema;
exports.ExtractField = ExtractField;
exports.FilterInterfaceFields = FilterInterfaceFields;
exports.FilterObjectFields = FilterObjectFields;
exports.FilterRootFields = FilterRootFields;
exports.FilterToSchema = FilterToSchema;
exports.FilterTypes = FilterTypes;
exports.GraphQLUpload = GraphQLUpload;
exports.HoistField = HoistField;
exports.MapFields = MapFields;
exports.MockList = MockList;
exports.RenameInterfaceFields = RenameInterfaceFields;
exports.RenameObjectFields = RenameObjectFields;
exports.RenameRootFields = RenameRootFields;
exports.RenameRootTypes = RenameRootTypes;
exports.RenameTypes = RenameTypes;
exports.ReplaceFieldWithFragment = ReplaceFieldWithFragment;
exports.SchemaDirectiveVisitor = SchemaDirectiveVisitor;
exports.SchemaError = SchemaError;
exports.SchemaVisitor = SchemaVisitor;
exports.TransformCompositeFields = TransformCompositeFields;
exports.TransformInterfaceFields = TransformInterfaceFields;
exports.TransformObjectFields = TransformObjectFields;
exports.TransformQuery = TransformQuery;
exports.TransformRootFields = TransformRootFields;
exports.WrapFields = WrapFields;
exports.WrapQuery = WrapQuery;
exports.WrapType = WrapType;
exports.addCatchUndefinedToSchema = addCatchUndefinedToSchema;
exports.addErrorLoggingToSchema = addErrorLoggingToSchema;
exports.addMockFunctionsToSchema = addMockFunctionsToSchema;
exports.addMocksToSchema = addMocksToSchema;
exports.addResolveFunctionsToSchema = addResolveFunctionsToSchema;
exports.addResolversToSchema = addResolversToSchema;
exports.addSchemaLevelResolveFunction = addSchemaLevelResolveFunction;
exports.addSchemaLevelResolver = addSchemaLevelResolver;
exports.argumentMapToConfig = argumentMapToConfig;
exports.argumentToConfig = argumentToConfig;
exports.assertResolveFunctionsPresent = assertResolveFunctionsPresent;
exports.assertResolversPresent = assertResolversPresent;
exports.attachConnectorsToContext = attachConnectorsToContext;
exports.attachDirectiveResolvers = attachDirectiveResolvers;
exports.buildSchema = buildSchema;
exports.buildSchemaFromTypeDefinitions = buildSchemaFromTypeDefinitions;
exports.chainResolvers = chainResolvers;
exports.checkForResolveTypeResolver = checkForResolveTypeResolver;
exports.cloneDirective = cloneDirective;
exports.cloneSchema = cloneSchema;
exports.cloneType = cloneType;
exports.concatenateTypeDefs = concatenateTypeDefs;
exports.createRequest = createRequest;
exports.createRequestFromInfo = createRequestFromInfo;
exports.createServerHttpLink = createServerHttpLink;
exports.decorateWithLogger = decorateWithLogger;
exports.defaultCreateProxyingResolver = defaultCreateProxyingResolver;
exports.defaultCreateRemoteResolver = defaultCreateRemoteResolver;
exports.defaultCreateRemoteSubscriptionResolver = defaultCreateRemoteSubscriptionResolver;
exports.defaultMergedResolver = defaultMergedResolver;
exports.delegateRequest = delegateRequest;
exports.delegateToSchema = delegateToSchema;
exports.directiveToConfig = directiveToConfig;
exports.enumTypeToConfig = enumTypeToConfig;
exports.extendResolversFromInterfaces = extendResolversFromInterfaces;
exports.extendSchema = extendSchema;
exports.extractExtensionDefinitions = extractExtensionDefinitions;
exports.fieldMapToConfig = fieldMapToConfig;
exports.fieldToConfig = fieldToConfig;
exports.filterExtensionDefinitions = filterExtensionDefinitions;
exports.filterSchema = filterSchema;
exports.forEachDefaultValue = forEachDefaultValue;
exports.forEachField = forEachField;
exports.generateProxyingResolvers = generateProxyingResolvers;
exports.getResolversFromSchema = getResolversFromSchema;
exports.graphqlVersion = graphqlVersion;
exports.handleResult = handleResult;
exports.healSchema = healSchema;
exports.healTypes = healTypes;
exports.inputFieldMapToConfig = inputFieldMapToConfig;
exports.inputFieldToConfig = inputFieldToConfig;
exports.inputObjectTypeToConfig = inputObjectTypeToConfig;
exports.interfaceTypeToConfig = interfaceTypeToConfig;
exports.introspectSchema = introspectSchema;
exports.isSpecifiedScalarType = isSpecifiedScalarType;
exports.isSubschemaConfig = isSubschemaConfig;
exports.makeExecutableSchema = makeExecutableSchema;
exports.makeRemoteExecutableSchema = makeRemoteExecutableSchema;
exports.mapSchema = mapSchema;
exports.mergeSchemas = mergeSchemas;
exports.mockServer = mockServer;
exports.objectTypeToConfig = objectTypeToConfig;
exports.scalarTypeToConfig = scalarTypeToConfig;
exports.schemaToConfig = schemaToConfig;
exports.toConfig = toConfig;
exports.transformSchema = transformSchema;
exports.typeToConfig = typeToConfig;
exports.unionTypeToConfig = unionTypeToConfig;
exports.visitSchema = visitSchema;
exports.wrapSchema = wrapSchema;
//# sourceMappingURL=index.cjs.js.map
