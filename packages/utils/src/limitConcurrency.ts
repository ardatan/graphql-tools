import pLimit from 'p-limit';
import cpus from 'cpus';

function createLimitConcurrency() {
  let concurrency: number;
  try {
    concurrency = cpus().length;
  } catch (e) {}
  return pLimit(concurrency || 3);
}

export const limitConcurrency = createLimitConcurrency();
