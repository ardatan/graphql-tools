import { __assign } from "tslib";
import { Kind } from 'graphql';
import { mergeDirectives } from './directives';
export var DEFAULT_OPERATION_TYPE_NAME_MAP = {
    query: 'Query',
    mutation: 'Mutation',
    subscription: 'Subscription',
};
function mergeOperationTypes(opNodeList, existingOpNodeList) {
    if (opNodeList === void 0) { opNodeList = []; }
    if (existingOpNodeList === void 0) { existingOpNodeList = []; }
    var finalOpNodeList = [];
    var _loop_1 = function (opNodeType) {
        var opNode = opNodeList.find(function (n) { return n.operation === opNodeType; }) || existingOpNodeList.find(function (n) { return n.operation === opNodeType; });
        if (opNode) {
            finalOpNodeList.push(opNode);
        }
    };
    for (var opNodeType in DEFAULT_OPERATION_TYPE_NAME_MAP) {
        _loop_1(opNodeType);
    }
    return finalOpNodeList;
}
export function mergeSchemaDefs(node, existingNode, config) {
    if (existingNode) {
        return {
            kind: node.kind === Kind.SCHEMA_DEFINITION || existingNode.kind === Kind.SCHEMA_DEFINITION
                ? Kind.SCHEMA_DEFINITION
                : Kind.SCHEMA_EXTENSION,
            description: node['description'] || existingNode['description'],
            directives: mergeDirectives(node.directives, existingNode.directives, config),
            operationTypes: mergeOperationTypes(node.operationTypes, existingNode.operationTypes),
        };
    }
    return ((config === null || config === void 0 ? void 0 : config.convertExtensions)
        ? __assign(__assign({}, node), { kind: Kind.SCHEMA_DEFINITION }) : node);
}
