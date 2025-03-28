import { Maybe } from './types.js';

export interface Path {
  readonly prev: Path | undefined;
  readonly key: string | number;
  readonly typename: string | undefined;
}

/**
 * Given a Path and a key, return a new Path containing the new key.
 */
export function addPath(
  prev: Readonly<Path> | undefined,
  key: string | number,
  typename: string | undefined,
): Path {
  return { prev, key, typename };
}

/**
 * Given a Path, return an Array of the path keys.
 */
export function pathToArray(path: Maybe<Readonly<Path>>): Array<string | number> {
  const flattened: Array<string | number> = [];
  let curr = path;
  while (curr) {
    flattened.push(curr.key);
    curr = curr.prev;
  }
  return flattened.reverse();
}

/**
 * Build a string describing the path.
 */
export function printPathArray(path: ReadonlyArray<string | number>): string {
  return path
    .map(key => (typeof key === 'number' ? '[' + key.toString() + ']' : '.' + key))
    .join('');
}
