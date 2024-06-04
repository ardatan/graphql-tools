import { isSome } from './helpers.js';

type BoxedTupleTypes<T extends any[]> = { [P in keyof T]: [T[P]] }[Exclude<keyof T, keyof any[]>];
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;
type UnboxIntersection<T> = T extends { 0: infer U } ? U : never;

export function mergeDeep<S extends any[]>(
  sources: S,
  respectPrototype = false,
  respectArrays = false,
  respectArrayLength = false,
): UnboxIntersection<UnionToIntersection<BoxedTupleTypes<S>>> & any {
  const target = sources[0] || {};
  const output = {};
  if (respectPrototype) {
    Object.setPrototypeOf(output, Object.create(Object.getPrototypeOf(target)));
  }
  if (Array.isArray(target)) {
    // Are they all arrays with the same length?
    const allArrays = sources.every(
      source => Array.isArray(source) && source.length === target.length,
    );
    if (allArrays) {
      return target.map((_, i) =>
        mergeDeep(
          sources.map(source => source[i]),
          respectPrototype,
          respectArrays,
          respectArrayLength,
        ),
      );
    }
  }
  for (const source of sources) {
    if (isObject(target) && isObject(source)) {
      if (respectPrototype) {
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
      }

      for (const key in source) {
        if (isObject(source[key])) {
          if (!(key in output)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = mergeDeep(
              [output[key], source[key]] as S,
              respectPrototype,
              respectArrays,
            );
          }
        } else if (respectArrays && Array.isArray(output[key])) {
          if (Array.isArray(source[key])) {
            output[key].push(...source[key]);
          } else {
            output[key].push(source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      }
    } else if (respectArrays && Array.isArray(target)) {
      if (Array.isArray(source)) {
        if (respectArrayLength && source.length === target.length) {
          return target.map((targetElem, i) =>
            mergeDeep([targetElem, source[i]], respectPrototype, respectArrays, respectArrayLength),
          );
        }
        target.push(...source);
      } else {
        target.push(source);
      }
    } else if (respectArrays && Array.isArray(source)) {
      return [target, ...source];
    }
  }
  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}
