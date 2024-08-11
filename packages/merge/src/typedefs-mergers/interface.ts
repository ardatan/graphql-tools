import {
  DirectiveDefinitionNode,
  InterfaceTypeDefinitionNode,
  InterfaceTypeExtensionNode,
  Kind,
} from 'graphql';
import { mergeDirectives } from './directives.js';
import { mergeFields } from './fields.js';
import { mergeNamedTypeArray } from './merge-named-type-array.js';
import { Config } from './merge-typedefs.js';

export function mergeInterface(
  node: InterfaceTypeDefinitionNode | InterfaceTypeExtensionNode,
  existingNode: InterfaceTypeDefinitionNode | InterfaceTypeExtensionNode,
  config?: Config,
  directives?: Record<string, DirectiveDefinitionNode>,
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
        fields: mergeFields(node, node.fields, existingNode.fields, config, directives),
        directives: mergeDirectives(node.directives, existingNode.directives, config, directives),
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
