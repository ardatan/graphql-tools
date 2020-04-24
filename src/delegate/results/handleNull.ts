import { FieldNode, GraphQLError } from 'graphql';

import { getErrorsByPathSegment, combineErrors } from '../errors';

export function handleNull(
  fieldNodes: ReadonlyArray<FieldNode>,
  path: Array<string | number>,
  errors: ReadonlyArray<GraphQLError>,
) {
  if (errors.length) {
    if (errors.some((error) => !error.path || error.path.length < 2)) {
      return combineErrors(errors);
    } else if (errors.some((error) => typeof error.path[1] === 'string')) {
      const childErrors = getErrorsByPathSegment(errors);

      const result = {};
      Object.keys(childErrors).forEach((pathSegment) => {
        result[pathSegment] = handleNull(
          fieldNodes,
          [...path, pathSegment],
          childErrors[pathSegment],
        );
      });

      return result;
    }

    const childErrors = getErrorsByPathSegment(errors);

    const result: Array<any> = [];
    Object.keys(childErrors).forEach((pathSegment) => {
      result.push(
        handleNull(
          fieldNodes,
          [...path, parseInt(pathSegment, 10)],
          childErrors[pathSegment],
        ),
      );
    });

    return result;
  }

  return null;
}
