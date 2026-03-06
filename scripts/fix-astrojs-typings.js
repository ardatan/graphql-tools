const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

const filePath = join(
  __dirname,
  '../node_modules/@astrojs/compiler/package.json',
);

const pkg = JSON.parse(readFileSync(filePath, 'utf8'));

pkg.types = './dist/node/index.d.ts';

writeFileSync(filePath, JSON.stringify(pkg, null, 2), 'utf8');
console.log('Fixed @astrojs/compiler typings');
