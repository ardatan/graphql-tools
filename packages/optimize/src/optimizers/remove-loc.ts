import { visit } from 'graphql';
import { DocumentOptimizer } from '../types.js';

/**
 * This optimizer removes "loc" fields
 * @param input
 */
export const removeLoc: DocumentOptimizer = input => {
  function transformNode(node: any) {
    if (node.loc && typeof node.loc === 'object') {
      const { loc, ...rest } = node;

      return rest;
    }

    return node;
  }

  return visit(input, { enter: transformNode });
};
