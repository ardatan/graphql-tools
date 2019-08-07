import { IFieldResolver } from '../Interfaces';
import { defaultMergedResolver } from '../stitching';
import { FieldNode } from 'graphql';
import { collectFields } from './collectFields';

export function wrapField(wrapper: string, fieldName: string): IFieldResolver<any, any> {
  return (parent, args, context, info) =>
    defaultMergedResolver(parent[wrapper], args, context, { ...info, fieldName });
}

export function extractField(fieldName: string): IFieldResolver<any, any> {
  return (parent, args, context, info) => {
    const newFieldNodes: Array<FieldNode> = [];

    let noMatchingFields = true;
    info.fieldNodes.forEach(fieldNode => {
      collectFields(fieldNode.selectionSet, info.fragments).forEach(selection => {
        if (selection.name.value === fieldName) {
          newFieldNodes.push(selection);
          noMatchingFields = false;
        }
      });
    });

    if (noMatchingFields) {
      return null;
    }

    return defaultMergedResolver(parent, args, context, {
      ...info,
      fieldName,
      fieldNodes: newFieldNodes,
    });
  };
}

export function renameField(fieldName: string): IFieldResolver<any, any> {
  return (parent, args, context, info) => {
    return defaultMergedResolver(parent, args, context, {
      ...info,
      fieldName,
    });
  };
}
