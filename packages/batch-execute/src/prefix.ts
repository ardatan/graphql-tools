// adapted from https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js

export function createPrefix(index: string): string {
  return `_${index}_`;
}

export type KeyMatch = { index: number; originalKey: string };

function matchKey(prefixedKey: string): KeyMatch | null {
  const match = /^_(\d+)_(.*)$/.exec(prefixedKey);
  if (match && match.length === 3 && !isNaN(Number(match[1])) && match[2]) {
    return { index: Number(match[1]), originalKey: match[2] };
  }
  return null;
}

export function parseKey(prefixedKey: string): KeyMatch {
  const match = matchKey(prefixedKey);

  if (!match) {
    throw new Error(`Key ${prefixedKey} is not correctly prefixed`);
  }

  return match;
}

export function parseKeyFromPath(
  path: readonly (string | number)[],
): KeyMatch & { keyOffset: number } {
  let keyOffset = 0;
  let match: KeyMatch | null = null;

  // Keep looping over path until we've found a match or path has no more items left
  for (; !match && keyOffset < path.length; keyOffset++) {
    const pathKey = path[keyOffset];
    if (typeof pathKey === 'string') {
      match = matchKey(pathKey);
    }
  }

  if (!match) {
    throw new Error(`Path ${path.join('.')} does not contain correctly prefixed key`);
  }

  return {
    ...match,
    keyOffset,
  };
}
