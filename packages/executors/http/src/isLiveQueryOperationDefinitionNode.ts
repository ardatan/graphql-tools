import { OperationDefinitionNode } from 'graphql';
import { memoize1 } from '@graphql-tools/utils';

export const isLiveQueryOperationDefinitionNode = memoize1(
  function isLiveQueryOperationDefinitionNode(node: OperationDefinitionNode) {
    return (
      node.operation === 'query' &&
      node.directives?.some(directive => directive.name.value === 'live')
    );
  },
);
