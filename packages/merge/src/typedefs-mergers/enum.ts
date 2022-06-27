import { EnumTypeDefinitionNode, EnumTypeExtensionNode, Kind } from 'graphql';
import { mergeDirectives } from './directives.js';
import { mergeEnumValues } from './enum-values.js';
import { Config } from './merge-typedefs.js';

export function mergeEnum(
  e1: EnumTypeDefinitionNode | EnumTypeExtensionNode,
  e2: EnumTypeDefinitionNode | EnumTypeExtensionNode,
  config?: Config
): EnumTypeDefinitionNode | EnumTypeExtensionNode {
  if (e2) {
    return {
      name: e1.name,
      description: e1['description'] || e2['description'],
      kind:
        config?.convertExtensions || e1.kind === 'EnumTypeDefinition' || e2.kind === 'EnumTypeDefinition'
          ? 'EnumTypeDefinition'
          : 'EnumTypeExtension',
      loc: e1.loc,
      directives: mergeDirectives(e1.directives, e2.directives, config),
      values: mergeEnumValues(e1.values, e2.values, config),
    } as any;
  }

  return config?.convertExtensions
    ? {
        ...e1,
        kind: Kind.ENUM_TYPE_DEFINITION,
      }
    : e1;
}
