import { type DocumentNode, visit, print } from 'graphql';
import { normalizeWhiteSpace } from './normalize-whitespace.js';
import { sortNodes } from './sort-nodes.js';

/**
 * Print an executable document node definition in a stable way.
 * All the nodes are sorted by name and the white space is reduced.
 */
export function printExecutableGraphQLDocument(document: DocumentNode): string {
  const sortedDocument = sortDocument(document);
  const printedDocument = print(sortedDocument);
  return normalizeWhiteSpace(printedDocument);
}

function sortDocument(document: DocumentNode): DocumentNode {
  return visit(document, {
    Document(node) {
      return {
        ...node,
        definitions: sortNodes(node.definitions),
      };
    },
    OperationDefinition(node) {
      return {
        ...node,
        variableDefinitions: sortNodes(node.variableDefinitions),
      };
    },
    SelectionSet(node) {
      return {
        ...node,
        selections: sortNodes(node.selections),
      };
    },
    FragmentSpread(node) {
      return {
        ...node,
        directives: sortNodes(node.directives),
      };
    },
    InlineFragment(node) {
      return {
        ...node,
        directives: sortNodes(node.directives),
      };
    },
    FragmentDefinition(node) {
      return {
        ...node,
        directives: sortNodes(node.directives),
        variableDefinitions: sortNodes(node.variableDefinitions),
      };
    },
    Directive(node) {
      return { ...node, arguments: sortNodes(node.arguments) };
    },
  });
}
