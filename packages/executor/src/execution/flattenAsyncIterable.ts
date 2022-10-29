type AsyncIterableOrGenerator<T> = AsyncGenerator<T, void, void> | AsyncIterable<T>;

/**
 * Given an AsyncIterable of AsyncIterables, flatten all yielded results into a
 * single AsyncIterable.
 */
export function flattenAsyncIterable<T>(
  iterable: AsyncIterableOrGenerator<AsyncIterableOrGenerator<T>>
): AsyncGenerator<T, void, void> {
  // You might think this whole function could be replaced with
  //
  //    async function* flattenAsyncIterable(iterable) {
  //      for await (const subIterator of iterable) {
  //        yield* subIterator;
  //      }
  //    }
  //
  // but calling `.return()` on the iterator it returns won't interrupt the `for await`.

  const topIterator = iterable[Symbol.asyncIterator]();
  let currentNestedIterator: AsyncIterator<T> | undefined;
  let waitForCurrentNestedIterator: Promise<void> | undefined;
  let done = false;

  async function next(): Promise<IteratorResult<T, void>> {
    if (done) {
      return { value: undefined, done: true };
    }

    try {
      if (!currentNestedIterator) {
        // Somebody else is getting it already.
        if (waitForCurrentNestedIterator) {
          await waitForCurrentNestedIterator;
          return await next();
        }
        // Nobody else is getting it. We should!
        let resolve: () => void;
        waitForCurrentNestedIterator = new Promise<void>(r => {
          resolve = r;
        });
        const topIteratorResult = await topIterator.next();
        if (topIteratorResult.done) {
          // Given that done only ever transitions from false to true,
          // require-atomic-updates is being unnecessarily cautious.
          done = true;
          return await next();
        }
        // eslint is making a reasonable point here, but we've explicitly protected
        // ourself from the race condition by ensuring that only the single call
        // that assigns to waitForCurrentNestedIterator is allowed to assign to
        // currentNestedIterator or waitForCurrentNestedIterator.
        currentNestedIterator = topIteratorResult.value[Symbol.asyncIterator]();
        waitForCurrentNestedIterator = undefined;
        resolve!();
        return await next();
      }

      const rememberCurrentNestedIterator = currentNestedIterator;
      const nestedIteratorResult = await currentNestedIterator.next();
      if (!nestedIteratorResult.done) {
        return nestedIteratorResult;
      }

      // The nested iterator is done. If it's still the current one, make it not
      // current. (If it's not the current one, somebody else has made us move on.)
      if (currentNestedIterator === rememberCurrentNestedIterator) {
        currentNestedIterator = undefined;
      }
      return await next();
    } catch (err) {
      done = true;
      throw err;
    }
  }
  return {
    next,
    async return() {
      done = true;
      await Promise.all([currentNestedIterator?.return?.(), topIterator.return?.()]);
      return { value: undefined, done: true };
    },
    async throw(error?: unknown): Promise<IteratorResult<T>> {
      done = true;
      await Promise.all([currentNestedIterator?.throw?.(error), topIterator.throw?.(error)]);
      /* c8 ignore next */
      throw error;
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}
