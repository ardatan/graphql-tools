// adapted from: https://stackoverflow.com/questions/63543455/how-to-multicast-an-async-iterable
// and: https://gist.github.com/jed/cc1e949419d42e2cb26d7f2e1645864d
// and also: https://github.com/repeaterjs/repeater/issues/48#issuecomment-569134039

import { Push, Stop, Repeater } from '@repeaterjs/repeater';

type Splitter<T> = (item: T) => [number | undefined, T];

export function split<T>(asyncIterable: AsyncIterableIterator<T>, n: number, splitter: Splitter<T>) {
  const iterator = asyncIterable[Symbol.asyncIterator]();
  const returner = iterator.return?.bind(iterator) ?? (() => {});

  const buffers: Array<Array<IteratorResult<T>>> = Array(n);
  for (let i = 0; i < n; i++) {
    buffers[i] = [];
  }

  const set: Set<number> = new Set();
  return buffers.map((buffer, index) => {
    set.add(index);
    return new Repeater(async (push, stop) => {
      let earlyReturn: any;
      stop.then(() => {
        set.delete(index);
        if (!set.size) {
          earlyReturn = returner();
        }
      });

      await loop(push, stop, earlyReturn, buffer, buffers, iterator, splitter);

      await earlyReturn;
    });
  });
}

async function loop<T>(
  push: Push<T>,
  stop: Stop,
  earlyReturn: Promise<any> | any,
  buffer: Array<IteratorResult<T>>,
  buffers: Array<Array<IteratorResult<T>>>,
  iterator: AsyncIterator<T>,
  splitter: Splitter<T>
): Promise<void> {
  /* eslint-disable no-unmodified-loop-condition */
  while (!earlyReturn) {
    const iteration = await next(buffer, buffers, iterator, splitter);

    if (iteration === undefined) {
      continue;
    }

    if (iteration.done) {
      stop();
      return iteration.value;
    }

    await push(iteration.value);
  }
  /* eslint-enable no-unmodified-loop-condition */
}

async function next<T>(
  buffer: Array<IteratorResult<T>>,
  buffers: Array<Array<IteratorResult<T>>>,
  iterator: AsyncIterator<T>,
  splitter: Splitter<T>
): Promise<IteratorResult<T> | undefined> {
  const existingIteration = buffer.shift();

  if (existingIteration !== undefined) {
    return existingIteration;
  }

  const iterationCandidate = await iterator.next();

  let tee = true;
  const value = iterationCandidate.value;
  if (value !== undefined) {
    const [iterationIndex, newValue] = splitter(value);

    if (iterationIndex !== undefined) {
      buffers[iterationIndex].push({
        ...iterationCandidate,
        value: newValue,
      });
      tee = false;
    }
  }

  if (tee) {
    for (const b of buffers) {
      b.push(iterationCandidate);
    }
  }

  return buffer.shift();
}
