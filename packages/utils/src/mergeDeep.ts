import { isSome } from './helpers';

type BoxedTupleTypes<T extends any[]> = { [P in keyof T]: [T[P]] }[Exclude<keyof T, keyof any[]>];
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
type UnboxIntersection<T> = T extends { 0: infer U } ? U : never;
// eslint-disable-next-line @typescript-eslint/ban-types
export function mergeDeep<S extends any[]>(
  sources: S,
  returnFirstIf?: (source: S[0]) => boolean
): UnboxIntersection<UnionToIntersection<BoxedTupleTypes<S>>> & any {
  const target = sources[0];
  if (returnFirstIf) {
    if (!returnFirstIf(target)) {
      return target;
    }
  }
  const output = {};
  Object.setPrototypeOf(output, Object.create(Object.getPrototypeOf(target)));
  for (const source of sources) {
    if (isObject(target) && isObject(source)) {
      const outputPrototype = Object.getPrototypeOf(output);
      const sourcePrototype = Object.getPrototypeOf(source);
      if (sourcePrototype) {
        for (const key of Object.getOwnPropertyNames(sourcePrototype)) {
          const descriptor = Object.getOwnPropertyDescriptor(sourcePrototype, key);
          if (isSome(descriptor)) {
            Object.defineProperty(outputPrototype, key, descriptor);
          }
        }
      }

      for (const key in source) {
        if (isObject(source[key])) {
          if (!(key in output)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = mergeDeep([output[key], source[key]] as S, returnFirstIf);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      }
    }
  }
  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}
