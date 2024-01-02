import { DocumentNode, print } from 'graphql';

const printCache = new WeakMap<DocumentNode, string>();

export function defaultPrintFn(document: DocumentNode) {
  let printed = printCache.get(document);
  if (!printed) {
    printed = print(document);
    printCache.set(document, printed);
  }
  return printed;
}
