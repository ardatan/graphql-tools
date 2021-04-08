import { SelectionSetNode, TypeNameMetaFieldDef } from 'graphql';

import { MappingInstruction } from './types';

import { pathsFromSelectionSet } from './pathsFromSelectionSet';

export function getSourcePaths(
  mappingInstructions: Array<MappingInstruction>,
  selectionSet?: SelectionSetNode
): Array<Array<string>> {
  const sourcePaths: Array<Array<string>> = [];
  mappingInstructions.forEach(mappingInstruction => {
    const { sourcePath } = mappingInstruction;
    if (sourcePath.length) {
      sourcePaths.push(sourcePath);
      return;
    }

    if (selectionSet == null) {
      return;
    }

    const paths = pathsFromSelectionSet(selectionSet);
    paths.forEach(path => sourcePaths.push(path));

    sourcePaths.push([TypeNameMetaFieldDef.name]);
  });

  return sourcePaths;
}
