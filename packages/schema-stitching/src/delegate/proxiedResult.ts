import { GraphQLError, responsePathAsArray, GraphQLResolveInfo } from 'graphql';

import { SubschemaConfig, mergeDeep } from '@graphql-tools/utils';

import { handleNull } from './results/handleNull';

import { relocatedError, setErrors, getErrors } from './errors';
import { ERROR_SYMBOL, FIELD_SUBSCHEMA_MAP_SYMBOL, OBJECT_SUBSCHEMA_SYMBOL } from './symbols';
import { getSubschema, setObjectSubschema } from './subSchema';

export function isProxiedResult(result: any) {
  return result != null ? result[ERROR_SYMBOL] : result;
}

export function unwrapResult(parent: any, info: GraphQLResolveInfo, path: Array<string>): any {
  let newParent: any = parent;
  const pathLength = path.length;
  for (let i = 0; i < pathLength; i++) {
    const responseKey = path[i];
    const errors = getErrors(newParent, responseKey);
    const subschema = getSubschema(newParent, responseKey);

    const object = newParent[responseKey];
    if (object == null) {
      return handleNull(info.fieldNodes, responsePathAsArray(info.path), errors);
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

export function mergeProxiedResults(target: any, ...sources: any): any {
  const errors = target[ERROR_SYMBOL].concat(sources.map((source: any) => source[ERROR_SYMBOL]));
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
