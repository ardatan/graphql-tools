import { SelectionSetNode, TypeNameMetaFieldDef } from 'graphql';

import { MappingInstruction } from './types';

import { addProperty } from './properties';
import { pathsFromSelectionSets } from './pathsFromSelectionSets';

export function expandUnqualifiedKeys(
  value: any,
  mappingInstructions: Array<MappingInstruction>,
  selectionSets: Array<SelectionSetNode>
): { value: any; mappingInstructions: Array<MappingInstruction> } {
  const paths = pathsFromSelectionSets(selectionSets);
  const newMappingInstructions: Array<MappingInstruction> = [];
  mappingInstructions.forEach(mappingInstruction => {
    const { destinationPath, sourcePath } = mappingInstruction;
    if (sourcePath.length) {
      newMappingInstructions.push(mappingInstruction);
    } else {
      if (value == null) {
        value = Object.create(null);
      }
      paths.forEach(path => {
        const newDestinationPath = destinationPath.concat(path);
        addProperty(value, newDestinationPath, null);
        newMappingInstructions.push({
          destinationPath: newDestinationPath,
          sourcePath: path,
        });
      });
      const typeNamePath = destinationPath.concat([TypeNameMetaFieldDef.name]);
      addProperty(value, typeNamePath, null);
      newMappingInstructions.push({
        destinationPath: typeNamePath,
        sourcePath: [TypeNameMetaFieldDef.name],
      });
    }
  });
  return {
    value,
    mappingInstructions: newMappingInstructions,
  };
}
