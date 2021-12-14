async function defaultReturn(value?: any) {
  return { value, done: true } as const;
}

export function withCancel<T, TAsyncIterable extends AsyncIterable<T>>(
  asyncIterable: TAsyncIterable,
  onCancel: (value?: any) => void | Promise<void>
): TAsyncIterable {
  return new Proxy(asyncIterable, {
    get(asyncIterable, prop) {
      if (Symbol.asyncIterator === prop) {
        return function getAsyncIteratorWithCancel() {
          const asyncIterator = asyncIterable[Symbol.asyncIterator]();
          const existingReturn = asyncIterator.return?.bind(asyncIterator) || defaultReturn;
          asyncIterator.return = async function extendedReturn(value?: any) {
            const returnValue = await onCancel(value);
            return existingReturn(returnValue);
          };
          return asyncIterator;
        };
      }
      return asyncIterable[prop];
    },
  });
}
