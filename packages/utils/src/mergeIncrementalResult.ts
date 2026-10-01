import { GraphQLError } from 'graphql';
import { ExecutionResult } from './Interfaces.js';
import { hasOwnProperty, isSafeObjectKey } from './jsutils.js';
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
    // Reject the whole items batch if any path segment is unsafe, so a later
    // index increment cannot turn a bad segment into a write at `data.NaN`.
    if (isSafeKeyPath(path)) {
      for (const item of incrementalResult.items) {
        setObjectKeyPath(executionResult, path, item);
        // Increment the last path segment (the array index) to merge the next item at the next index
        (path[path.length - 1] as number)++;
      }
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

function isSafeKeyPath(keyPath: readonly unknown[]): boolean {
  return keyPath.every(isSafeObjectKey);
}

function setObjectKeyPath(obj: Record<string, any>, keyPath: readonly unknown[], value: any) {
  // Validate the full path before creating any parent containers, so a late
  // unsafe segment cannot leave partial writes on executionResult.
  if (!isSafeKeyPath(keyPath)) {
    return;
  }
  let current = obj;
  let i: number;
  for (i = 0; i < keyPath.length - 1; i++) {
    const key = keyPath[i];
    // Direct comparison, not only isSafeObjectKey(): that helper already rejects
    // this key, but the check has to sit on the value used as the property name.
    if (key === '__proto__' || !isSafeObjectKey(key)) {
      return;
    }
    if (!hasOwnProperty(current, key) || current[key] == null) {
      // Determine if the next key is a number to create an array, otherwise create an object
      current[key] = typeof keyPath[i + 1] === 'number' ? [] : {};
    }
    current = current[key];
  }
  const finalKey = keyPath[i];
  if (finalKey === '__proto__' || !isSafeObjectKey(finalKey)) {
    return;
  }
  const existingValue = hasOwnProperty(current, finalKey) ? current[finalKey] : undefined;
  current[finalKey] = existingValue != null ? mergeDeep([existingValue, value]) : value;
}
