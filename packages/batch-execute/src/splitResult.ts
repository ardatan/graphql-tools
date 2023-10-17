// adapted from https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js

import { GraphQLError } from 'graphql';
import { ExecutionResult, relocatedError } from '@graphql-tools/utils';
import { parseKey, parseKeyFromPath } from './prefix.js';

/**
 * Split and transform result of the query produced by the `merge` function
 */
export function splitResult(
  { data, errors }: ExecutionResult,
  numResults: number,
): Array<ExecutionResult> {
  const splitResults: Array<ExecutionResult> = [];
  for (let i = 0; i < numResults; i++) {
    splitResults.push({});
  }

  if (data) {
    for (const prefixedKey in data) {
      const { index, originalKey } = parseKey(prefixedKey);
      const result = splitResults[index];
      if (result == null) {
        continue;
      }
      if (result.data == null) {
        result.data = { [originalKey]: data[prefixedKey] };
      } else {
        result.data[originalKey] = data[prefixedKey];
      }
    }
  }

  if (errors) {
    for (const error of errors) {
      if (error.path) {
        const { index, originalKey, keyOffset } = parseKeyFromPath(error.path);
        const newError = relocatedError(error, [originalKey, ...error.path.slice(keyOffset)]);
        const resultErrors = (splitResults[index].errors = (splitResults[index].errors ||
          []) as GraphQLError[]);
        resultErrors.push(newError);
      } else {
        splitResults.forEach(result => {
          const resultErrors = (result.errors = (result.errors || []) as GraphQLError[]);
          resultErrors.push(error);
        });
      }
    }
  }

  return splitResults;
}
