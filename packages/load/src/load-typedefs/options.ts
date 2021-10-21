import { LoadTypedefsOptions } from './../load-typedefs';

export function applyDefaultOptions<T>(options: LoadTypedefsOptions<Partial<T>>) {
  options.cache = options.cache || {};
  options.cwd = options.cwd || process?.cwd();
  options.sort = 'sort' in options ? options.sort : true;
}
