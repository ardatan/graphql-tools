import { isPromise } from '@graphql-tools/utils';
import { PromiseOrValue } from '../execution/types.js';
import { expectJSON } from './expectJSON.js';

export function expectMatchingValues<T>(values: ReadonlyArray<T>): T {
  const [firstValue, ...remainingValues] = values;
  for (const value of remainingValues) {
    expectJSON(value).toDeepEqual(firstValue);
  }
  return firstValue;
}

export function expectEqualPromisesOrValues<T>(items: ReadonlyArray<PromiseOrValue<T>>): PromiseOrValue<T> {
  const [firstItem, ...remainingItems] = items;
  if (isPromise(firstItem)) {
    if (remainingItems.every(isPromise)) {
      return Promise.all(items).then(expectMatchingValues);
    }
  } else if (remainingItems.every(item => !isPromise(item))) {
    return expectMatchingValues(items);
  }
  throw new Error('Cannot compare promises and values');
}
