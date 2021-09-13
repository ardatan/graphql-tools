import { EnumValueDefinitionNode } from 'graphql';
import { Config } from './merge-typedefs';
export declare function mergeEnumValues(
  first: ReadonlyArray<EnumValueDefinitionNode> | undefined,
  second: ReadonlyArray<EnumValueDefinitionNode> | undefined,
  config?: Config
): EnumValueDefinitionNode[];
