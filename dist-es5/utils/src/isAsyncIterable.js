export function isAsyncIterable(value) {
    return typeof value === 'object' && value != null && Symbol.asyncIterator in value;
}
