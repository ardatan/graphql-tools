import { __assign, __values } from "tslib";
import { GraphQLEnumType, GraphQLInputObjectType, GraphQLInterfaceType, GraphQLObjectType, GraphQLScalarType, GraphQLUnionType, Kind, GraphQLDirective, DirectiveLocation, valueFromASTUntyped, getDirectiveValues, GraphQLDeprecatedDirective, } from 'graphql';
import { createStub, createNamedStub, getDescription } from '@graphql-tools/utils';
var backcompatOptions = { commentDescriptions: true };
export default typeFromAST;
function typeFromAST(node) {
    switch (node.kind) {
        case Kind.OBJECT_TYPE_DEFINITION:
            return makeObjectType(node);
        case Kind.INTERFACE_TYPE_DEFINITION:
            return makeInterfaceType(node);
        case Kind.ENUM_TYPE_DEFINITION:
            return makeEnumType(node);
        case Kind.UNION_TYPE_DEFINITION:
            return makeUnionType(node);
        case Kind.SCALAR_TYPE_DEFINITION:
            return makeScalarType(node);
        case Kind.INPUT_OBJECT_TYPE_DEFINITION:
            return makeInputObjectType(node);
        case Kind.DIRECTIVE_DEFINITION:
            return makeDirective(node);
        default:
            return null;
    }
}
function makeObjectType(node) {
    var config = {
        name: node.name.value,
        description: getDescription(node, backcompatOptions),
        interfaces: function () { var _a; return ((_a = node.interfaces) === null || _a === void 0 ? void 0 : _a.map(function (iface) { return createNamedStub(iface.name.value, 'interface'); })) || []; },
        fields: function () { return (node.fields != null ? makeFields(node.fields) : {}); },
        astNode: node,
    };
    return new GraphQLObjectType(config);
}
function makeInterfaceType(node) {
    var config = {
        name: node.name.value,
        description: getDescription(node, backcompatOptions),
        interfaces: function () {
            var _a;
            return (_a = node.interfaces) === null || _a === void 0 ? void 0 : _a.map(function (iface) {
                return createNamedStub(iface.name.value, 'interface');
            });
        },
        fields: function () { return (node.fields != null ? makeFields(node.fields) : {}); },
        astNode: node,
    };
    return new GraphQLInterfaceType(config);
}
function makeEnumType(node) {
    var _a, _b;
    var values = (_b = (_a = node.values) === null || _a === void 0 ? void 0 : _a.reduce(function (prev, value) {
        var _a;
        return (__assign(__assign({}, prev), (_a = {}, _a[value.name.value] = {
            description: getDescription(value, backcompatOptions),
            deprecationReason: getDeprecationReason(value),
            astNode: value,
        }, _a)));
    }, {})) !== null && _b !== void 0 ? _b : {};
    return new GraphQLEnumType({
        name: node.name.value,
        description: getDescription(node, backcompatOptions),
        values: values,
        astNode: node,
    });
}
function makeUnionType(node) {
    return new GraphQLUnionType({
        name: node.name.value,
        description: getDescription(node, backcompatOptions),
        types: function () { var _a, _b; return (_b = (_a = node.types) === null || _a === void 0 ? void 0 : _a.map(function (type) { return createNamedStub(type.name.value, 'object'); })) !== null && _b !== void 0 ? _b : []; },
        astNode: node,
    });
}
function makeScalarType(node) {
    return new GraphQLScalarType({
        name: node.name.value,
        description: getDescription(node, backcompatOptions),
        astNode: node,
        // TODO: serialize default property setting can be dropped once
        // upstream graphql-js TypeScript typings are updated, likely in v16
        serialize: function (value) { return value; },
    });
}
function makeInputObjectType(node) {
    return new GraphQLInputObjectType({
        name: node.name.value,
        description: getDescription(node, backcompatOptions),
        fields: function () { return (node.fields ? makeValues(node.fields) : {}); },
        astNode: node,
    });
}
function makeFields(nodes) {
    return nodes.reduce(function (prev, node) {
        var _a;
        var _b;
        return (__assign(__assign({}, prev), (_a = {}, _a[node.name.value] = {
            type: createStub(node.type, 'output'),
            description: getDescription(node, backcompatOptions),
            args: makeValues((_b = node.arguments) !== null && _b !== void 0 ? _b : []),
            deprecationReason: getDeprecationReason(node),
            astNode: node,
        }, _a)));
    }, {});
}
function makeValues(nodes) {
    return nodes.reduce(function (prev, node) {
        var _a;
        return (__assign(__assign({}, prev), (_a = {}, _a[node.name.value] = {
            type: createStub(node.type, 'input'),
            defaultValue: node.defaultValue !== undefined ? valueFromASTUntyped(node.defaultValue) : undefined,
            description: getDescription(node, backcompatOptions),
            astNode: node,
        }, _a)));
    }, {});
}
function makeDirective(node) {
    var e_1, _a;
    var _b;
    var locations = [];
    try {
        for (var _c = __values(node.locations), _d = _c.next(); !_d.done; _d = _c.next()) {
            var location_1 = _d.value;
            if (location_1.value in DirectiveLocation) {
                locations.push(location_1.value);
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
    return new GraphQLDirective({
        name: node.name.value,
        description: node.description != null ? node.description.value : null,
        locations: locations,
        isRepeatable: node.repeatable,
        args: makeValues((_b = node.arguments) !== null && _b !== void 0 ? _b : []),
        astNode: node,
    });
}
function getDeprecationReason(node) {
    var deprecated = getDirectiveValues(GraphQLDeprecatedDirective, node);
    return deprecated === null || deprecated === void 0 ? void 0 : deprecated['reason'];
}
