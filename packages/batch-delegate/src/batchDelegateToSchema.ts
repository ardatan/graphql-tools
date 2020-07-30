import { BatchDelegateOptions, DataLoaderCache } from './types';

import { getLoader } from './getLoader';

export function batchDelegateToSchema<K = any, V = any, C = K>(options: BatchDelegateOptions): any {
  let cache: DataLoaderCache<K, V, C>;

  const loader = getLoader(cache, options);
  return loader.load(options.key);
}
