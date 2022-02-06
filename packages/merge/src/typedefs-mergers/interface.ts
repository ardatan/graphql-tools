import { Config } from './merge-typedefs';
import { InterfaceTypeDefinitionNode, InterfaceTypeExtensionNode, Kind } from 'graphql';
import { mergeFields } from './fields';
import { mergeDirectives } from './directives';
import { mergeNamedTypeArray } from '.';

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
        interfaces: mergeNamedTypeArray(node.interfaces, existingNode.interfaces, config),
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
