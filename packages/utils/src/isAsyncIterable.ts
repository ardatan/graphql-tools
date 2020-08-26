export function isAsyncIterable<T>(value: any): value is AsyncIterable<T> {
  return Symbol.asyncIterator in value;
}
