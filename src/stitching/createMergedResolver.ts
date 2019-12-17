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
  dehoist?: boolean | string;
}): IFieldResolver<any, any> {
  const fromFieldResolver: IFieldResolver<any, any> = fromField ?
    (parent, args, context, info) => defaultMergedResolver(parent, args, context, {
      ...info,
      fieldName: fromField,
    }) :
    defaultMergedResolver;

  const noParentResolver: IFieldResolver<any, any> =
    (parent, args, context, info) => parent ?
      parent instanceof Error ?
        parent :
        fromFieldResolver(parent, args, context, info)
      : {};

  const unwrappingResolver: IFieldResolver<any, any> = fromPath ?
    (parent, args, context, info) =>
      noParentResolver(unwrapResult(parent, info, fromPath), args, context, info) :
    noParentResolver;

  const delimeter = dehoist === 'string' ? dehoist : '__gqltf__';
  return dehoist ?
    (parent, args, context, info) =>
      unwrappingResolver(dehoistResult(parent, delimeter), args, context, info) :
    unwrappingResolver;
}
