import { __rest } from "tslib";
import { visit } from 'graphql';
/**
 * This optimizer removes empty nodes/arrays (directives/argument/variableDefinitions) from a given DocumentNode of operation/fragment.
 * @param input
 */
export var removeEmptyNodes = function (input) {
    function transformNode(node) {
        var resultNode = node;
        if (resultNode.directives && Array.isArray(resultNode.directives) && resultNode.directives.length === 0) {
            var directives = resultNode.directives, rest = __rest(resultNode, ["directives"]);
            resultNode = rest;
        }
        if (resultNode.arguments && Array.isArray(resultNode.arguments) && resultNode.arguments.length === 0) {
            var args = resultNode.arguments, rest = __rest(resultNode, ["arguments"]);
            resultNode = rest;
        }
        if (resultNode.variableDefinitions &&
            Array.isArray(resultNode.variableDefinitions) &&
            resultNode.variableDefinitions.length === 0) {
            var variableDefinitions = resultNode.variableDefinitions, rest = __rest(resultNode, ["variableDefinitions"]);
            resultNode = rest;
        }
        return resultNode;
    }
    return visit(input, {
        FragmentDefinition: transformNode,
        OperationDefinition: transformNode,
        VariableDefinition: transformNode,
        Field: transformNode,
        FragmentSpread: transformNode,
        InlineFragment: transformNode,
        Name: transformNode,
        Directive: transformNode,
    });
};
