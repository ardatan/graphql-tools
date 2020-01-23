import {
  GraphQLError,
  GraphQLSchema,
  responsePathAsArray,
} from 'graphql';
import { SubschemaConfig, IGraphQLToolsResolveInfo } from '../Interfaces';
import { handleNull } from './checkResultAndHandleErrors';
import { relocatedError } from './errors';
import { mergeDeep } from '../utils';

export let OBJECT_SUBSCHEMA_SYMBOL: any;
export let SUBSCHEMA_MAP_SYMBOL: any;
export let ERROR_SYMBOL: any;
if (
  (typeof global !== 'undefined' && 'Symbol' in global) ||
  (typeof window !== 'undefined' && 'Symbol' in window)
) {
  OBJECT_SUBSCHEMA_SYMBOL = Symbol('initialSubschema');
  SUBSCHEMA_MAP_SYMBOL = Symbol('subschemaMap');
  ERROR_SYMBOL = Symbol('subschemaErrors');
} else {
  OBJECT_SUBSCHEMA_SYMBOL = Symbol('@@__initialSubschema');
  SUBSCHEMA_MAP_SYMBOL = Symbol('@@__subschemaMap');
  ERROR_SYMBOL = '@@__subschemaErrors';
}

export function isProxiedResult(result: any) {
  return result && result[ERROR_SYMBOL];
}

export function getSubschema(result: any, responseKey: string): GraphQLSchema | SubschemaConfig {
  const subschema = result[SUBSCHEMA_MAP_SYMBOL] && result[SUBSCHEMA_MAP_SYMBOL][responseKey];
  return subschema ? subschema : result[OBJECT_SUBSCHEMA_SYMBOL];
}

export function setObjectSubschema(result: any, subschema: GraphQLSchema | SubschemaConfig) {
  result[OBJECT_SUBSCHEMA_SYMBOL] = subschema;
}

export function setSubschemaForKey(result: any, responseKey: string, subschema: GraphQLSchema | SubschemaConfig) {
  result[SUBSCHEMA_MAP_SYMBOL] = result[SUBSCHEMA_MAP_SYMBOL] || Object.create(null);
  result[SUBSCHEMA_MAP_SYMBOL][responseKey] = subschema;
}

export function setErrors(result: any, errors: Array<GraphQLError>) {
  result[ERROR_SYMBOL] = errors;
}

export function getErrors(
  result: any,
  pathSegment: string
): Array<GraphQLError> {
  const errors = result && result[ERROR_SYMBOL];

  if (!Array.isArray(errors)) {
    return null;
  }

  const fieldErrors = [];

  for (const error of errors) {
    if (!error.path || error.path[0] === pathSegment) {
      fieldErrors.push(error);
    }
  }

  return fieldErrors;
}

export function unwrapResult(
  parent: any,
  info: IGraphQLToolsResolveInfo,
  path: Array<string>,
): any {
  const pathLength = path.length;
  for (let i = 0; i < pathLength; i++) {
    const responseKey = path[i];
    const errors = getErrors(parent, responseKey);
    const subschema = getSubschema(parent, responseKey);

    const object = parent[responseKey];
    if (object == null) {
      return handleNull(info.fieldNodes, responsePathAsArray(info.path), errors);
    }

    setErrors(object, errors.map(error => {
      return relocatedError(
        error,
        error.nodes,
        error.path ? error.path.slice(1) : undefined
      );
    }));
    setObjectSubschema(object, subschema);

    parent = object;
  }

  return parent;
}

export function dehoistResult(parent: any, delimeter: string = '__gqltf__'): any {
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
    if (error.path) {
      let path = error.path.slice();
      const pathSegment = path.shift();
      const expandedPathSegment: Array<string | number> = (pathSegment as string).split(delimeter);
      return relocatedError(error, error.nodes, expandedPathSegment.concat(path));
    } else {
      return error;
    }
  });

  result[OBJECT_SUBSCHEMA_SYMBOL] = parent[OBJECT_SUBSCHEMA_SYMBOL];

  return result;
}

export function mergeProxiedResults(target: any, ...sources: any): any {
  const errors = target[ERROR_SYMBOL].concat(sources.map((source: any) => source[ERROR_SYMBOL]));
  const subschemaMap = sources.reduce((acc: Record<any, SubschemaConfig>, source: any) => {
    const subschema = source[OBJECT_SUBSCHEMA_SYMBOL];
    Object.keys(source).forEach(key => {
      acc[key] = subschema;
    });
    return acc;
  }, {});
  return mergeDeep(target, ...sources, {
    [ERROR_SYMBOL]: errors,
    [SUBSCHEMA_MAP_SYMBOL]: subschemaMap,
  });
}
