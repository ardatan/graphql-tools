import { InputValueDefinitionNode } from 'graphql';
import { Config } from './index.js';
import { compareNodes, isSome } from '@graphql-tools/utils';

export function mergeArguments(
  args1: InputValueDefinitionNode[],
  args2: InputValueDefinitionNode[],
  config?: Config
): InputValueDefinitionNode[] {
  const result = deduplicateArguments([...args2, ...args1].filter(isSome), config);
  if (config && config.sort) {
    result.sort(compareNodes);
  }
  return result;
}

function deduplicateArguments(
  args: ReadonlyArray<InputValueDefinitionNode>,
  config?: Config
): InputValueDefinitionNode[] {
  return args.reduce<InputValueDefinitionNode[]>((acc, current) => {
    const dupIndex = acc.findIndex(arg => arg.name.value === current.name.value);

    if (dupIndex === -1) {
      return acc.concat([current]);
    } else if (!config?.reverseArguments) {
      acc[dupIndex] = current;
    }

    return acc;
  }, []);
}
