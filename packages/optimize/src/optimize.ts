import { DocumentNode } from 'graphql';
import { removeDescriptions } from './optimizers/remove-description';
import { removeEmptyNodes } from './optimizers/remove-empty-nodes';
import { removeLoc } from './optimizers/remove-loc';
import { DocumentOptimizer } from './types';

const DEFAULT_OPTIMIZERS: DocumentOptimizer[] = [removeDescriptions, removeEmptyNodes, removeLoc];

/**
 * This method accept a DocumentNode and applies the optimizations you wish to use.
 * You can override the default ones or provide you own optimizers if you wish.
 *
 * @param node document to optimize
 * @param optimizers optional, list of optimizer to use
 */
export function optimizeDocumentNode(node: DocumentNode, optimizers = DEFAULT_OPTIMIZERS): DocumentNode {
  let resultNode = node;

  for (const optimizer of optimizers) {
    if (typeof optimizer !== 'function') {
      throw new Error(`Optimizer provided for "optimizeDocumentNode" must be a function!`);
    }

    const result = optimizer(resultNode);

    if (!result) {
      throw new Error(
        `Optimizer provided for "optimizeDocumentNode" returned empty value instead of modified "DocumentNode"!`
      );
    }

    resultNode = result;
  }

  return resultNode;
}
