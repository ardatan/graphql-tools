import { Config } from './merge-typedefs.js';
import { InputObjectTypeDefinitionNode, InputValueDefinitionNode, InputObjectTypeExtensionNode, Kind } from 'graphql';
import { mergeFields } from './fields.js';
import { mergeDirectives } from './directives.js';

export function mergeInputType(
  node: InputObjectTypeDefinitionNode | InputObjectTypeExtensionNode,
  existingNode: InputObjectTypeDefinitionNode | InputObjectTypeExtensionNode,
  config?: Config
): InputObjectTypeDefinitionNode | InputObjectTypeExtensionNode {
  if (existingNode) {
    try {
      return {
        name: node.name,
        description: node['description'] || existingNode['description'],
        kind:
          config?.convertExtensions ||
          node.kind === 'InputObjectTypeDefinition' ||
          existingNode.kind === 'InputObjectTypeDefinition'
            ? 'InputObjectTypeDefinition'
            : 'InputObjectTypeExtension',
        loc: node.loc,
        fields: mergeFields<InputValueDefinitionNode>(node, node.fields, existingNode.fields, config),
        directives: mergeDirectives(node.directives, existingNode.directives, config),
      } as any;
    } catch (e: any) {
      throw new Error(`Unable to merge GraphQL input type "${node.name.value}": ${e.message}`);
    }
  }

  return config?.convertExtensions
    ? {
        ...node,
        kind: Kind.INPUT_OBJECT_TYPE_DEFINITION,
      }
    : node;
}
