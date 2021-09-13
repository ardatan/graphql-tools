export function withCancel(asyncIteratorLike, onCancel) {
    var asyncIterator = asyncIteratorLike[Symbol.asyncIterator]();
    if (!asyncIterator.return) {
        asyncIterator.return = function () { return Promise.resolve({ value: undefined, done: true }); };
    }
    var savedReturn = asyncIterator.return.bind(asyncIterator);
    asyncIterator.return = function () {
        onCancel();
        return savedReturn();
    };
    return asyncIterator;
}
