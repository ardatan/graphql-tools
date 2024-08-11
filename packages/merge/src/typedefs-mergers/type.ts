import {
  DirectiveDefinitionNode,
  Kind,
  ObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
} from 'graphql';
import { mergeDirectives } from './directives.js';
import { mergeFields } from './fields.js';
import { mergeNamedTypeArray } from './merge-named-type-array.js';
import { Config } from './merge-typedefs.js';

export function mergeType(
  node: ObjectTypeDefinitionNode | ObjectTypeExtensionNode,
  existingNode: ObjectTypeDefinitionNode | ObjectTypeExtensionNode,
  config?: Config,
  directives?: Record<string, DirectiveDefinitionNode>,
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
        fields: mergeFields(node, node.fields, existingNode.fields, config, directives),
        directives: mergeDirectives(node.directives, existingNode.directives, config, directives),
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
