import { isObjectLike } from '../jsutils/isObjectLike.js';
import { mapValue } from '../jsutils/mapValue.js';

/**
 * Deeply transforms an arbitrary value to a JSON-safe value by calling toJSON
 * on any nested value which defines it.
 */
function toJSONDeep(value: unknown): unknown {
  if (!isObjectLike(value)) {
    return value;
  }

  // @ts-expect-error: toJSON is not defined on all objects
  if (typeof value.toJSON === 'function') {
    // @ts-expect-error: toJSON is not defined on all objects
    return value.toJSON();
  }

  if (Array.isArray(value)) {
    return value.map(toJSONDeep);
  }

  return mapValue(value, toJSONDeep);
}

export function expectJSON(actual: unknown) {
  const actualJSON = toJSONDeep(actual);

  return {
    toDeepEqual(expected: unknown) {
      const expectedJSON = toJSONDeep(expected);
      expect(actualJSON).toMatchObject(expectedJSON as any);
    },
    toDeepNestedProperty(path: string, expected: unknown) {
      const expectedJSON = toJSONDeep(expected);
      expect(actualJSON).toHaveProperty(path, expectedJSON);
    },
  };
}

export function expectToThrowJSON(fn: () => unknown) {
  function mapException(): unknown {
    try {
      return fn();
    } catch (error) {
      return error;
    }
  }

  return expect(mapException());
}
