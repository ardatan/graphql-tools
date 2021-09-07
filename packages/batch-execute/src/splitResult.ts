// adapted from https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js

import { ExecutionResult, GraphQLError } from 'graphql';

import { relocatedError } from '@graphql-tools/utils';

import { parseKey } from './prefix';

/**
 * Split and transform result of the query produced by the `merge` function
 */
export function splitResult({ data, errors }: ExecutionResult, results: ExecutionResult[], start: number) {
  if (data) {
    for (const prefixedKey in data) {
      const { index, originalKey } = parseKey(prefixedKey);
      const indexInResults = start + index;
      const result = (results[indexInResults] = results[indexInResults] || {});
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
        const parsedKey = parseKey(error.path[0] as string);
        const { index, originalKey } = parsedKey;
        const newError = relocatedError(error, [originalKey, ...error.path.slice(1)]);
        const indexInResults = start + index;
        const result = (results[indexInResults] = results[indexInResults] || {});
        const errors = (result.errors = (result.errors || []) as GraphQLError[]);
        errors.push(newError);
      }
    }
  }
}
