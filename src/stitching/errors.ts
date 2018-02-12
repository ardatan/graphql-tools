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
        if (!error.path) { return; }
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
          ...(error.path ? { path: error.path.slice(1) } : {}),
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
    // apollo-link-http & http-link-dataloader need the
    // result property to be passed through for better error handling.
    // If there is only one error, which contains a result property, pass the error through
    const newError = result.errors.length === 1 && hasResult(result.errors[0])
      ? result.errors[0] : new Error(concatErrors(result.errors));

    throw locatedError(
      newError,
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

function concatErrors(errors: Error[]) {
  return errors
    .map(error => error.message)
    .join('\n');
}

function hasResult(error: any) {
  return error.result || (error.originalError && error.originalError.result);
}
