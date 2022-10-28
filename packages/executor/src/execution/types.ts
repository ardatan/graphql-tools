export type PromiseOrValue<T> = Promise<T> | T;

export interface ObjMap<T> {
  [key: string]: T;
}
