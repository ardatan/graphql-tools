import { IFieldResolver } from '../Interfaces';
import { unwrapResult, dehoistResult } from './proxiedResult';
import defaultMergedResolver from './defaultMergedResolver';

export function createMergedResolver({
  fromPath,
  fromField,
  dehoist,
}: {
  fromPath?: Array<string>;
  fromField?: string;
  dehoist?: string;
}): IFieldResolver<any, any> {
  return (parent, args, context, info) => {
    if (dehoist) {
      parent = dehoistResult(parent, dehoist);
    }

    if (fromPath) {
      parent = unwrapResult(parent, info, fromPath);
    }

    if (!parent) {
      parent = {};
    }

    return parent instanceof Error ?
      parent : fromField ?
        defaultMergedResolver(parent, args, context, {
          ...info,
          fieldName: fromField,
        }) :
        defaultMergedResolver(parent, args, context, info);
  };
}
