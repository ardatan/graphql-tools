import { SelectionSetNode } from 'graphql';
import { MappingInstruction } from './types';
export declare function getSourcePaths(
  mappingInstructions: Array<MappingInstruction>,
  selectionSet?: SelectionSetNode
): Array<Array<string>>;
