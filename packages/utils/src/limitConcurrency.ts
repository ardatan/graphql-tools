import pLimit from 'p-limit';

export const concurrentLimiter = pLimit(1000);
