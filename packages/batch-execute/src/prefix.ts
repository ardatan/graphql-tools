// adapted from https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js

export function createPrefix(index: string): string {
  return `_${index}_`;
}

export function parseKey(prefixedKey: string): { index: number; originalKey: string } {
  const match = /^_([\d]+)_(.*)$/.exec(prefixedKey);
  if (match && match.length === 3 && !isNaN(Number(match[1])) && match[2]) {
    return { index: Number(match[1]), originalKey: match[2] };
  }

  throw new Error(`Key ${prefixedKey} is not correctly prefixed`);
}
