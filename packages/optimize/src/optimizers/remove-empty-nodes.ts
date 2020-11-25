import { visit } from 'graphql';
import { DocumentOptimizer } from '../types';

/**
 * This optimizer removes empty nodes/arrays (directives/argument/variableDefinitions) from a given DocumentNode of operation/fragment.
 * @param input
 */
export const removeEmptyNodes: DocumentOptimizer = input => {
  function transformNode(node: any) {
    let resultNode = node;

    if (resultNode.directives && Array.isArray(resultNode.directives) && resultNode.directives.length === 0) {
      const { directives, ...rest } = resultNode;

      resultNode = rest;
    }

    if (resultNode.arguments && Array.isArray(resultNode.arguments) && resultNode.arguments.length === 0) {
      const { arguments: args, ...rest } = resultNode;

      resultNode = rest;
    }

    if (
      resultNode.variableDefinitions &&
      Array.isArray(resultNode.variableDefinitions) &&
      resultNode.variableDefinitions.length === 0
    ) {
      const { variableDefinitions, ...rest } = resultNode;

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
