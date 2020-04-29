import { UnionTypeDefinitionNode, UnionTypeExtensionNode } from 'graphql';
import { mergeDirectives } from './directives';
import { mergeNamedTypeArray } from './merge-named-type-array';
import { Config } from './merge-typedefs';

export function mergeUnion(
  first: UnionTypeDefinitionNode | UnionTypeExtensionNode,
  second: UnionTypeDefinitionNode | UnionTypeExtensionNode,
  config?: Config
): UnionTypeDefinitionNode | UnionTypeExtensionNode {
  if (second) {
    return {
      name: first.name,
      description: first['description'] || second['description'],
      directives: mergeDirectives(first.directives, second.directives, config),
      kind:
        (config && config.convertExtensions) ||
        first.kind === 'UnionTypeDefinition' ||
        second.kind === 'UnionTypeDefinition'
          ? 'UnionTypeDefinition'
          : 'UnionTypeExtension',
      loc: first.loc,
      types: mergeNamedTypeArray(first.types, second.types, config),
    };
  }

  return config && config.convertExtensions
    ? {
        ...first,
        kind: 'UnionTypeDefinition',
      }
    : first;
}
