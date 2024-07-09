import { DocumentNode, print, stripIgnoredCharacters } from 'graphql';

const printCache = new WeakMap<DocumentNode, string>();

export function defaultPrintFn(document: DocumentNode) {
  let printed = printCache.get(document);
  if (!printed) {
    printed = stripIgnoredCharacters(print(document));
    printCache.set(document, printed);
  }
  return printed;
}
