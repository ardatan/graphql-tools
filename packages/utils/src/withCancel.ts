import weakMemoizee from 'memoizee/weak.js';

async function defaultAsyncIteratorReturn(value?: any) {
  return { value, done: true } as const;
}

const proxyMethodFactoryMemo = weakMemoizee((target: object) =>
  weakMemoizee((targetMethod: (...args: any[]) => any) => {
    return function proxyMethod(...args: any[]) {
      return Reflect.apply(targetMethod, target, args);
    };
  }),
);

function proxyMethodFactory(target: object, targetMethod: (...args: any[]) => any) {
  return proxyMethodFactoryMemo(target)(targetMethod);
}

export function getAsyncIteratorWithCancel<T, TReturn = any>(
  asyncIterator: AsyncIterator<T>,
  onCancel: (value?: TReturn) => void | Promise<void>,
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
        return proxyMethodFactory(asyncIterator, existingPropValue as (...args: any[]) => any);
      }
      return existingPropValue;
    },
  });
}

export function getAsyncIterableWithCancel<
  T,
  TAsyncIterable extends AsyncIterable<T>,
  TReturn = any,
>(
  asyncIterable: TAsyncIterable,
  onCancel: (value?: TReturn) => void | Promise<void>,
): TAsyncIterable {
  return new Proxy(asyncIterable, {
    get(asyncIterable, prop, receiver) {
      const existingPropValue = Reflect.get(asyncIterable, prop, receiver);
      if (Symbol.asyncIterator === prop) {
        return function asyncIteratorFactory() {
          const asyncIterator: AsyncIterator<T> = Reflect.apply(
            existingPropValue as any,
            asyncIterable as any,
            [],
          );
          return getAsyncIteratorWithCancel(asyncIterator, onCancel);
        };
      } else if (typeof existingPropValue === 'function') {
        return proxyMethodFactory(asyncIterable, existingPropValue as (...args: any[]) => any);
      }
      return existingPropValue;
    },
  });
}

export { getAsyncIterableWithCancel as withCancel };
