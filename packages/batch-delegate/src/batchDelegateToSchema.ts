import { BatchDelegateOptions } from './types';

import { getLoader } from './getLoader';

export function batchDelegateToSchema(options: BatchDelegateOptions): any {
  const loader = getLoader(options);
  return loader.load(options.key);
}
