import { SelectionSetNode, FieldNode } from 'graphql';
export declare const forwardArgsToSelectionSet: (
  selectionSet: string,
  mapping?: Record<string, string[]>
) => (field: FieldNode) => SelectionSetNode;
