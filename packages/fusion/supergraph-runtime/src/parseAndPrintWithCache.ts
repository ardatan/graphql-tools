import { ASTNode, DocumentNode, parse, print } from 'graphql';

const printCache = new WeakMap<ASTNode, string>();

export function parseAndCache(source: string) {
  const parsed = parse(source, { noLocation: true });
  printCache.set(parsed, source);
  return parsed;
}

export function printCached(document: ASTNode) {
  return printCache.get(document) || print(document).trim();
}
