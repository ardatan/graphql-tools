import { DocumentNode, parse, print } from 'graphql';

const printCache = new WeakMap<DocumentNode, string>();

export function parseAndCache(source: string) {
  const parsed = parse(source);
  printCache.set(parsed, source);
  return parsed;
}

export function printCached(document: DocumentNode) {
  return printCache.get(document) || print(document).trim();
}
