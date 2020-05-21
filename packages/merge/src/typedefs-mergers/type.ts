import { Config } from './merge-typedefs';
import { ObjectTypeDefinitionNode, ObjectTypeExtensionNode } from 'graphql';
import { mergeFields } from './fields';
import { mergeDirectives } from './directives';
import { mergeNamedTypeArray } from './merge-named-type-array';

export function mergeType(
  node: ObjectTypeDefinitionNode | ObjectTypeExtensionNode,
  existingNode: ObjectTypeDefinitionNode | ObjectTypeExtensionNode,
  config?: Config
): ObjectTypeDefinitionNode | ObjectTypeExtensionNode {
  if (existingNode) {
    try {
      return {
        name: node.name,
        description: node['description'] || existingNode['description'],
        kind:
          (config && config.convertExtensions) ||
          node.kind === 'ObjectTypeDefinition' ||
          existingNode.kind === 'ObjectTypeDefinition'
            ? 'ObjectTypeDefinition'
            : 'ObjectTypeExtension',
        loc: node.loc,
        fields: mergeFields(node, node.fields, existingNode.fields, config),
        directives: mergeDirectives(node.directives, existingNode.directives, config),
        interfaces: mergeNamedTypeArray(node.interfaces, existingNode.interfaces, config),
      } as any;
    } catch (e) {
      throw new Error(`Unable to merge GraphQL type "${node.name.value}": ${e.message}`);
    }
  }

  return config && config.convertExtensions
    ? {
        ...node,
        kind: 'ObjectTypeDefinition',
      }
    : node;
}
