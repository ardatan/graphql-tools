export function isAsyncIterable<T>(value: any): value is AsyncIterable<T> {
  return value?.[Symbol.asyncIterator] != null;
}
