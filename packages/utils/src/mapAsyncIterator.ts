/**
 * Given an AsyncIterator and a callback function, return an AsyncIterator
 * which produces values mapped via calling the callback function.
 *
 * Implementation adapted from:
 * https://github.com/repeaterjs/repeater/issues/48#issuecomment-569134039
 * so that all payloads will be delivered in the original order
 */

import { Repeater } from '@repeaterjs/repeater';

export function mapAsyncIterator<T, U>(
  iterator: AsyncIterator<T>,
  mapValue: (value: T) => Promise<U> | U
): AsyncIterableIterator<U> {
  const returner = iterator.return?.bind(iterator) ?? (() => true);

  return new Repeater(async (push, stop) => {
    let earlyReturn: any;
    stop.then(() => {
      earlyReturn = returner();
    });

    /* eslint-disable no-unmodified-loop-condition */
    while (!earlyReturn) {
      const iteration = await iterator.next();

      if (iteration.done) {
        stop();
        return iteration.value;
      }

      await push(mapValue(iteration.value));
    }
    /* eslint-enable no-unmodified-loop-condition */

    await earlyReturn;
  });
}
