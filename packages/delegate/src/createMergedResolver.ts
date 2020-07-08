import { GraphQLError } from 'graphql';

import { IFieldResolver, getErrors, setErrors, relocatedError, ERROR_SYMBOL } from '@graphql-tools/utils';

import { OBJECT_SUBSCHEMA_SYMBOL } from './symbols';

import { getSubschema, setObjectSubschema } from './Subschema';

import { defaultMergedResolver } from './defaultMergedResolver';

import { handleNull } from './results/handleNull';

function unwrapResult(parent: any, path: Array<string>): any {
  let newParent: any = parent;
  const pathLength = path.length;
  for (let i = 0; i < pathLength; i++) {
    const responseKey = path[i];
    const errors = getErrors(newParent, responseKey);
    const subschema = getSubschema(newParent, responseKey);

    const object = newParent[responseKey];
    if (object == null) {
      return handleNull(errors);
    }

    setErrors(
      object,
      errors.map(error => relocatedError(error, error.path != null ? error.path.slice(1) : undefined))
    );
    setObjectSubschema(object, subschema);

    newParent = object;
  }

  return newParent;
}

function dehoistResult(parent: any, delimeter = '__gqltf__'): any {
  const result = Object.create(null);

  Object.keys(parent).forEach(alias => {
    let obj = result;

    const fieldNames = alias.split(delimeter);
    const fieldName = fieldNames.pop();
    fieldNames.forEach(key => {
      obj = obj[key] = obj[key] || Object.create(null);
    });
    obj[fieldName] = parent[alias];
  });

  result[ERROR_SYMBOL] = parent[ERROR_SYMBOL].map((error: GraphQLError) => {
    if (error.path != null) {
      const path = error.path.slice();
      const pathSegment = path.shift();
      const expandedPathSegment: Array<string | number> = (pathSegment as string).split(delimeter);
      return relocatedError(error, expandedPathSegment.concat(path));
    }

    return error;
  });

  result[OBJECT_SUBSCHEMA_SYMBOL] = parent[OBJECT_SUBSCHEMA_SYMBOL];

  return result;
}

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
      ? (parent, args, context, info) => parentErrorResolver(unwrapResult(parent, fromPath), args, context, info)
      : parentErrorResolver;

  const dehoistingResolver: IFieldResolver<any, any> = dehoist
    ? (parent, args, context, info) => unwrappingResolver(dehoistResult(parent, delimeter), args, context, info)
    : unwrappingResolver;

  const noParentResolver: IFieldResolver<any, any> = (parent, args, context, info) =>
    parent ? dehoistingResolver(parent, args, context, info) : {};

  return noParentResolver;
}
