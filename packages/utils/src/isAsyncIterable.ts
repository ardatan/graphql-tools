export function isAsyncIterable<T>(value: any): value is AsyncIterable<T> {
  return (
    typeof value === 'object' &&
    value != null &&
    Symbol.asyncIterator in value &&
    typeof value[Symbol.asyncIterator] === 'function'
  );
}
