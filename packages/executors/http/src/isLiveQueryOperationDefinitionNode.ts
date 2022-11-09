import { memoize1 } from '@graphql-tools/utils';
import { OperationDefinitionNode } from 'graphql';

export const isLiveQueryOperationDefinitionNode = memoize1(function isLiveQueryOperationDefinitionNode(
  node: OperationDefinitionNode
) {
  return node.operation === 'query' && node.directives?.some(directive => directive.name.value === 'live');
});
