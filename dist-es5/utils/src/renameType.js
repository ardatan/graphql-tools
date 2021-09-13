import { __assign } from "tslib";
import { GraphQLEnumType, GraphQLInputObjectType, GraphQLInterfaceType, GraphQLObjectType, GraphQLScalarType, GraphQLUnionType, isEnumType, isInterfaceType, isInputObjectType, isObjectType, isScalarType, isUnionType, } from 'graphql';
export function renameType(type, newTypeName) {
    if (isObjectType(type)) {
        return new GraphQLObjectType(__assign(__assign({}, type.toConfig()), { name: newTypeName, astNode: type.astNode == null
                ? type.astNode
                : __assign(__assign({}, type.astNode), { name: __assign(__assign({}, type.astNode.name), { value: newTypeName }) }), extensionASTNodes: type.extensionASTNodes == null
                ? type.extensionASTNodes
                : type.extensionASTNodes.map(function (node) { return (__assign(__assign({}, node), { name: __assign(__assign({}, node.name), { value: newTypeName }) })); }) }));
    }
    else if (isInterfaceType(type)) {
        return new GraphQLInterfaceType(__assign(__assign({}, type.toConfig()), { name: newTypeName, astNode: type.astNode == null
                ? type.astNode
                : __assign(__assign({}, type.astNode), { name: __assign(__assign({}, type.astNode.name), { value: newTypeName }) }), extensionASTNodes: type.extensionASTNodes == null
                ? type.extensionASTNodes
                : type.extensionASTNodes.map(function (node) { return (__assign(__assign({}, node), { name: __assign(__assign({}, node.name), { value: newTypeName }) })); }) }));
    }
    else if (isUnionType(type)) {
        return new GraphQLUnionType(__assign(__assign({}, type.toConfig()), { name: newTypeName, astNode: type.astNode == null
                ? type.astNode
                : __assign(__assign({}, type.astNode), { name: __assign(__assign({}, type.astNode.name), { value: newTypeName }) }), extensionASTNodes: type.extensionASTNodes == null
                ? type.extensionASTNodes
                : type.extensionASTNodes.map(function (node) { return (__assign(__assign({}, node), { name: __assign(__assign({}, node.name), { value: newTypeName }) })); }) }));
    }
    else if (isInputObjectType(type)) {
        return new GraphQLInputObjectType(__assign(__assign({}, type.toConfig()), { name: newTypeName, astNode: type.astNode == null
                ? type.astNode
                : __assign(__assign({}, type.astNode), { name: __assign(__assign({}, type.astNode.name), { value: newTypeName }) }), extensionASTNodes: type.extensionASTNodes == null
                ? type.extensionASTNodes
                : type.extensionASTNodes.map(function (node) { return (__assign(__assign({}, node), { name: __assign(__assign({}, node.name), { value: newTypeName }) })); }) }));
    }
    else if (isEnumType(type)) {
        return new GraphQLEnumType(__assign(__assign({}, type.toConfig()), { name: newTypeName, astNode: type.astNode == null
                ? type.astNode
                : __assign(__assign({}, type.astNode), { name: __assign(__assign({}, type.astNode.name), { value: newTypeName }) }), extensionASTNodes: type.extensionASTNodes == null
                ? type.extensionASTNodes
                : type.extensionASTNodes.map(function (node) { return (__assign(__assign({}, node), { name: __assign(__assign({}, node.name), { value: newTypeName }) })); }) }));
    }
    else if (isScalarType(type)) {
        return new GraphQLScalarType(__assign(__assign({}, type.toConfig()), { name: newTypeName, astNode: type.astNode == null
                ? type.astNode
                : __assign(__assign({}, type.astNode), { name: __assign(__assign({}, type.astNode.name), { value: newTypeName }) }), extensionASTNodes: type.extensionASTNodes == null
                ? type.extensionASTNodes
                : type.extensionASTNodes.map(function (node) { return (__assign(__assign({}, node), { name: __assign(__assign({}, node.name), { value: newTypeName }) })); }) }));
    }
    throw new Error("Unknown type " + type + ".");
}
