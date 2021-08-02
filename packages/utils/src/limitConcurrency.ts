import pLimit from 'p-limit';
import cpus from 'cpus';

export const limitConcurrency = pLimit(cpus().length || 3);
