import pLimit from 'p-limit';

/**
 * Converts a string to 32bit integer
 */
export function stringToHash(str: string): number {
  let hash = 0;

  if (str.length === 0) {
    return hash;
  }

  let char;
  for (let i = 0; i < str.length; i++) {
    char = str.charCodeAt(i);
    // tslint:disable-next-line: no-bitwise
    hash = (hash << 5) - hash + char;
    // tslint:disable-next-line: no-bitwise
    hash = hash & hash;
  }

  return hash;
}

export type StackNext = () => void;
export type StackFn<T> = (input: T, next: StackNext) => void;

export function useStack<T>(...fns: Array<StackFn<T>>) {
  return (input: T) => {
    function createNext(i: number) {
      if (i >= fns.length) {
        return () => {};
      }

      return function next() {
        fns[i](input, createNext(i + 1));
      };
    }

    fns[0](input, createNext(1));
  };
}

export function useLimit(concurrency: number) {
  return pLimit(concurrency);
}
