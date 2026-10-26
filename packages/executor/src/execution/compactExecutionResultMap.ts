/**
 * Shared empty constructor for per-field execution result maps.
 *
 * `executeFields` and `promiseForObject` both allocate null-prototype result
 * objects. Using the same constructor keeps a single V8 hidden class after
 * `Object.setPrototypeOf(..., null)`, including when sync field collection
 * hands off to async completion.
 */
export const CompactExecutionResultMap =
  function CompactExecutionResultMap() {} as unknown as new () => object;
