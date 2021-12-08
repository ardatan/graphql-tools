async function defaultReturn(value?: any) {
  return { value, done: true } as const;
}

export function withCancel<T>(
  asyncIterable: AsyncIterable<T>,
  onCancel: (value?: any) => void | Promise<void>
): AsyncIterable<T | undefined> {
  return new Proxy(asyncIterable, {
    get(asyncIterable, prop) {
      if (Symbol.asyncIterator === prop) {
        return function getAsyncIteratorWithCancel() {
          const asyncIterator = asyncIterable[Symbol.asyncIterator]();
          if (!asyncIterator.return) {
            asyncIterator.return = defaultReturn;
          }

          const savedReturn = asyncIterator.return.bind(asyncIterator);
          asyncIterator.return = async function extendedReturn(value?: any) {
            const returnValue = await onCancel(value);
            return savedReturn(returnValue);
          };
          return asyncIterator;
        };
      }
      return asyncIterable[prop];
    },
  });
}
