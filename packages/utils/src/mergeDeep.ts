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
  if (respectArrays && respectArrayLength) {
    let expectedLength: number | undefined;
    const areArraysInTheSameLength = sources.every(source => {
      if (Array.isArray(source)) {
        if (expectedLength === undefined) {
          expectedLength = source.length;
          return true;
        } else if (expectedLength === source.length) {
          return true;
        }
      }
      return false;
    });

    if (areArraysInTheSameLength) {
      return new Array(expectedLength).fill(null).map((_, index) =>
        mergeDeep(
          sources.map(source => source[index]),
          respectPrototype,
          respectArrays,
          respectArrayLength,
        ),
      );
    }
  }

  const output = {};
  if (respectPrototype) {
    Object.setPrototypeOf(output, Object.create(Object.getPrototypeOf(sources[0])));
  }
  for (const source of sources) {
    if (isObject(source)) {
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
              respectArrayLength,
            );
          }
        } else if (respectArrays && Array.isArray(output[key])) {
          if (Array.isArray(source[key])) {
            if (respectArrayLength && output[key].length === source[key].length) {
              output[key] = mergeDeep(
                [output[key], source[key]] as S,
                respectPrototype,
                respectArrays,
                respectArrayLength,
              );
            } else {
              output[key].push(...source[key]);
            }
          } else {
            output[key].push(source[key]);
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
