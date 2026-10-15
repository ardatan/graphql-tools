import { DocumentNode, getOperationAST, OperationDefinitionNode } from 'graphql';
import weakMemoizee from 'memoizee/weak.js';
import { ExecutionRequest } from './Interfaces.js';

export function getOperationASTFromDocument(
  documentNode: DocumentNode,
  operationName?: string,
): OperationDefinitionNode {
  const doc = getOperationAST(documentNode, operationName);
  if (!doc) {
    throw new Error(`Cannot infer operation ${operationName || ''}`);
  }
  return doc;
}

export const getOperationASTFromRequest = weakMemoizee(function getOperationASTFromRequest(
  request: ExecutionRequest,
) {
  return getOperationASTFromDocument(request.document, request.operationName);
});
