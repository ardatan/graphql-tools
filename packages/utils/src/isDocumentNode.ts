import { ASTNode, DocumentNode } from 'graphql';

export function isDocumentNode(object: any): object is DocumentNode {
  return (object as ASTNode).kind !== undefined;
}
