import pLimit from 'p-limit';
import cpus from 'cpus';

function createLimitConcurrency() {
  let concurrency: number;
  try {
    concurrency = cpus().length;
  } catch (e) {}
  concurrency = concurrency || 3;
  return pLimit(concurrency);
}

export const limitConcurrency = createLimitConcurrency();
