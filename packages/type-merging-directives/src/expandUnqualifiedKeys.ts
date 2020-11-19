import { SelectionSetNode } from 'graphql';

import { KeyDeclaration } from './types';

import { addKey } from './addKey';
import { pathsFromSelectionSets } from './pathsFromSelectionSets';

export interface PreparsedMergeArgsExpr {
  mergeArgsExpr: string;
  expansionExpressions: Record<string, string>;
}

export function expandUnqualifiedKeys(
  value: any,
  keyDeclarations: Array<KeyDeclaration>,
  selectionSets: Array<SelectionSetNode>
): { value: any; keyDeclarations: Array<KeyDeclaration> } {
  const paths = pathsFromSelectionSets(selectionSets);
  const newKeyDeclarations: Array<KeyDeclaration> = [];
  keyDeclarations.forEach(keyDeclaration => {
    if (keyDeclaration.keyPath.length) {
      newKeyDeclarations.push(keyDeclaration);
    } else {
      if (value == null) {
        value = Object.create(null);
      }
      paths.forEach(path => {
        const valuePath = keyDeclaration.valuePath.concat(path);
        addKey(value, valuePath, null);
        newKeyDeclarations.push({
          valuePath,
          keyPath: path,
        });
      });
    }
  });
  return {
    value,
    keyDeclarations: newKeyDeclarations,
  };
}
