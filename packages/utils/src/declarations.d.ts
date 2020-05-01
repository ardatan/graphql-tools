/* eslint-disable import/unambiguous */
type Reducer<T, R> = (prev: Partial<R>, curr: T) => R;

interface ReadonlyArray<T> {
  reduce<R>(reducer: Reducer<T, R>, target: Partial<R>): R;
}

interface Array<T> {
  reduce<R>(reducer: Reducer<T, R>, target: Partial<R>): R;
}

// Based on https://stackoverflow.com/questions/59071058/how-to-pick-and-rename-certain-keys-using-typescript

type UnionToIntersection<U> = (U extends {} ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

type RenameMultiple<T, K extends keyof T, R extends { [P in K]: PropertyKey }> = UnionToIntersection<
  { [P in K]: { [key in R[P]]?: T[P] } }[K]
>;

type Rename<T, K> = RenameMultiple<T, keyof K, K>;

declare module 'apollo-upload-client';
