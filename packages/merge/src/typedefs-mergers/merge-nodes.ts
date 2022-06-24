import { Config } from './merge-typedefs.js';
import { DefinitionNode, Kind, SchemaDefinitionNode, SchemaExtensionNode } from 'graphql';
import { mergeType } from './type.js';
import { mergeEnum } from './enum.js';
import { mergeScalar } from './scalar.js';
import { mergeUnion } from './union.js';
import { mergeInputType } from './input-type.js';
import { mergeInterface } from './interface.js';
import { mergeDirective } from './directives.js';
import { mergeSchemaDefs } from './schema-def.js';
import { NamedDefinitionNode, collectComment } from '@graphql-tools/utils';

export const schemaDefSymbol = 'SCHEMA_DEF_SYMBOL';

export type MergedResultMap = Record<string, NamedDefinitionNode> & {
  [schemaDefSymbol]: SchemaDefinitionNode | SchemaExtensionNode;
};

export function isNamedDefinitionNode(definitionNode: DefinitionNode): definitionNode is NamedDefinitionNode {
  return 'name' in definitionNode;
}

export function mergeGraphQLNodes(nodes: ReadonlyArray<DefinitionNode>, config?: Config): MergedResultMap {
  const mergedResultMap = {} as MergedResultMap;
  for (const nodeDefinition of nodes) {
    if (isNamedDefinitionNode(nodeDefinition)) {
      const name = nodeDefinition.name?.value;
      if (config?.commentDescriptions) {
        collectComment(nodeDefinition);
      }

      if (name == null) {
        continue;
      }

      if (config?.exclusions?.includes(name + '.*') || config?.exclusions?.includes(name)) {
        delete mergedResultMap[name];
      } else {
        switch (nodeDefinition.kind) {
          case Kind.OBJECT_TYPE_DEFINITION:
          case Kind.OBJECT_TYPE_EXTENSION:
            mergedResultMap[name] = mergeType(nodeDefinition, mergedResultMap[name] as any, config);
            break;
          case Kind.ENUM_TYPE_DEFINITION:
          case Kind.ENUM_TYPE_EXTENSION:
            mergedResultMap[name] = mergeEnum(nodeDefinition, mergedResultMap[name] as any, config);
            break;
          case Kind.UNION_TYPE_DEFINITION:
          case Kind.UNION_TYPE_EXTENSION:
            mergedResultMap[name] = mergeUnion(nodeDefinition, mergedResultMap[name] as any, config);
            break;
          case Kind.SCALAR_TYPE_DEFINITION:
          case Kind.SCALAR_TYPE_EXTENSION:
            mergedResultMap[name] = mergeScalar(nodeDefinition, mergedResultMap[name] as any, config);
            break;
          case Kind.INPUT_OBJECT_TYPE_DEFINITION:
          case Kind.INPUT_OBJECT_TYPE_EXTENSION:
            mergedResultMap[name] = mergeInputType(nodeDefinition, mergedResultMap[name] as any, config);
            break;
          case Kind.INTERFACE_TYPE_DEFINITION:
          case Kind.INTERFACE_TYPE_EXTENSION:
            mergedResultMap[name] = mergeInterface(nodeDefinition, mergedResultMap[name] as any, config);
            break;
          case Kind.DIRECTIVE_DEFINITION:
            mergedResultMap[name] = mergeDirective(nodeDefinition, mergedResultMap[name] as any);
            break;
        }
      }
    } else if (nodeDefinition.kind === Kind.SCHEMA_DEFINITION || nodeDefinition.kind === Kind.SCHEMA_EXTENSION) {
      mergedResultMap[schemaDefSymbol] = mergeSchemaDefs(nodeDefinition, mergedResultMap[schemaDefSymbol], config);
    }
  }
  return mergedResultMap;
}
