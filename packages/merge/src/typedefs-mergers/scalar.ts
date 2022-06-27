import { Kind, ScalarTypeDefinitionNode, ScalarTypeExtensionNode } from 'graphql';
import { mergeDirectives } from './directives.js';
import { Config } from './merge-typedefs.js';

export function mergeScalar(
  node: ScalarTypeDefinitionNode | ScalarTypeExtensionNode,
  existingNode: ScalarTypeDefinitionNode | ScalarTypeExtensionNode,
  config?: Config
): ScalarTypeDefinitionNode | ScalarTypeExtensionNode {
  if (existingNode) {
    return {
      name: node.name,
      description: node['description'] || existingNode['description'],
      kind:
        config?.convertExtensions ||
        node.kind === 'ScalarTypeDefinition' ||
        existingNode.kind === 'ScalarTypeDefinition'
          ? 'ScalarTypeDefinition'
          : 'ScalarTypeExtension',
      loc: node.loc,
      directives: mergeDirectives(node.directives, existingNode.directives, config),
    } as any;
  }

  return config?.convertExtensions
    ? {
        ...node,
        kind: Kind.SCALAR_TYPE_DEFINITION,
      }
    : node;
}
