import { NamedTypeNode } from 'graphql/language/ast';
import { Config } from '.';
import { compareNodes } from '@graphql-tools/common';

function alreadyExists(arr: ReadonlyArray<NamedTypeNode>, other: NamedTypeNode): boolean {
  return !!arr.find(i => i.name.value === other.name.value);
}

export function mergeNamedTypeArray(
  first: ReadonlyArray<NamedTypeNode>,
  second: ReadonlyArray<NamedTypeNode>,
  config: Config
): NamedTypeNode[] {
  const result = [...second, ...first.filter(d => !alreadyExists(second, d))];
  if (config && config.sort) {
    result.sort(compareNodes);
  }
  return result;
}
