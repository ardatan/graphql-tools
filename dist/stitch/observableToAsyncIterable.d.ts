import { Observable } from 'apollo-link';
import { $$asyncIterator } from 'iterall';
export declare function observableToAsyncIterable<T>(observable: Observable<T>): AsyncIterator<T> & {
    [$$asyncIterator]: () => AsyncIterator<T>;
};
