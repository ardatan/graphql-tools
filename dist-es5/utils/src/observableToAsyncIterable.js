import { __values } from "tslib";
export function observableToAsyncIterable(observable) {
    var _a;
    var pullQueue = [];
    var pushQueue = [];
    var listening = true;
    var pushValue = function (value) {
        if (pullQueue.length !== 0) {
            // It is safe to use the ! operator here as we check the length.
            pullQueue.shift()({ value: value, done: false });
        }
        else {
            pushQueue.push({ value: value, done: false });
        }
    };
    var pushError = function (error) {
        if (pullQueue.length !== 0) {
            // It is safe to use the ! operator here as we check the length.
            pullQueue.shift()({ value: { errors: [error] }, done: false });
        }
        else {
            pushQueue.push({ value: { errors: [error] }, done: false });
        }
    };
    var pushDone = function () {
        if (pullQueue.length !== 0) {
            // It is safe to use the ! operator here as we check the length.
            pullQueue.shift()({ done: true });
        }
        else {
            pushQueue.push({ done: true });
        }
    };
    var pullValue = function () {
        return new Promise(function (resolve) {
            if (pushQueue.length !== 0) {
                var element = pushQueue.shift();
                // either {value: {errors: [...]}} or {value: ...}
                resolve(element);
            }
            else {
                pullQueue.push(resolve);
            }
        });
    };
    var subscription = observable.subscribe({
        next: function (value) {
            pushValue(value);
        },
        error: function (err) {
            pushError(err);
        },
        complete: function () {
            pushDone();
        },
    });
    var emptyQueue = function () {
        var e_1, _a;
        if (listening) {
            listening = false;
            subscription.unsubscribe();
            try {
                for (var pullQueue_1 = __values(pullQueue), pullQueue_1_1 = pullQueue_1.next(); !pullQueue_1_1.done; pullQueue_1_1 = pullQueue_1.next()) {
                    var resolve = pullQueue_1_1.value;
                    resolve({ value: undefined, done: true });
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (pullQueue_1_1 && !pullQueue_1_1.done && (_a = pullQueue_1.return)) _a.call(pullQueue_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            pullQueue.length = 0;
            pushQueue.length = 0;
        }
    };
    return _a = {
            next: function () {
                // return is a defined method, so it is safe to call it.
                return listening ? pullValue() : this.return();
            },
            return: function () {
                emptyQueue();
                return Promise.resolve({ value: undefined, done: true });
            },
            throw: function (error) {
                emptyQueue();
                return Promise.reject(error);
            }
        },
        _a[Symbol.asyncIterator] = function () {
            return this;
        },
        _a;
}
