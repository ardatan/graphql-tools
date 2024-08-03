/* eslint-disable no-console */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const filePath = path.join(
  process.cwd(),
  'packages',
  'graphql-tag-pluck',
  'dist',
  'esm',
  'index.js',
);

async function main() {
  console.time('done');
  const content = await readFile(filePath, 'utf8');

  await writeFile(
    filePath,
    `
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
${content}`.trimStart(),
  );
  console.timeEnd('done');
}

main();
