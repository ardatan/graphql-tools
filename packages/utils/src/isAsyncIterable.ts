export function isAsyncIterable<T>(value: any): value is AsyncIterableIterator<T> {
  return typeof value === 'object' && value != null && Symbol.asyncIterator in value;
}
