export function withCancel<T>(
  asyncIteratorLike: {
    [Symbol.asyncIterator](): AsyncIterator<T>;
  },
  onCancel: () => void
): AsyncIterator<T | undefined> {
  const asyncIterator = asyncIteratorLike[Symbol.asyncIterator]();
  if (!asyncIterator.return) {
    asyncIterator.return = () => Promise.resolve({ value: undefined, done: true });
  }

  const savedReturn = asyncIterator.return.bind(asyncIterator);
  asyncIterator.return = () => {
    onCancel();
    return savedReturn();
  };

  return asyncIterator;
}
