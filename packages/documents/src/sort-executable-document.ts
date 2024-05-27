import { SelectionNode, SelectionSetNode, visit, type DocumentNode } from 'graphql';
import { sortExecutableNodes } from './sort-executable-nodes.js';

/**
 * Sort an executable GraphQL document.
 */
export function sortExecutableDocument(document: DocumentNode): DocumentNode {
  const ignoredNodes = new WeakSet<SelectionSetNode>();
  const ignoredSelectionsArr = new Set<readonly SelectionNode[]>();
  const ignoredFragments = new Set<string>();
  return visit(document, {
    Document(node) {
      return {
        ...node,
        definitions: sortExecutableNodes(node.definitions),
      };
    },
    OperationDefinition(node) {
      if (node.operation === 'mutation') {
        ignoredNodes.add(node.selectionSet);
        ignoredSelectionsArr.add(node.selectionSet.selections);
      }
      return {
        ...node,
        variableDefinitions: sortExecutableNodes(node.variableDefinitions),
      };
    },
    SelectionSet(node) {
      if (ignoredNodes.has(node)) {
        ignoredSelectionsArr.add(node.selections);
        return node;
      }
      return {
        ...node,
        selections: sortExecutableNodes(node.selections),
      };
    },
    FragmentSpread(node, _key, parent) {
      if (Array.isArray(parent) && ignoredSelectionsArr.has(parent)) {
        ignoredFragments.add(node.name.value);
      }
      return {
        ...node,
        directives: sortExecutableNodes(node.directives),
      };
    },
    InlineFragment(node, _key, parent) {
      if (Array.isArray(parent) && ignoredSelectionsArr.has(parent)) {
        ignoredNodes.add(node.selectionSet);
        ignoredSelectionsArr.add(node.selectionSet.selections);
        return node;
      }
      return {
        ...node,
        directives: sortExecutableNodes(node.directives),
      };
    },
    FragmentDefinition(node) {
      if (ignoredFragments.has(node.name.value)) {
        return node;
      }
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
