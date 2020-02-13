import { GraphQLError, GraphQLSchema, responsePathAsArray } from 'graphql';

import { SubschemaConfig, IGraphQLToolsResolveInfo } from '../Interfaces';
import { mergeDeep } from '../utils';

import { handleNull } from './checkResultAndHandleErrors';
import { relocatedError } from './errors';

const hasSymbol =
  (typeof global !== 'undefined' && 'Symbol' in global) ||
  // eslint-disable-next-line no-undef
  (typeof window !== 'undefined' && 'Symbol' in window);

export const OBJECT_SUBSCHEMA_SYMBOL = hasSymbol
  ? Symbol('initialSubschema')
  : '@@__initialSubschema';
export const FIELD_SUBSCHEMA_MAP_SYMBOL = hasSymbol
  ? Symbol('subschemaMap')
  : '@@__subschemaMap';
export const ERROR_SYMBOL = hasSymbol
  ? Symbol('subschemaErrors')
  : '@@__subschemaErrors';

export function isProxiedResult(result: any) {
  return result != null ? result[ERROR_SYMBOL] : result;
}

export function getSubschema(
  result: any,
  responseKey: string,
): GraphQLSchema | SubschemaConfig {
  const subschema =
    result[FIELD_SUBSCHEMA_MAP_SYMBOL] &&
    result[FIELD_SUBSCHEMA_MAP_SYMBOL][responseKey];
  return subschema ? subschema : result[OBJECT_SUBSCHEMA_SYMBOL];
}

export function setObjectSubschema(
  result: any,
  subschema: GraphQLSchema | SubschemaConfig,
) {
  result[OBJECT_SUBSCHEMA_SYMBOL] = subschema;
}

export function setErrors(result: any, errors: Array<GraphQLError>) {
  result[ERROR_SYMBOL] = errors;
}

export function getErrors(
  result: any,
  pathSegment: string,
): Array<GraphQLError> {
  const errors = result != null ? result[ERROR_SYMBOL] : result;

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
  let newParent: any = parent;
  const pathLength = path.length;
  for (let i = 0; i < pathLength; i++) {
    const responseKey = path[i];
    const errors = getErrors(newParent, responseKey);
    const subschema = getSubschema(newParent, responseKey);

    const object = newParent[responseKey];
    if (object == null) {
      return handleNull(
        info.fieldNodes,
        responsePathAsArray(info.path),
        errors,
      );
    }

    setErrors(
      object,
      errors.map(error =>
        relocatedError(
          error,
          error.nodes,
          error.path != null ? error.path.slice(1) : undefined,
        ),
      ),
    );
    setObjectSubschema(object, subschema);

    newParent = object;
  }

  return newParent;
}

export function dehoistResult(
  parent: any,
  delimeter: string = '__gqltf__',
): any {
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
      const expandedPathSegment: Array<
        string | number
      > = (pathSegment as string).split(delimeter);
      return relocatedError(
        error,
        error.nodes,
        expandedPathSegment.concat(path),
      );
    }

    return error;
  });

  result[OBJECT_SUBSCHEMA_SYMBOL] = parent[OBJECT_SUBSCHEMA_SYMBOL];

  return result;
}

export function mergeProxiedResults(target: any, ...sources: any): any {
  const errors = target[ERROR_SYMBOL].concat(
    sources.map((source: any) => source[ERROR_SYMBOL]),
  );
  const fieldSubschemaMap = sources.reduce(
    (acc: Record<any, SubschemaConfig>, source: any) => {
      const subschema = source[OBJECT_SUBSCHEMA_SYMBOL];
      Object.keys(source).forEach(key => {
        acc[key] = subschema;
      });
      return acc;
    },
    {},
  );
  const result = mergeDeep(target, ...sources);
  result[ERROR_SYMBOL] = errors;
  result[FIELD_SUBSCHEMA_MAP_SYMBOL] = target[FIELD_SUBSCHEMA_MAP_SYMBOL]
    ? mergeDeep(target[FIELD_SUBSCHEMA_MAP_SYMBOL], fieldSubschemaMap)
    : fieldSubschemaMap;
  return result;
}
