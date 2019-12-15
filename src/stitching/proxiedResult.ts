import {
  GraphQLError,
  GraphQLSchema,
  responsePathAsArray,
} from 'graphql';
import { SubschemaConfig, IGraphQLToolsResolveInfo } from '../Interfaces';
import { handleNull, handleObject } from './checkResultAndHandleErrors';
import { relocatedError } from './errors';

export let SUBSCHEMAS_SYMBOL: any;
export let ERROR_SYMBOL: any;
if (
  (typeof global !== 'undefined' && 'Symbol' in global) ||
  (typeof window !== 'undefined' && 'Symbol' in window)
) {
  SUBSCHEMAS_SYMBOL = Symbol('subschemas');
  ERROR_SYMBOL = Symbol('subschemaErrors');
} else {
  SUBSCHEMAS_SYMBOL = Symbol('subschemas');
  ERROR_SYMBOL = '@@__subschemaErrors';
}

export function isProxiedResult(result: any) {
  return result && result[ERROR_SYMBOL];
}

export function getSubschemas(result: any): Array<GraphQLSchema | SubschemaConfig> {
  return result && result[SUBSCHEMAS_SYMBOL];
}

export function setSubschemas(result: any, subschemas: Array<GraphQLSchema | SubschemaConfig>) {
  result[SUBSCHEMAS_SYMBOL] = subschemas;
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
  path: Array<string> = []
): any {
  const pathLength = path.length;

  for (let i = 0; i < pathLength; i++) {
    const responseKey = path[i];
    const errors = getErrors(parent, responseKey);
    const subschemas = getSubschemas(parent);

    const result = parent[responseKey];
    if (result == null) {
      return handleNull(info.fieldNodes, responsePathAsArray(info.path), errors);
    }
    parent = handleObject(result, errors, subschemas);
  }

  return parent;
}

export function dehoistResult(parent: any, delimeter: string): any {
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

  result[SUBSCHEMAS_SYMBOL] = parent[SUBSCHEMAS_SYMBOL];

  return result;
}
