import { dset } from 'dset/merge';
import { GraphQLError } from 'graphql';
import { ExecutionResult } from './Interfaces.js';

export function mergeIncrementalResult({
  incrementalResult,
  executionResult,
}: {
  incrementalResult: ExecutionResult;
  executionResult: ExecutionResult;
}) {
  const path = ['data', ...(incrementalResult.path ?? [])];

  if (incrementalResult.items) {
    for (const item of incrementalResult.items) {
      dset(executionResult, path, item);
      // Increment the last path segment (the array index) to merge the next item at the next index
      (path[path.length - 1] as number)++;
    }
  }

  if (incrementalResult.data) {
    dset(executionResult, path, incrementalResult.data);
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
}
