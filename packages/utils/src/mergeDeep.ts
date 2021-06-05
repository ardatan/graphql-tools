import { isScalarType } from 'graphql';

type BoxedTupleTypes<T extends any[]> = { [P in keyof T]: [T[P]] }[Exclude<keyof T, keyof any[]>];
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
type UnboxIntersection<T> = T extends { 0: infer U } ? U : never;
// eslint-disable-next-line @typescript-eslint/ban-types
export function mergeDeep<T extends object, S extends any[]>(
  target: T,
  ...sources: S
): T & UnboxIntersection<UnionToIntersection<BoxedTupleTypes<S>>> & any {
  if (isScalarType(target)) {
    return target as any;
  }
  const output = {};
  for (const source of [target, ...sources]) {
    if (isObject(target) && isObject(source)) {
      for (const key in source) {
        if (isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = mergeDeep(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      }

      const outputPrototype = Object.getPrototypeOf(output);
      const sourcePrototype = Object.getPrototypeOf(source);
      if (sourcePrototype) {
        if (outputPrototype) {
          Object.getOwnPropertyNames(sourcePrototype).forEach(key => {
            const descriptor = Object.getOwnPropertyDescriptor(sourcePrototype, key);
            Object.defineProperty(outputPrototype, key, descriptor);
          });
        } else {
          Object.setPrototypeOf(output, sourcePrototype);
        }
      }
    }
  }
  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}
