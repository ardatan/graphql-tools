/**
 * Given an AsyncIterator and a callback function, return an AsyncIterator
 * which produces values mapped via calling the callback function.
 *
 * Implementation adapted from:
 * https://github.com/repeaterjs/repeater/issues/48#issuecomment-569134039
 * so that all payloads will be delivered in the original order
 */

import { Push, Stop, Repeater } from '@repeaterjs/repeater';

export function mapAsyncIterator<T, U>(
  iterator: AsyncIterator<T>,
  mapValue: (value: T) => Promise<U> | U,
): AsyncIterableIterator<U> {
  const returner = iterator.return?.bind(iterator) ?? (() => {});

  return new Repeater(async (push, stop) => {
    let earlyReturn: any;
    stop.then(() => {
      earlyReturn = returner();
    });

    await loop(push, stop, earlyReturn, iterator, mapValue);

    await earlyReturn;
  });
}

async function loop<T, U>(
  push: Push<U>,
  stop: Stop,
  earlyReturn: Promise<any> | any,
  iterator: AsyncIterator<T>,
  mapValue: (value: T) => Promise<U> | U,
): Promise<void> {
  /* eslint-disable no-unmodified-loop-condition */
  while (!earlyReturn) {
    const iteration = await next(iterator, mapValue);

    if (iteration.done) {
      if (iteration.value !== undefined) {
        await push(iteration.value);
      }
      stop();
      return;
    }

    await push(iteration.value);
  }
  /* eslint-enable no-unmodified-loop-condition */
}

async function next<T, U>(
  iterator: AsyncIterator<T>,
  mapValue: (value: T) => Promise<U> | U,
): Promise<IteratorResult<U>> {
  const iterationCandidate = await iterator.next();

  const value = iterationCandidate.value;
  if (value === undefined) {
    return iterationCandidate as IteratorResult<U>;
  }

  const newValue = await mapValue(iterationCandidate.value);

  return {
    ...iterationCandidate,
    value: newValue,
  };
}
