import { MaybePromise } from './executor.js';
import { isPromise } from './jsutils.js';

export function mapMaybePromise<T, R>(
  value: MaybePromise<T>,
  mapper: (v: T) => MaybePromise<R>,
  errorMapper?: (e: any) => MaybePromise<R>,
): MaybePromise<R> {
  if (isPromise(value)) {
    if (errorMapper) {
      try {
        return value.then(mapper, errorMapper);
      } catch (e) {
        return errorMapper(e);
      }
    }
    return value.then(mapper);
  }
  if (errorMapper) {
    try {
      return mapper(value);
    } catch (e) {
      return errorMapper(e);
    }
  }
  return mapper(value);
}
