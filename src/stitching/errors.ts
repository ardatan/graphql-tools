import { GraphQLResolveInfo, responsePathAsArray } from 'graphql';
import { locatedError } from 'graphql/error';

const ERROR_SYMBOL = Symbol('subSchemaErrors');

export function annotateWithChildrenErrors(
  object: any,
  childrenErrors: Array<{ path?: Array<string | number> }>,
): any {
  if (childrenErrors && childrenErrors.length > 0) {
    if (Array.isArray(object)) {
      const byIndex = {};
      childrenErrors.forEach(error => {
        const index = error.path[1];
        const current = byIndex[index] || [];
        current.push({
          ...error,
          path: error.path.slice(1),
        });
        byIndex[index] = current;
      });
      return object.map((item, index) =>
        annotateWithChildrenErrors(item, byIndex[index]),
      );
    } else {
      return {
        ...object,
        [ERROR_SYMBOL]: childrenErrors.map(error => ({
          ...error,
          path: error.path.slice(1),
        })),
      };
    }
  } else {
    return object;
  }
}

export function getErrorsFromParent(
  object: any,
  fieldName: string,
):
  | {
      kind: 'OWN';
      error: any;
    }
  | {
      kind: 'CHILDREN';
      errors?: Array<{ path?: Array<string | number> }>;
    } {
  const errors = (object && object[ERROR_SYMBOL]) || [];
  const childrenErrors: Array<{ path?: Array<string | number> }> = [];
  for (const error of errors) {
    if (error.path.length === 1 && error.path[0] === fieldName) {
      return {
        kind: 'OWN',
        error,
      };
    } else if (error.path[0] === fieldName) {
      childrenErrors.push(error);
    }
  }
  return {
    kind: 'CHILDREN',
    errors: childrenErrors,
  };
}

class CombinedError extends Error {
  public errors: Error[];
  constructor(message: string, errors: Error[]) {
    super(message);
    this.errors = errors;
  }
}

export function checkResultAndHandleErrors(
  result: any,
  info: GraphQLResolveInfo,
  responseKey?: string,
): any {
  if (!responseKey) {
    responseKey = info.fieldNodes[0].alias
      ? info.fieldNodes[0].alias.value
      : info.fieldName;
  }
  if (result.errors && (!result.data || result.data[responseKey] == null)) {
    const errorMessage = result.errors
      .map((error: { message: string }) => error.message)
      .join('\n');
    const combinedError = new CombinedError(errorMessage, result.errors);

    throw locatedError(
      combinedError,
      info.fieldNodes,
      responsePathAsArray(info.path),
    );
  } else {
    let resultObject = result.data[responseKey];
    if (result.errors) {
      resultObject = annotateWithChildrenErrors(
        resultObject,
        result.errors as Array<{ path?: Array<string> }>,
      );
    }
    return resultObject;
  }
}
