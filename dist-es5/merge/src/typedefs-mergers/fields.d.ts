import { Config } from './merge-typedefs';
import { FieldDefinitionNode, InputValueDefinitionNode, NameNode } from 'graphql';
export declare function mergeFields<T extends FieldDefinitionNode | InputValueDefinitionNode>(
  type: {
    name: NameNode;
  },
  f1: ReadonlyArray<T> | undefined,
  f2: ReadonlyArray<T> | undefined,
  config?: Config
): T[];
