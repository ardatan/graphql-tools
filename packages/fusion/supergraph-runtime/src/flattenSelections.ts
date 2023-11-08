import { FieldNode, FragmentDefinitionNode, Kind, SelectionNode, SelectionSetNode } from 'graphql';

export interface FlattenedFieldNode extends FieldNode {
  selectionSet?: FlattenedSelectionSet;
}

export interface FlattenedSelectionSet extends SelectionSetNode {
  selections: FlattenedFieldNode[];
}

export function flattenSelections(
  selections: readonly SelectionNode[],
  fragments: Record<string, FragmentDefinitionNode>,
): FlattenedFieldNode[] {
  return selections.flatMap(selection => {
    switch (selection.kind) {
      case Kind.FIELD:
        return [
          {
            ...selection,
            selectionSet: selection.selectionSet && {
              ...selection.selectionSet,
              selections: flattenSelections(selection.selectionSet.selections, fragments),
            },
          },
        ];
      case Kind.INLINE_FRAGMENT:
        return flattenSelections(selection.selectionSet.selections, fragments);
      case Kind.FRAGMENT_SPREAD: {
        const fragment = fragments[selection.name.value];
        if (!fragment) {
          throw new Error(`No fragment found for ${selection.name.value}`);
        }
        return flattenSelections(fragment.selectionSet.selections, fragments);
      }
      default:
        throw new Error(`Unexpected selection node kind ${(selection as any).kind}`);
    }
  });
}
