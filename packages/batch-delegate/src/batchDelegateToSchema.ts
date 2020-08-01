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
  return Array.isArray(key) ? loader.loadMany(key) : loader.load(key);
}
