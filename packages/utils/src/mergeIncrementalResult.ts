import delve from 'dlv';
import { dset } from 'dset/merge';
import { GraphQLError } from 'graphql';
import { ExecutionResult } from './Interfaces.js';

const pathsMap = new WeakMap<ExecutionResult, Map<string, ReadonlyArray<string | number>>>();

export function mergeIncrementalResult({
  incrementalResult,
  executionResult,
}: {
  incrementalResult: ExecutionResult;
  executionResult: ExecutionResult;
}) {
  let path: ReadonlyArray<string | number> | undefined = [
    'data',
    ...(incrementalResult.path ?? []),
  ];

  for (const result of [executionResult, incrementalResult]) {
    if (result.pending) {
      let paths = pathsMap.get(executionResult);
      if (paths === undefined) {
        paths = new Map();
        pathsMap.set(executionResult, paths);
      }

      for (const { id, path } of result.pending) {
        paths.set(id, ['data', ...path]);
      }
    }
  }

  const items = incrementalResult.items;
  if (items) {
    const id = incrementalResult.id;
    if (id) {
      path = pathsMap.get(executionResult)?.get(id);
      if (path === undefined) {
        throw new Error('Invalid incremental delivery format.');
      }

      const list = delve(executionResult, path as Array<string | number>);
      list.push(...items);
    } else {
      const path = ['data', ...(incrementalResult.path ?? [])];
      for (const item of items) {
        dset(executionResult, path, item);
        // Increment the last path segment (the array index) to merge the next item at the next index
        (path[path.length - 1] as number)++;
      }
    }
  }

  const data = incrementalResult.data;
  if (data) {
    const id = incrementalResult.id;
    if (id) {
      path = pathsMap.get(executionResult)?.get(id);
      if (path === undefined) {
        throw new Error('Invalid incremental delivery format.');
      }
      const subPath = incrementalResult.subPath;
      if (subPath !== undefined) {
        path = [...path, ...subPath];
      }
    }
    dset(executionResult, path, data);
  }

  if (incrementalResult.errors) {
    executionResult.errors = executionResult.errors || [];
    (executionResult.errors as GraphQLError[]).push(...incrementalResult.errors);
  }

  if (incrementalResult.extensions) {
    dset(executionResult, 'extensions', incrementalResult.extensions);
  }

  if (incrementalResult.incremental) {
    incrementalResult.incremental.forEach(incrementalSubResult => {
      mergeIncrementalResult({
        incrementalResult: incrementalSubResult,
        executionResult,
      });
    });
  }

  if (incrementalResult.completed) {
    // Remove tracking and add additional errors
    for (const { id, errors } of incrementalResult.completed) {
      pathsMap.get(executionResult)?.delete(id);

      if (errors) {
        executionResult.errors = executionResult.errors || [];
        (executionResult.errors as GraphQLError[]).push(...errors);
      }
    }
  }
}
