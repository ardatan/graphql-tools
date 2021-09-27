import { DocumentNode, DefinitionNode, OperationTypeNode, OperationDefinitionNode, Kind } from 'graphql';

export function operationTypeFromDocument(document: DocumentNode): OperationTypeNode {
  for (const def of document.definitions) {
    if (isOperationDefinition(def)) {
      return def.operation;
    }
  }
  throw new Error('could not identify operation type of document');
}

export function isOperationDefinition(def: DefinitionNode): def is OperationDefinitionNode {
  return def.kind === Kind.OPERATION_DEFINITION;
}
