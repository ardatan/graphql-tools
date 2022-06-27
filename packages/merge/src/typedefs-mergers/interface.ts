import { Config } from './merge-typedefs.js';
import { InterfaceTypeDefinitionNode, InterfaceTypeExtensionNode, Kind } from 'graphql';
import { mergeFields } from './fields.js';
import { mergeDirectives } from './directives.js';
import { mergeNamedTypeArray } from './index.js';

export function mergeInterface(
  node: InterfaceTypeDefinitionNode | InterfaceTypeExtensionNode,
  existingNode: InterfaceTypeDefinitionNode | InterfaceTypeExtensionNode,
  config?: Config
): InterfaceTypeDefinitionNode | InterfaceTypeExtensionNode {
  if (existingNode) {
    try {
      return {
        name: node.name,
        description: node['description'] || existingNode['description'],
        kind:
          config?.convertExtensions ||
          node.kind === 'InterfaceTypeDefinition' ||
          existingNode.kind === 'InterfaceTypeDefinition'
            ? 'InterfaceTypeDefinition'
            : 'InterfaceTypeExtension',
        loc: node.loc,
        fields: mergeFields(node, node.fields, existingNode.fields, config),
        directives: mergeDirectives(node.directives, existingNode.directives, config),
        interfaces: node['interfaces']
          ? mergeNamedTypeArray(node['interfaces'], existingNode['interfaces'], config)
          : undefined,
      } as any;
    } catch (e: any) {
      throw new Error(`Unable to merge GraphQL interface "${node.name.value}": ${e.message}`);
    }
  }

  return config?.convertExtensions
    ? {
        ...node,
        kind: Kind.INTERFACE_TYPE_DEFINITION,
      }
    : node;
}
