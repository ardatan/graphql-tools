import { isPromise, MaybePromise } from '@graphql-tools/utils';
import { expectJSON } from './expectJSON.js';

export function expectMatchingValues<T>(values: ReadonlyArray<T>): T {
  const [firstValue, ...remainingValues] = values;
  for (const value of remainingValues) {
    expectJSON(value).toDeepEqual(firstValue);
  }
  return firstValue;
}

export function expectEqualPromisesOrValues<T>(items: ReadonlyArray<MaybePromise<T>>): MaybePromise<T> {
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
