import { isPromise } from '@graphql-tools/utils';
import type { MaybePromise } from '@graphql-tools/utils';

/**
 * A BoxedPromiseOrValue is a container for a value or promise where the value
 * will be updated when the promise resolves.
 *
 * A BoxedPromiseOrValue may only be used with promises whose possible
 * rejection has already been handled, otherwise this will lead to unhandled
 * promise rejections.
 *
 * @internal
 * */
export class BoxedPromiseOrValue<T> {
  value: MaybePromise<T>;

  constructor(value: MaybePromise<T>) {
    this.value = value;
    if (isPromise(value)) {
      value.then(resolved => {
        this.value = resolved;
      });
    }
  }
}
