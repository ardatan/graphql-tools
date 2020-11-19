import { Kind, SelectionNode, SelectionSetNode } from 'graphql';

export interface PreparsedMergeArgsExpr {
  mergeArgsExpr: string;
  expansionExpressions: Record<string, string>;
}

export function pathsFromSelectionSets(
  selectionSets: Array<SelectionSetNode>,
  path: Array<string> = []
): Array<Array<string>> {
  let paths: Array<Array<string>> = [];
  selectionSets.forEach(selectionSet => {
    paths = paths.concat(selectionSetToPaths(selectionSet, path));
  });
  return paths;
}

function selectionSetToPaths(selectionSet: SelectionSetNode, path: Array<string>): Array<Array<string>> {
  let paths: Array<Array<string>> = [];
  selectionSet.selections.forEach(selection => {
    paths = paths.concat(selectionToPaths(selection, path));
  });
  return paths;
}

function selectionToPaths(selection: SelectionNode, path: Array<string>): Array<Array<string>> {
  if (selection.kind === Kind.FIELD) {
    const responseKey = selection.alias?.value ?? selection.name.value;
    if (selection.selectionSet) {
      return selectionSetToPaths(selection.selectionSet, path.concat([responseKey]));
    } else {
      return [path.concat([responseKey])];
    }
  } else if (selection.kind === Kind.INLINE_FRAGMENT) {
    return selectionSetToPaths(selection.selectionSet, path);
  }
}
