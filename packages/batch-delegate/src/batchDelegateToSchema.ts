import { BatchDelegateOptions } from './types';

import { getLoader } from './getLoader';

const emptyKeys = [null, undefined];

export function batchDelegateToSchema(options: BatchDelegateOptions): any {
  if (emptyKeys.includes(options.key)) {
    return null;
  } else if (Array.isArray(options.key) && !options.key.length) {
    return [];
  }
  const loader = getLoader(options);
  return Array.isArray(options.key) ? loader.loadMany(options.key) : loader.load(options.key);
}
