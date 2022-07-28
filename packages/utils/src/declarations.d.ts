declare global {
  type Reducer<T, R> = (prev: Partial<R>, curr: T) => R;

  interface ReadonlyArray<T> {
    reduce<R>(reducer: Reducer<T, R>, target: Partial<R>): R;
  }

  interface Array<T> {
    reduce<R>(reducer: Reducer<T, R>, target: Partial<R>): R;
  }
}
declare module 'graphql-upload/*.mjs';
