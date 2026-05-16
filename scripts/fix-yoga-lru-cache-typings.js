/**
 * graphql-yoga depends on lru-cache@^10.0.0, which declares
 * `implements Map<K, V>`. TypeScript 6+ expanded the Map interface
 * (adding getOrInsert/getOrInsertComputed), causing build errors because
 * lru-cache@10 doesn't implement those new methods.
 *
 * This script removes `implements Map<K, V>` from the nested copy of
 * lru-cache installed under graphql-yoga, which is the same fix that
 * was previously applied to the top-level lru-cache via patch-package.
 */

const { existsSync, readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

const files = [
  'node_modules/graphql-yoga/node_modules/lru-cache/dist/commonjs/index.d.ts',
  'node_modules/graphql-yoga/node_modules/lru-cache/dist/esm/index.d.ts',
];

for (const relPath of files) {
  const filePath = join(__dirname, '..', relPath);
  if (!existsSync(filePath)) {
    continue;
  }
  const original = readFileSync(filePath, 'utf8');
  const patched = original.replace(/\s*implements Map<K,\s*V>/g, '');
  if (patched !== original) {
    writeFileSync(filePath, patched, 'utf8');
    console.log(`Fixed lru-cache typings: ${relPath}`);
  }
}
