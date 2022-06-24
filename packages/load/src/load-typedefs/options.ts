import { LoadTypedefsOptions } from './../load-typedefs.js';
import { cwd } from 'process';

export function applyDefaultOptions<T>(options: LoadTypedefsOptions<Partial<T>>) {
  options.cache = options.cache || {};
  options.cwd = options.cwd || cwd();
  options.sort = 'sort' in options ? options.sort : true;
}
