import { memoize2 } from './memoize.js';

async function defaultAsyncIteratorReturn(value?: any) {
  return { value, done: true } as const;
}

const proxyMethodFactory = memoize2(function proxyMethodFactory<
  T,
  TMethod extends T[keyof T] & ((...args: any[]) => any)
>(target: T, targetMethod: TMethod) {
  return function proxyMethod(...args: Parameters<TMethod>) {
    return Reflect.apply(targetMethod, target, args);
  };
});

export function getAsyncIteratorWithCancel<T, TReturn = any>(
  asyncIterator: AsyncIterator<T>,
  onCancel: (value?: TReturn) => void | Promise<void>
): AsyncIterator<T> {
  return new Proxy(asyncIterator, {
    has(asyncIterator, prop) {
      if (prop === 'return') {
        return true;
      }
      return Reflect.has(asyncIterator, prop);
    },
    get(asyncIterator, prop, receiver) {
      const existingPropValue = Reflect.get(asyncIterator, prop, receiver);
      if (prop === 'return') {
        const existingReturn = existingPropValue || defaultAsyncIteratorReturn;
        return async function returnWithCancel(value?: TReturn) {
          const returnValue = await onCancel(value);
          return Reflect.apply(existingReturn, asyncIterator, [returnValue]);
        };
      } else if (typeof existingPropValue === 'function') {
        return proxyMethodFactory(asyncIterator, existingPropValue);
      }
      return existingPropValue;
    },
  });
}

export function getAsyncIterableWithCancel<T, TAsyncIterable extends AsyncIterable<T>, TReturn = any>(
  asyncIterable: TAsyncIterable,
  onCancel: (value?: TReturn) => void | Promise<void>
): TAsyncIterable {
  return new Proxy(asyncIterable, {
    get(asyncIterable, prop, receiver) {
      const existingPropValue = Reflect.get(asyncIterable, prop, receiver);
      if (Symbol.asyncIterator === prop) {
        return function asyncIteratorFactory() {
          const asyncIterator: AsyncIterator<T> = Reflect.apply(existingPropValue as any, asyncIterable as any, []);
          return getAsyncIteratorWithCancel(asyncIterator, onCancel);
        };
      } else if (typeof existingPropValue === 'function') {
        return proxyMethodFactory<any, any>(asyncIterable, existingPropValue);
      }
      return existingPropValue;
    },
  });
}

export { getAsyncIterableWithCancel as withCancel };
