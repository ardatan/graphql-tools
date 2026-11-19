import { DirectiveDefinitionNode, EnumValueDefinitionNode } from 'graphql';
import { compareNodes } from '@graphql-tools/utils';
import { mergeDirectives } from './directives.js';
import { Config } from './merge-typedefs.js';

export function mergeEnumValues(
  first: ReadonlyArray<EnumValueDefinitionNode> | undefined,
  second: ReadonlyArray<EnumValueDefinitionNode> | undefined,
  config?: Config,
  directives?: Record<string, DirectiveDefinitionNode>,
): EnumValueDefinitionNode[] {
  const enumValueMap = new Map<string, EnumValueDefinitionNode>();
  if (second) {
    for (const value of second) {
      enumValueMap.set(value.name.value, value);
    }
  }
  if (first) {
    for (const incomingValue of first) {
      const existing = enumValueMap.get(incomingValue.name.value);
      if (existing) {
        const incoming: any = incomingValue;
        incoming.description = incoming.description || existing.description;
        incoming.directives = mergeDirectives(
          incoming.directives,
          existing.directives,
          config,
          directives,
        );
        enumValueMap.set(incoming.name.value, incoming);
      } else {
        enumValueMap.set(incomingValue.name.value, incomingValue);
      }
    }
  }

  const result = [...enumValueMap.values()];
  if (config && config.sort) {
    result.sort(compareNodes);
  }
  return result;
}
