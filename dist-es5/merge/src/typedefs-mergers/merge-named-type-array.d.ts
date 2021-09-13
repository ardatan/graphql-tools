import { NamedTypeNode } from 'graphql';
import { Config } from '.';
export declare function mergeNamedTypeArray(
  first?: ReadonlyArray<NamedTypeNode>,
  second?: ReadonlyArray<NamedTypeNode>,
  config?: Config
): NamedTypeNode[];
