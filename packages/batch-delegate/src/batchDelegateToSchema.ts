import { BatchDelegateOptions } from './types';

import { getLoader } from './getLoader';

export function batchDelegateToSchema(options: BatchDelegateOptions): any {
  const key = options.key;
  if (key == null) {
    return null;
  } else if (Array.isArray(key) && !key.length) {
    return [];
  }
  const loader = getLoader(options);

  if (options.keyIsEmpty) {
    const cacheKeyFn = options.dataLoaderOptions?.cacheKeyFn;

    (Array.isArray(key) ? key : [key]).forEach(k => {
      if (options.keyIsEmpty(k)) {
        loader.prime(cacheKeyFn ? cacheKeyFn(k) : k, null);
      }
    });
  }

  return Array.isArray(key) ? loader.loadMany(key) : loader.load(key);
}
