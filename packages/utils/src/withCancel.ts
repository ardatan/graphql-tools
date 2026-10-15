import memoizee from 'memoizee';

async function defaultAsyncIteratorReturn(value?: any) {
  return { value, done: true } as const;
}

const objectIds = new WeakMap<object, string>();
let objectIdSeq = 0;
function objectKey(value: unknown): string {
  if (value != null && (typeof value === 'object' || typeof value === 'function')) {
    let id = objectIds.get(value as object);
    if (id == null) {
      id = `o${++objectIdSeq}`;
      objectIds.set(value as object, id);
    }
    return id;
  }
  return JSON.stringify(value);
}

const proxyMethodFactory = memoizee(
  function proxyMethodFactory(target: object, targetMethod: (...args: any[]) => any) {
    return function proxyMethod(...args: any[]) {
      return Reflect.apply(targetMethod, target, args);
    };
  },
  {
    length: 2,
    normalizer(args: any) {
      return objectKey(args[0]) + '|' + objectKey(args[1]);
    },
  },
);

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
