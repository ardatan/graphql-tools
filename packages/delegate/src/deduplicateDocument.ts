import {
  DocumentNode,
  FieldNode,
  FragmentSpreadNode,
  InlineFragmentNode,
  Kind,
  SelectionNode,
  SelectionSetNode,
  visit,
} from 'graphql';

function deduplicateSelectionSet(node: SelectionSetNode): SelectionSetNode {
  const nonMergableSelections: Array<SelectionNode> = [];
  const mergableFieldSelections: Map<string, FieldNode> = new Map();
  const inlineFragments: Map<string, InlineFragmentNode> = new Map();
  const fragmentSpreads = new Set<string>();
  for (const selection of node.selections) {
    if (selection.kind === Kind.FIELD && !selection.arguments?.length) {
      const responseKey = selection.alias?.value ?? selection.name.value;
      const fieldSelection = mergableFieldSelections.get(responseKey);
      if (!fieldSelection) {
        mergableFieldSelections.set(responseKey, selection);
      } else if (selection.selectionSet) {
        mergableFieldSelections.set(responseKey, {
          ...fieldSelection,
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: fieldSelection.selectionSet
              ? [...fieldSelection.selectionSet.selections, ...selection.selectionSet.selections]
              : selection.selectionSet.selections,
          },
        });
      }
    } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
      fragmentSpreads.add(selection.name.value);
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      const typeCondition = selection.typeCondition?.name.value || 'anonymous';
      const inlineFragment = inlineFragments.get(typeCondition);
      if (!inlineFragment) {
        inlineFragments.set(typeCondition, selection);
      } else {
        inlineFragments.set(typeCondition, {
          ...selection,
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: inlineFragment.selectionSet.selections.concat(
              selection.selectionSet.selections,
            ),
          },
        });
      }
    } else {
      nonMergableSelections.push(selection);
    }
  }
  // Cleanup extra fields from inline fragment
  const cleanedUpInlineFragments: InlineFragmentNode[] = [];
  for (const inlineFragment of inlineFragments.values()) {
    const dedupedSelectionSet = deduplicateSelectionSet(inlineFragment.selectionSet);
    const newSelections: SelectionNode[] = [];
    for (const selection of dedupedSelectionSet.selections) {
      if (selection.kind === Kind.FIELD) {
        newSelections.push({
          ...selection,
          selectionSet: selection.selectionSet
            ? deduplicateSelectionSet(selection.selectionSet)
            : undefined,
        });
      } else if (selection.kind === Kind.INLINE_FRAGMENT) {
        const dedupedSelectionSet = deduplicateSelectionSet(selection.selectionSet);
        if (
          !selection.typeCondition ||
          selection.typeCondition.name.value === inlineFragment.typeCondition?.name.value
        ) {
          for (const innerSelection of dedupedSelectionSet.selections) {
            newSelections.push(innerSelection);
          }
        } else {
          newSelections.push({
            ...selection,
            selectionSet: dedupedSelectionSet,
          });
        }
      } else {
        newSelections.push(selection);
      }
    }
    if (newSelections.length) {
      cleanedUpInlineFragments.push({
        ...inlineFragment,
        selectionSet: {
          kind: Kind.SELECTION_SET,
          selections: newSelections,
        },
      });
    }
  }

  return {
    ...node,
    selections: [
      ...nonMergableSelections,
      ...Array.from(mergableFieldSelections.values()).map(
        (fieldSelection: FieldNode): FieldNode => ({
          ...fieldSelection,
          selectionSet: fieldSelection.selectionSet
            ? deduplicateSelectionSet(fieldSelection.selectionSet)
            : undefined,
        }),
      ),
      ...cleanedUpInlineFragments,
      ...Array.from(fragmentSpreads).map(
        (fragmentName: string): FragmentSpreadNode => ({
          kind: Kind.FRAGMENT_SPREAD,
          name: {
            kind: Kind.NAME,
            value: fragmentName,
          },
        }),
      ),
    ],
  };
}

// This deduplicates a document by merging fields with the same response key or fragment spreads with the same name
export function deduplicateDocument(document: DocumentNode): DocumentNode {
  return visit(document, {
    [Kind.SELECTION_SET]: deduplicateSelectionSet,
  });
}
