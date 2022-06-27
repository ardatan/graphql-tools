import { DocumentNode, getOperationAST, OperationDefinitionNode } from 'graphql';
import { ExecutionRequest } from './Interfaces.js';
import { memoize1 } from './memoize.js';

export function getOperationASTFromDocument(
  documentNode: DocumentNode,
  operationName?: string
): OperationDefinitionNode {
  const doc = getOperationAST(documentNode, operationName);
  if (!doc) {
    throw new Error(`Cannot infer operation ${operationName || ''}`);
  }
  return doc;
}

export const getOperationASTFromRequest = memoize1(function getOperationASTFromRequest(request: ExecutionRequest) {
  return getOperationASTFromDocument(request.document, request.operationName);
});
