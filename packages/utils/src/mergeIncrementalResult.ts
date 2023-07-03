import { GraphQLError } from 'graphql';
import { dset } from 'dset/merge';
import { ExecutionResult } from './Interfaces.js';

export function mergeIncrementalResult({
  incrementalResult,
  executionResult,
}: {
  incrementalResult: ExecutionResult;
  executionResult: ExecutionResult;
}) {
  if (incrementalResult.path) {
    const path = ['data', ...incrementalResult.path];
    executionResult.data = executionResult.data || {};
    if (incrementalResult.items) {
      for (const item of incrementalResult.items) {
        dset(executionResult, path, item);
      }
    }
    if (incrementalResult.data) {
      dset(executionResult, ['data', ...incrementalResult.path], incrementalResult.data);
    }
  } else if (incrementalResult.data) {
    executionResult.data = executionResult.data || {};
    Object.assign(executionResult.data, incrementalResult.data);
  }
  if (incrementalResult.errors) {
    executionResult.errors = executionResult.errors || [];
    (executionResult.errors as GraphQLError[]).push(...executionResult.errors);
  }
  if (incrementalResult.incremental) {
    incrementalResult.incremental.forEach(mergeIncrementalResults);
  }
}
