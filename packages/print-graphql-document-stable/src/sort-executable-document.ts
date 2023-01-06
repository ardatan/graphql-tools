import { type DocumentNode, visit } from 'graphql';
import { sortExecutableNodes } from './sort-executable-nodes.js';

/**
 * Sort an executable GraphQL document.
 */
export function sortExecutableDocument(document: DocumentNode): DocumentNode {
  return visit(document, {
    Document(node) {
      return {
        ...node,
        definitions: sortExecutableNodes(node.definitions),
      };
    },
    OperationDefinition(node) {
      return {
        ...node,
        variableDefinitions: sortExecutableNodes(node.variableDefinitions),
      };
    },
    SelectionSet(node) {
      return {
        ...node,
        selections: sortExecutableNodes(node.selections),
      };
    },
    FragmentSpread(node) {
      return {
        ...node,
        directives: sortExecutableNodes(node.directives),
      };
    },
    InlineFragment(node) {
      return {
        ...node,
        directives: sortExecutableNodes(node.directives),
      };
    },
    FragmentDefinition(node) {
      return {
        ...node,
        directives: sortExecutableNodes(node.directives),
        variableDefinitions: sortExecutableNodes(node.variableDefinitions),
      };
    },
    Directive(node) {
      return { ...node, arguments: sortExecutableNodes(node.arguments) };
    },
  });
}
