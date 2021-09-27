import { getOperationAST, DocumentNode, OperationTypeNode } from 'graphql';

export function getDocumentOperationType(document: DocumentNode, operationName?: string): OperationTypeNode {
  const operationType = getOperationAST(document, operationName)?.operation;
  if (operationType != null) {
    return operationType;
  }
  throw new Error('could not identify operation type of document');
}
