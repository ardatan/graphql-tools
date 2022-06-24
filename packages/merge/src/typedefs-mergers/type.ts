import { Config } from './merge-typedefs.js';
import { Kind, ObjectTypeDefinitionNode, ObjectTypeExtensionNode } from 'graphql';
import { mergeFields } from './fields.js';
import { mergeDirectives } from './directives.js';
import { mergeNamedTypeArray } from './merge-named-type-array.js';

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
          config?.convertExtensions ||
          node.kind === 'ObjectTypeDefinition' ||
          existingNode.kind === 'ObjectTypeDefinition'
            ? 'ObjectTypeDefinition'
            : 'ObjectTypeExtension',
        loc: node.loc,
        fields: mergeFields(node, node.fields, existingNode.fields, config),
        directives: mergeDirectives(node.directives, existingNode.directives, config),
        interfaces: mergeNamedTypeArray(node.interfaces, existingNode.interfaces, config),
      } as any;
    } catch (e: any) {
      throw new Error(`Unable to merge GraphQL type "${node.name.value}": ${e.message}`);
    }
  }

  return config?.convertExtensions
    ? {
        ...node,
        kind: Kind.OBJECT_TYPE_DEFINITION,
      }
    : node;
}
