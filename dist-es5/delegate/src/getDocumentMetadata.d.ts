import { DocumentNode, FragmentDefinitionNode, OperationDefinitionNode } from 'graphql';
export declare function getDocumentMetadata(document: DocumentNode): {
  operations: Array<OperationDefinitionNode>;
  fragments: Array<FragmentDefinitionNode>;
  fragmentNames: Set<string>;
};
