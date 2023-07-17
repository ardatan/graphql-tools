import { cwd } from 'process';
import { LoadTypedefsOptions } from './../load-typedefs.js';

export function applyDefaultOptions<T>(options: LoadTypedefsOptions<Partial<T>>) {
  options.cache = options.cache || {};
  options.cwd = options.cwd || cwd();
  options.sort = 'sort' in options ? options.sort : true;
}
