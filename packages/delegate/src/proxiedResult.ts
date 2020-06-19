import {
  mergeDeep,
  ERROR_SYMBOL,
  relocatedError,
  setErrors,
  getErrors,
  getDepth,
  setDepth,
} from '@graphql-tools/utils';

import { handleNull } from './results/handleNull';

import { FIELD_SUBSCHEMA_MAP_SYMBOL, OBJECT_SUBSCHEMA_SYMBOL } from './symbols';
import { getSubschema, setObjectSubschema } from './Subschema';
import { SubschemaConfig } from './types';
import { GraphQLError } from 'graphql';

export function isProxiedResult(result: any) {
  return result != null ? result[ERROR_SYMBOL] : result;
}

export function unwrapResult(parent: any, path: Array<string>): any {
  let newParent: any = parent;
  const pathLength = path.length;
  for (let i = 0; i < pathLength; i++) {
    const responseKey = path[i];
    const errors = getErrors(newParent, responseKey);
    let depth = getDepth(newParent);
    const subschema = getSubschema(newParent, responseKey);

    const object = newParent[responseKey];
    if (object == null) {
      return handleNull(errors);
    }

    depth = depth + 1;
    setErrors(
      object,
      errors.map(error => relocatedError(error, path.splice(depth, 0, responseKey))),
      depth
    );
    setDepth(object, depth);
    setObjectSubschema(object, subschema);

    newParent = object;
  }

  return newParent;
}

export function dehoistResult(parent: any, delimeter = '__gqltf__'): any {
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
    const path = error.relativePath.slice();
    const pathSegment = path.pop();
    const expandedPathSegment: Array<string | number> = (pathSegment as string).split(delimeter);
    return {
      relativePath: path.concat(expandedPathSegment),
      // setting path to null will cause issues for errors that bubble up from non nullable fields
      graphQLError: relocatedError(error.graphQLError, null),
    };
  });

  result[OBJECT_SUBSCHEMA_SYMBOL] = parent[OBJECT_SUBSCHEMA_SYMBOL];

  return result;
}

export function mergeProxiedResults(target: any, ...sources: any): any {
  const errors = Object.assign(target[ERROR_SYMBOL], ...sources.map((source: any) => source[ERROR_SYMBOL]));
  const fieldSubschemaMap = sources.reduce((acc: Record<any, SubschemaConfig>, source: any) => {
    const subschema = source[OBJECT_SUBSCHEMA_SYMBOL];
    Object.keys(source).forEach(key => {
      acc[key] = subschema;
    });
    return acc;
  }, {});
  const result = sources.reduce(mergeDeep, target);
  result[ERROR_SYMBOL] = errors;
  result[FIELD_SUBSCHEMA_MAP_SYMBOL] = target[FIELD_SUBSCHEMA_MAP_SYMBOL]
    ? mergeDeep(target[FIELD_SUBSCHEMA_MAP_SYMBOL], fieldSubschemaMap)
    : fieldSubschemaMap;
  return result;
}
