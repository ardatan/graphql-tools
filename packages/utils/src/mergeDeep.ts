import { isSome } from './helpers.js';

type BoxedTupleTypes<T extends any[]> = { [P in keyof T]: [T[P]] }[Exclude<keyof T, keyof any[]>];
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;
type UnboxIntersection<T> = T extends { 0: infer U } ? U : never;

export interface MergeDeepRespectSymbols {
  enumerable?: boolean;
  nonEnumerable?: boolean;
}

export interface MergeDeepOptions {
  respectPrototype?: boolean;
  respectArrays?: boolean;
  respectArrayLength?: boolean;
  /**
   * How to handle own symbol keys while merging.
   * Omitted / empty: drop symbols (historical default).
   * - `enumerable`: merge enumerable symbols like string keys
   * - `nonEnumerable`: copy non-enumerable symbols via property descriptors
   */
  respectSymbols?: MergeDeepRespectSymbols;
}

type NormalizedMergeDeepOptions = {
  respectPrototype: boolean;
  respectArrays: boolean;
  respectArrayLength: boolean;
  respectSymbols: {
    enumerable: boolean;
    nonEnumerable: boolean;
  };
};

function isMergeDeepOptions(value: unknown): value is MergeDeepOptions {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeRespectSymbols(
  respectSymbols: MergeDeepRespectSymbols | undefined,
): NormalizedMergeDeepOptions['respectSymbols'] {
  return {
    enumerable: respectSymbols?.enumerable ?? false,
    nonEnumerable: respectSymbols?.nonEnumerable ?? false,
  };
}

function normalizeMergeDeepOptions(
  respectPrototypeOrOptions?: boolean | MergeDeepOptions,
  respectArrays = false,
  respectArrayLength = false,
  respectNonEnumerableSymbols = false,
): NormalizedMergeDeepOptions {
  if (isMergeDeepOptions(respectPrototypeOrOptions)) {
    return {
      respectPrototype: respectPrototypeOrOptions.respectPrototype ?? false,
      respectArrays: respectPrototypeOrOptions.respectArrays ?? false,
      respectArrayLength: respectPrototypeOrOptions.respectArrayLength ?? false,
      respectSymbols: normalizeRespectSymbols(respectPrototypeOrOptions.respectSymbols),
    };
  }

  return {
    respectPrototype: respectPrototypeOrOptions ?? false,
    respectArrays,
    respectArrayLength,
    // Legacy 5th positional arg maps to non-enumerable-only symbol handling.
    respectSymbols: {
      enumerable: false,
      nonEnumerable: respectNonEnumerableSymbols,
    },
  };
}

export function mergeDeep<S extends any[]>(
  sources: S,
  options?: MergeDeepOptions,
): UnboxIntersection<UnionToIntersection<BoxedTupleTypes<S>>> & any;
/**
 * @deprecated Prefer the `MergeDeepOptions` object form:
 * `mergeDeep(sources, { respectPrototype, respectArrays, respectArrayLength, respectSymbols })`.
 */
export function mergeDeep<S extends any[]>(
  sources: S,
  respectPrototype?: boolean,
  respectArrays?: boolean,
  respectArrayLength?: boolean,
  respectNonEnumerableSymbols?: boolean,
): UnboxIntersection<UnionToIntersection<BoxedTupleTypes<S>>> & any;
export function mergeDeep<S extends any[]>(
  sources: S,
  respectPrototypeOrOptions: boolean | MergeDeepOptions = false,
  respectArrays = false,
  respectArrayLength = false,
  respectNonEnumerableSymbols = false,
): UnboxIntersection<UnionToIntersection<BoxedTupleTypes<S>>> & any {
  const options = normalizeMergeDeepOptions(
    respectPrototypeOrOptions,
    respectArrays,
    respectArrayLength,
    respectNonEnumerableSymbols,
  );
  return mergeDeepWithOptions(sources, options);
}

function mergeDeepWithOptions<S extends any[]>(
  sources: S,
  options: NormalizedMergeDeepOptions,
): UnboxIntersection<UnionToIntersection<BoxedTupleTypes<S>>> & any {
  const { respectPrototype, respectArrayLength, respectSymbols } = options;
  const respectEnumerableSymbols = respectSymbols.enumerable;
  const respectNonEnumerableSymbols = respectSymbols.nonEnumerable;

  if (sources.length === 0) {
    return;
  }
  if (sources.length === 1) {
    return sources[0];
  }
  let expectedLength: number | undefined;
  let allArrays = true;
  const areArraysInTheSameLength = sources.every(source => {
    if (Array.isArray(source)) {
      if (expectedLength === undefined) {
        expectedLength = source.length;
        return true;
      } else if (expectedLength === source.length) {
        return true;
      }
    } else {
      allArrays = false;
    }
    return false;
  });

  if (respectArrayLength && areArraysInTheSameLength) {
    return new Array(expectedLength).fill(null).map((_, index) =>
      mergeDeepWithOptions(
        sources.map(source => source[index]),
        options,
      ),
    );
  }
  if (allArrays) {
    return sources.flat(1);
  }

  let output: any;
  let firstObjectSource: any;
  if (respectPrototype) {
    firstObjectSource = sources.find(source => isObject(source));
    if (firstObjectSource) {
      if (output == null) {
        output = {};
      }
      Object.setPrototypeOf(output, Object.create(Object.getPrototypeOf(firstObjectSource)));
    }
  }
  for (const source of sources) {
    if (source === undefined) {
      continue;
    }
    if (isObject(source)) {
      if (output == null) {
        output = {};
      }
      if (firstObjectSource) {
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
        // never let a source key reach the prototype chain
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          continue;
        }
        // An own key present with value `undefined` is an explicit override and must win,
        // distinct from the key being altogether absent from `source`. Assigning directly
        // (rather than recursing through mergeDeep) avoids the top-level `source === undefined`
        // skip above, which would otherwise silently discard this override and keep the prior
        // value.
        if (Object.prototype.hasOwnProperty.call(output, key) && source[key] !== undefined) {
          output[key] = mergeDeepWithOptions([output[key], source[key]], options);
        } else {
          output[key] = source[key];
        }
      }
      if (output != null && (respectEnumerableSymbols || respectNonEnumerableSymbols)) {
        for (const sym of Object.getOwnPropertySymbols(source)) {
          const descriptor = Object.getOwnPropertyDescriptor(source, sym)!;
          if (!descriptor.enumerable) {
            if (respectNonEnumerableSymbols) {
              if (Object.prototype.hasOwnProperty.call(output, sym)) {
                const existing = Object.getOwnPropertyDescriptor(output, sym)!;
                // Later sources should win. Non-configurable properties cannot be redefined,
                // so fall back to value assignment when writable.
                if (existing.configurable) {
                  Object.defineProperty(output, sym, descriptor);
                } else if (existing.writable) {
                  output[sym] = source[sym];
                }
              } else {
                Object.defineProperty(output, sym, descriptor);
              }
            }
            continue;
          }
          if (!respectEnumerableSymbols) {
            continue;
          }
          if (Object.prototype.hasOwnProperty.call(output, sym) && source[sym] !== undefined) {
            output[sym] = mergeDeepWithOptions([output[sym], source[sym]], options);
          } else {
            output[sym] = source[sym];
          }
        }
      }
    } else if (Array.isArray(source)) {
      if (!Array.isArray(output)) {
        output = source;
      } else {
        output = mergeDeepWithOptions([output, source], options);
      }
    } else {
      output = source;
    }
  }
  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}
