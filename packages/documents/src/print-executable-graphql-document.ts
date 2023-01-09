import { type DocumentNode, print } from 'graphql';
import { normalizeWhiteSpace } from './normalize-whitespace.js';
import { sortExecutableDocument } from './sort-executable-document.js';

/**
 * Print an executable document node definition in a stable way.
 * All the nodes are sorted by name and the white space is reduced.
 */
export function printExecutableGraphQLDocument(document: DocumentNode): string {
  const sortedDocument = sortExecutableDocument(document);
  const printedDocument = print(sortedDocument);
  return normalizeWhiteSpace(printedDocument);
}
