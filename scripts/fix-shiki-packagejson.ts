import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const shikiJsVsCodeTextMatePackageJsonPath = join(
  __dirname,
  '../node_modules/@shikijs/vscode-textmate/package.json',
);
const shikiJsVsCodeTextMatePackageJson = JSON.parse(
  readFileSync(shikiJsVsCodeTextMatePackageJsonPath, 'utf-8'),
);
shikiJsVsCodeTextMatePackageJson.exports['.'] = {
  default: './dist/index.mjs',
  types: './dist/index.d.mts',
};
writeFileSync(
  shikiJsVsCodeTextMatePackageJsonPath,
  JSON.stringify(shikiJsVsCodeTextMatePackageJson, null, 2),
);
