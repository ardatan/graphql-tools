import pLimit from 'p-limit';
import { cpus } from 'os';

export const limitConcurrency = pLimit(cpus().length);
