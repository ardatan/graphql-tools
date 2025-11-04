import { GraphQLError } from 'graphql';
import { ExecutionResult } from './Interfaces.js';
import { mergeDeep } from './mergeDeep.js';

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
      setObjectKeyPath(executionResult, path, item);
      // Increment the last path segment (the array index) to merge the next item at the next index
      (path[path.length - 1] as number)++;
    }
  }

  if (incrementalResult.data) {
    setObjectKeyPath(executionResult, path, incrementalResult.data);
  }

  if (incrementalResult.errors) {
    executionResult.errors = executionResult.errors || [];
    (executionResult.errors as GraphQLError[]).push(...incrementalResult.errors);
  }

  if (incrementalResult.extensions) {
    setObjectKeyPath(executionResult, ['extensions'], incrementalResult.extensions);
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

function setObjectKeyPath(obj: Record<string, any>, keyPath: (string | number)[], value: any) {
  let current = obj;
  let i: number;
  for (i = 0; i < keyPath.length - 1; i++) {
    const key = keyPath[i];
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return;
    }
    if (current[key] == null) {
      // Determine if the next key is a number to create an array, otherwise create an object
      current[key] = typeof keyPath[i + 1] === 'number' ? [] : {};
    }
    current = current[key];
  }
  const finalKey = keyPath[i];
  if (finalKey === '__proto__' || finalKey === 'constructor' || finalKey === 'prototype') {
    return;
  }
  const existingValue = current[finalKey];
  current[finalKey] = existingValue != null ? mergeDeep([existingValue, value]) : value;
}
