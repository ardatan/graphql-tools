import { __read, __spreadArray, __values } from "tslib";
import { print, Kind, isSpecifiedScalarType, isIntrospectionType, isSpecifiedDirective, astFromValue, GraphQLDeprecatedDirective, isObjectType, isInterfaceType, isUnionType, isInputObjectType, isEnumType, isScalarType, } from 'graphql';
import { astFromType } from './astFromType';
import { getDirectivesInExtensions } from './get-directives';
import { astFromValueUntyped } from './astFromValueUntyped';
import { isSome } from './helpers';
import { getRootTypeMap } from './rootTypes';
export function getDocumentNodeFromSchema(schema, options) {
    var e_1, _a;
    if (options === void 0) { options = {}; }
    var pathToDirectivesInExtensions = options.pathToDirectivesInExtensions;
    var typesMap = schema.getTypeMap();
    var schemaNode = astFromSchema(schema, pathToDirectivesInExtensions);
    var definitions = schemaNode != null ? [schemaNode] : [];
    var directives = schema.getDirectives();
    try {
        for (var directives_1 = __values(directives), directives_1_1 = directives_1.next(); !directives_1_1.done; directives_1_1 = directives_1.next()) {
            var directive = directives_1_1.value;
            if (isSpecifiedDirective(directive)) {
                continue;
            }
            definitions.push(astFromDirective(directive, schema, pathToDirectivesInExtensions));
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (directives_1_1 && !directives_1_1.done && (_a = directives_1.return)) _a.call(directives_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    for (var typeName in typesMap) {
        var type = typesMap[typeName];
        var isPredefinedScalar = isSpecifiedScalarType(type);
        var isIntrospection = isIntrospectionType(type);
        if (isPredefinedScalar || isIntrospection) {
            continue;
        }
        if (isObjectType(type)) {
            definitions.push(astFromObjectType(type, schema, pathToDirectivesInExtensions));
        }
        else if (isInterfaceType(type)) {
            definitions.push(astFromInterfaceType(type, schema, pathToDirectivesInExtensions));
        }
        else if (isUnionType(type)) {
            definitions.push(astFromUnionType(type, schema, pathToDirectivesInExtensions));
        }
        else if (isInputObjectType(type)) {
            definitions.push(astFromInputObjectType(type, schema, pathToDirectivesInExtensions));
        }
        else if (isEnumType(type)) {
            definitions.push(astFromEnumType(type, schema, pathToDirectivesInExtensions));
        }
        else if (isScalarType(type)) {
            definitions.push(astFromScalarType(type, schema, pathToDirectivesInExtensions));
        }
        else {
            throw new Error("Unknown type " + type + ".");
        }
    }
    return {
        kind: Kind.DOCUMENT,
        definitions: definitions,
    };
}
// this approach uses the default schema printer rather than a custom solution, so may be more backwards compatible
// currently does not allow customization of printSchema options having to do with comments.
export function printSchemaWithDirectives(schema, options) {
    if (options === void 0) { options = {}; }
    var documentNode = getDocumentNodeFromSchema(schema, options);
    return print(documentNode);
}
export function astFromSchema(schema, pathToDirectivesInExtensions) {
    var e_2, _a, e_3, _b, e_4, _c, e_5, _d;
    var _e, _f;
    var operationTypeMap = new Map([
        ['query', undefined],
        ['mutation', undefined],
        ['subscription', undefined],
    ]);
    var nodes = [];
    if (schema.astNode != null) {
        nodes.push(schema.astNode);
    }
    if (schema.extensionASTNodes != null) {
        try {
            for (var _g = __values(schema.extensionASTNodes), _h = _g.next(); !_h.done; _h = _g.next()) {
                var extensionASTNode = _h.value;
                nodes.push(extensionASTNode);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_h && !_h.done && (_a = _g.return)) _a.call(_g);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    try {
        for (var nodes_1 = __values(nodes), nodes_1_1 = nodes_1.next(); !nodes_1_1.done; nodes_1_1 = nodes_1.next()) {
            var node = nodes_1_1.value;
            if (node.operationTypes) {
                try {
                    for (var _j = (e_4 = void 0, __values(node.operationTypes)), _k = _j.next(); !_k.done; _k = _j.next()) {
                        var operationTypeDefinitionNode = _k.value;
                        operationTypeMap.set(operationTypeDefinitionNode.operation, operationTypeDefinitionNode);
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_k && !_k.done && (_c = _j.return)) _c.call(_j);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
            }
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (nodes_1_1 && !nodes_1_1.done && (_b = nodes_1.return)) _b.call(nodes_1);
        }
        finally { if (e_3) throw e_3.error; }
    }
    var rootTypeMap = getRootTypeMap(schema);
    try {
        for (var operationTypeMap_1 = __values(operationTypeMap), operationTypeMap_1_1 = operationTypeMap_1.next(); !operationTypeMap_1_1.done; operationTypeMap_1_1 = operationTypeMap_1.next()) {
            var _l = __read(operationTypeMap_1_1.value, 2), operationTypeNode = _l[0], operationTypeDefinitionNode = _l[1];
            var rootType = rootTypeMap.get(operationTypeNode);
            if (rootType != null) {
                var rootTypeAST = astFromType(rootType);
                if (operationTypeDefinitionNode != null) {
                    operationTypeDefinitionNode.type = rootTypeAST;
                }
                else {
                    operationTypeMap.set(operationTypeNode, {
                        kind: Kind.OPERATION_TYPE_DEFINITION,
                        operation: operationTypeNode,
                        type: rootTypeAST,
                    });
                }
            }
        }
    }
    catch (e_5_1) { e_5 = { error: e_5_1 }; }
    finally {
        try {
            if (operationTypeMap_1_1 && !operationTypeMap_1_1.done && (_d = operationTypeMap_1.return)) _d.call(operationTypeMap_1);
        }
        finally { if (e_5) throw e_5.error; }
    }
    var operationTypes = __spreadArray([], __read(operationTypeMap.values()), false).filter(isSome);
    var directives = getDirectiveNodes(schema, schema, pathToDirectivesInExtensions);
    if (!operationTypes.length && !directives.length) {
        return null;
    }
    var schemaNode = {
        kind: operationTypes != null ? Kind.SCHEMA_DEFINITION : Kind.SCHEMA_EXTENSION,
        operationTypes: operationTypes,
        // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
        directives: directives,
    };
    // This code is so weird because it needs to support GraphQL.js 14
    // In GraphQL.js 14 there is no `description` value on schemaNode
    schemaNode.description =
        ((_f = (_e = schema.astNode) === null || _e === void 0 ? void 0 : _e.description) !== null && _f !== void 0 ? _f : schema.description != null)
            ? {
                kind: Kind.STRING,
                value: schema.description,
                block: true,
            }
            : undefined;
    return schemaNode;
}
export function astFromDirective(directive, schema, pathToDirectivesInExtensions) {
    var _a, _b, _c, _d;
    return {
        kind: Kind.DIRECTIVE_DEFINITION,
        description: (_b = (_a = directive.astNode) === null || _a === void 0 ? void 0 : _a.description) !== null && _b !== void 0 ? _b : (directive.description
            ? {
                kind: Kind.STRING,
                value: directive.description,
            }
            : undefined),
        name: {
            kind: Kind.NAME,
            value: directive.name,
        },
        arguments: (_c = directive.args) === null || _c === void 0 ? void 0 : _c.map(function (arg) { return astFromArg(arg, schema, pathToDirectivesInExtensions); }),
        repeatable: directive.isRepeatable,
        locations: ((_d = directive.locations) === null || _d === void 0 ? void 0 : _d.map(function (location) { return ({
            kind: Kind.NAME,
            value: location,
        }); })) || [],
    };
}
export function getDirectiveNodes(entity, schema, pathToDirectivesInExtensions) {
    var e_6, _a;
    var directivesInExtensions = getDirectivesInExtensions(entity, pathToDirectivesInExtensions);
    var nodes = [];
    if (entity.astNode != null) {
        nodes.push(entity.astNode);
    }
    if ('extensionASTNodes' in entity && entity.extensionASTNodes != null) {
        nodes = nodes.concat(entity.extensionASTNodes);
    }
    var directives;
    if (directivesInExtensions != null) {
        directives = makeDirectiveNodes(schema, directivesInExtensions);
    }
    else {
        directives = [];
        try {
            for (var nodes_2 = __values(nodes), nodes_2_1 = nodes_2.next(); !nodes_2_1.done; nodes_2_1 = nodes_2.next()) {
                var node = nodes_2_1.value;
                if (node.directives) {
                    directives.push.apply(directives, __spreadArray([], __read(node.directives), false));
                }
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (nodes_2_1 && !nodes_2_1.done && (_a = nodes_2.return)) _a.call(nodes_2);
            }
            finally { if (e_6) throw e_6.error; }
        }
    }
    return directives;
}
export function getDeprecatableDirectiveNodes(entity, schema, pathToDirectivesInExtensions) {
    var _a, _b;
    var directiveNodesBesidesDeprecated = [];
    var deprecatedDirectiveNode = null;
    var directivesInExtensions = getDirectivesInExtensions(entity, pathToDirectivesInExtensions);
    var directives;
    if (directivesInExtensions != null) {
        directives = makeDirectiveNodes(schema, directivesInExtensions);
    }
    else {
        directives = (_a = entity.astNode) === null || _a === void 0 ? void 0 : _a.directives;
    }
    if (directives != null) {
        directiveNodesBesidesDeprecated = directives.filter(function (directive) { return directive.name.value !== 'deprecated'; });
        if (entity.deprecationReason != null) {
            deprecatedDirectiveNode = (_b = directives.filter(function (directive) { return directive.name.value === 'deprecated'; })) === null || _b === void 0 ? void 0 : _b[0];
        }
    }
    if (entity.deprecationReason != null &&
        deprecatedDirectiveNode == null) {
        deprecatedDirectiveNode = makeDeprecatedDirective(entity.deprecationReason);
    }
    return deprecatedDirectiveNode == null
        ? directiveNodesBesidesDeprecated
        : [deprecatedDirectiveNode].concat(directiveNodesBesidesDeprecated);
}
export function astFromArg(arg, schema, pathToDirectivesInExtensions) {
    var _a, _b, _c;
    return {
        kind: Kind.INPUT_VALUE_DEFINITION,
        description: (_b = (_a = arg.astNode) === null || _a === void 0 ? void 0 : _a.description) !== null && _b !== void 0 ? _b : (arg.description
            ? {
                kind: Kind.STRING,
                value: arg.description,
                block: true,
            }
            : undefined),
        name: {
            kind: Kind.NAME,
            value: arg.name,
        },
        type: astFromType(arg.type),
        // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
        defaultValue: arg.defaultValue !== undefined ? (_c = astFromValue(arg.defaultValue, arg.type)) !== null && _c !== void 0 ? _c : undefined : undefined,
        directives: getDeprecatableDirectiveNodes(arg, schema, pathToDirectivesInExtensions),
    };
}
export function astFromObjectType(type, schema, pathToDirectivesInExtensions) {
    var _a, _b;
    return {
        kind: Kind.OBJECT_TYPE_DEFINITION,
        description: (_b = (_a = type.astNode) === null || _a === void 0 ? void 0 : _a.description) !== null && _b !== void 0 ? _b : (type.description
            ? {
                kind: Kind.STRING,
                value: type.description,
                block: true,
            }
            : undefined),
        name: {
            kind: Kind.NAME,
            value: type.name,
        },
        fields: Object.values(type.getFields()).map(function (field) { return astFromField(field, schema, pathToDirectivesInExtensions); }),
        interfaces: Object.values(type.getInterfaces()).map(function (iFace) { return astFromType(iFace); }),
        directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions),
    };
}
export function astFromInterfaceType(type, schema, pathToDirectivesInExtensions) {
    var _a, _b;
    var node = {
        kind: Kind.INTERFACE_TYPE_DEFINITION,
        description: (_b = (_a = type.astNode) === null || _a === void 0 ? void 0 : _a.description) !== null && _b !== void 0 ? _b : (type.description
            ? {
                kind: Kind.STRING,
                value: type.description,
                block: true,
            }
            : undefined),
        name: {
            kind: Kind.NAME,
            value: type.name,
        },
        fields: Object.values(type.getFields()).map(function (field) { return astFromField(field, schema, pathToDirectivesInExtensions); }),
        directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions),
    };
    if ('getInterfaces' in type) {
        node.interfaces = Object.values(type.getInterfaces()).map(function (iFace) { return astFromType(iFace); });
    }
    return node;
}
export function astFromUnionType(type, schema, pathToDirectivesInExtensions) {
    var _a, _b;
    return {
        kind: Kind.UNION_TYPE_DEFINITION,
        description: (_b = (_a = type.astNode) === null || _a === void 0 ? void 0 : _a.description) !== null && _b !== void 0 ? _b : (type.description
            ? {
                kind: Kind.STRING,
                value: type.description,
                block: true,
            }
            : undefined),
        name: {
            kind: Kind.NAME,
            value: type.name,
        },
        // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
        directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions),
        types: type.getTypes().map(function (type) { return astFromType(type); }),
    };
}
export function astFromInputObjectType(type, schema, pathToDirectivesInExtensions) {
    var _a, _b;
    return {
        kind: Kind.INPUT_OBJECT_TYPE_DEFINITION,
        description: (_b = (_a = type.astNode) === null || _a === void 0 ? void 0 : _a.description) !== null && _b !== void 0 ? _b : (type.description
            ? {
                kind: Kind.STRING,
                value: type.description,
                block: true,
            }
            : undefined),
        name: {
            kind: Kind.NAME,
            value: type.name,
        },
        fields: Object.values(type.getFields()).map(function (field) {
            return astFromInputField(field, schema, pathToDirectivesInExtensions);
        }),
        // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
        directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions),
    };
}
export function astFromEnumType(type, schema, pathToDirectivesInExtensions) {
    var _a, _b;
    return {
        kind: Kind.ENUM_TYPE_DEFINITION,
        description: (_b = (_a = type.astNode) === null || _a === void 0 ? void 0 : _a.description) !== null && _b !== void 0 ? _b : (type.description
            ? {
                kind: Kind.STRING,
                value: type.description,
                block: true,
            }
            : undefined),
        name: {
            kind: Kind.NAME,
            value: type.name,
        },
        values: Object.values(type.getValues()).map(function (value) { return astFromEnumValue(value, schema, pathToDirectivesInExtensions); }),
        // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
        directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions),
    };
}
export function astFromScalarType(type, schema, pathToDirectivesInExtensions) {
    var _a, _b, _c;
    var directivesInExtensions = getDirectivesInExtensions(type, pathToDirectivesInExtensions);
    var directives = directivesInExtensions
        ? makeDirectiveNodes(schema, directivesInExtensions)
        : ((_a = type.astNode) === null || _a === void 0 ? void 0 : _a.directives) || [];
    if (type['specifiedByUrl'] &&
        !directives.some(function (directiveNode) { return directiveNode.name.value === 'specifiedBy'; })) {
        var specifiedByArgs = {
            url: type['specifiedByUrl'],
        };
        directives.push(makeDirectiveNode('specifiedBy', specifiedByArgs));
    }
    return {
        kind: Kind.SCALAR_TYPE_DEFINITION,
        description: (_c = (_b = type.astNode) === null || _b === void 0 ? void 0 : _b.description) !== null && _c !== void 0 ? _c : (type.description
            ? {
                kind: Kind.STRING,
                value: type.description,
                block: true,
            }
            : undefined),
        name: {
            kind: Kind.NAME,
            value: type.name,
        },
        // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
        directives: directives,
    };
}
export function astFromField(field, schema, pathToDirectivesInExtensions) {
    var _a, _b;
    return {
        kind: Kind.FIELD_DEFINITION,
        description: (_b = (_a = field.astNode) === null || _a === void 0 ? void 0 : _a.description) !== null && _b !== void 0 ? _b : (field.description
            ? {
                kind: Kind.STRING,
                value: field.description,
                block: true,
            }
            : undefined),
        name: {
            kind: Kind.NAME,
            value: field.name,
        },
        arguments: field.args.map(function (arg) { return astFromArg(arg, schema, pathToDirectivesInExtensions); }),
        type: astFromType(field.type),
        // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
        directives: getDeprecatableDirectiveNodes(field, schema, pathToDirectivesInExtensions),
    };
}
export function astFromInputField(field, schema, pathToDirectivesInExtensions) {
    var _a, _b, _c;
    return {
        kind: Kind.INPUT_VALUE_DEFINITION,
        description: (_b = (_a = field.astNode) === null || _a === void 0 ? void 0 : _a.description) !== null && _b !== void 0 ? _b : (field.description
            ? {
                kind: Kind.STRING,
                value: field.description,
                block: true,
            }
            : undefined),
        name: {
            kind: Kind.NAME,
            value: field.name,
        },
        type: astFromType(field.type),
        // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
        directives: getDeprecatableDirectiveNodes(field, schema, pathToDirectivesInExtensions),
        defaultValue: (_c = astFromValue(field.defaultValue, field.type)) !== null && _c !== void 0 ? _c : undefined,
    };
}
export function astFromEnumValue(value, schema, pathToDirectivesInExtensions) {
    var _a, _b;
    return {
        kind: Kind.ENUM_VALUE_DEFINITION,
        description: (_b = (_a = value.astNode) === null || _a === void 0 ? void 0 : _a.description) !== null && _b !== void 0 ? _b : (value.description
            ? {
                kind: Kind.STRING,
                value: value.description,
                block: true,
            }
            : undefined),
        name: {
            kind: Kind.NAME,
            value: value.name,
        },
        // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
        directives: getDirectiveNodes(value, schema, pathToDirectivesInExtensions),
    };
}
export function makeDeprecatedDirective(deprecationReason) {
    return makeDirectiveNode('deprecated', { reason: deprecationReason }, GraphQLDeprecatedDirective);
}
export function makeDirectiveNode(name, args, directive) {
    var e_7, _a;
    var directiveArguments = [];
    if (directive != null) {
        try {
            for (var _b = __values(directive.args), _c = _b.next(); !_c.done; _c = _b.next()) {
                var arg = _c.value;
                var argName = arg.name;
                var argValue = args[argName];
                if (argValue !== undefined) {
                    var value = astFromValue(argValue, arg.type);
                    if (value) {
                        directiveArguments.push({
                            kind: Kind.ARGUMENT,
                            name: {
                                kind: Kind.NAME,
                                value: argName,
                            },
                            value: value,
                        });
                    }
                }
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_7) throw e_7.error; }
        }
    }
    else {
        for (var argName in args) {
            var argValue = args[argName];
            var value = astFromValueUntyped(argValue);
            if (value) {
                directiveArguments.push({
                    kind: Kind.ARGUMENT,
                    name: {
                        kind: Kind.NAME,
                        value: argName,
                    },
                    value: value,
                });
            }
        }
    }
    return {
        kind: Kind.DIRECTIVE,
        name: {
            kind: Kind.NAME,
            value: name,
        },
        arguments: directiveArguments,
    };
}
export function makeDirectiveNodes(schema, directiveValues) {
    var e_8, _a;
    var directiveNodes = [];
    for (var directiveName in directiveValues) {
        var arrayOrSingleValue = directiveValues[directiveName];
        var directive = schema === null || schema === void 0 ? void 0 : schema.getDirective(directiveName);
        if (Array.isArray(arrayOrSingleValue)) {
            try {
                for (var arrayOrSingleValue_1 = (e_8 = void 0, __values(arrayOrSingleValue)), arrayOrSingleValue_1_1 = arrayOrSingleValue_1.next(); !arrayOrSingleValue_1_1.done; arrayOrSingleValue_1_1 = arrayOrSingleValue_1.next()) {
                    var value = arrayOrSingleValue_1_1.value;
                    directiveNodes.push(makeDirectiveNode(directiveName, value, directive));
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (arrayOrSingleValue_1_1 && !arrayOrSingleValue_1_1.done && (_a = arrayOrSingleValue_1.return)) _a.call(arrayOrSingleValue_1);
                }
                finally { if (e_8) throw e_8.error; }
            }
        }
        else {
            directiveNodes.push(makeDirectiveNode(directiveName, arrayOrSingleValue, directive));
        }
    }
    return directiveNodes;
}
