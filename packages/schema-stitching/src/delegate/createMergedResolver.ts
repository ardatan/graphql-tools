import { IFieldResolver } from '../Interfaces';

import { unwrapResult, dehoistResult } from './proxiedResult';
import { defaultMergedResolver } from './defaultMergedResolver';

export function createMergedResolver({
  fromPath,
  dehoist,
  delimeter = '__gqltf__',
}: {
  fromPath?: Array<string>;
  dehoist?: boolean;
  delimeter?: string;
}): IFieldResolver<any, any> {
  const parentErrorResolver: IFieldResolver<any, any> = (parent, args, context, info) =>
    parent instanceof Error ? parent : defaultMergedResolver(parent, args, context, info);

  const unwrappingResolver: IFieldResolver<any, any> =
    fromPath != null
      ? (parent, args, context, info) => parentErrorResolver(unwrapResult(parent, info, fromPath), args, context, info)
      : parentErrorResolver;

  const dehoistingResolver: IFieldResolver<any, any> = dehoist
    ? (parent, args, context, info) => unwrappingResolver(dehoistResult(parent, delimeter), args, context, info)
    : unwrappingResolver;

  const noParentResolver: IFieldResolver<any, any> = (parent, args, context, info) =>
    parent ? dehoistingResolver(parent, args, context, info) : {};

  return noParentResolver;
}
