import pLimit from 'p-limit';
import cpus from 'cpus';

export function getConcurrencyLimiter() {
  return pLimit(cpus().length);
}
