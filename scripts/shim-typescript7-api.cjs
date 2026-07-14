/**
 * TypeScript 7 ships `tsc` but not the legacy compiler API that Next.js,
 * typescript-eslint, and similar tools still import from `typescript`.
 *
 * After install:
 * 1. Point package `exports` at `@typescript/typescript6` (CJS) for normal imports
 * 2. Add `lib/typescript.js` with a full ESM namespace re-export so Next's
 *    `require(absolutePath)` still sees `ts.sys` (not only `ts.default.sys`)
 *
 * The installed package remains `typescript@7` and `tsc` stays native TS7.
 *
 * @see https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6-0
 * @see https://github.com/ardatan/feTS/pull/3974
 */
'use strict';

const fs = require('fs');
const path = require('path');

let typescriptDir;
try {
  typescriptDir = path.dirname(require.resolve('typescript/package.json'));
} catch {
  process.exit(0);
}

const packageJsonPath = path.join(typescriptDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!String(packageJson.version).startsWith('7.')) {
  process.exit(0);
}

const typescript6 = require('@typescript/typescript6');

const cjsShimPath = path.join(typescriptDir, 'lib', 'typescript.cjs');
fs.writeFileSync(
  cjsShimPath,
  `'use strict';\nmodule.exports = require('@typescript/typescript6');\n`,
);

// Next.js resolves this path with fs.existsSync + require(absolutePath). Because
// typescript@7 uses "type":"module", that require loads ESM and only sees named
// exports on the module namespace — a lone `export default` leaves ts.sys undefined.
const exportNames = Object.keys(typescript6).filter(name => /^[A-Za-z_$][\w$]*$/.test(name));
const esmShimPath = path.join(typescriptDir, 'lib', 'typescript.js');
fs.writeFileSync(
  esmShimPath,
  `import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('@typescript/typescript6');
export default ts;
${exportNames.map(name => `export const ${name} = ts[${JSON.stringify(name)}];`).join('\n')}
`,
);

packageJson.exports = {
  ...packageJson.exports,
  '.': './lib/typescript.cjs',
  './lib/typescript.js': './lib/typescript.cjs',
};

fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 4)}\n`);

// @typescript/typescript6 depends on `@typescript/old` (typescript@^6), which also
// publishes a `tsc` bin. npm may link node_modules/.bin/tsc to that package and
// silently run the TS6 compiler. Force the workspace tsc shim back to typescript@7.
const binDir = path.join(path.dirname(typescriptDir), '.bin');
const tscBinPath = path.join(typescriptDir, 'bin', 'tsc');
for (const name of ['tsc', 'tsc.cmd', 'tsc.ps1']) {
  const linkPath = path.join(binDir, name);
  try {
    if (fs.existsSync(linkPath) || fs.lstatSync(linkPath).isSymbolicLink()) {
      fs.rmSync(linkPath, { force: true });
    }
  } catch {
    // ignore missing/broken link
  }
}

const tscRelativeFromBin = path.relative(binDir, tscBinPath);
try {
  if (process.platform === 'win32') {
    // Symlinks often fail without elevation on Windows CI; write cmd/ps1 shims
    // that invoke typescript@7's bin the same way npm would.
    const tscCmdTarget = tscRelativeFromBin.replace(/\//g, '\\');
    fs.writeFileSync(
      path.join(binDir, 'tsc.cmd'),
      `@ECHO off\r\nnode "%~dp0${tscCmdTarget}" %*\r\n`,
    );
    fs.writeFileSync(
      path.join(binDir, 'tsc'),
      `#!/bin/sh\nbasedir=$(dirname "$0")\nexec node "$basedir/${tscRelativeFromBin.replace(/\\/g, '/')}" "$@"\n`,
    );
    fs.writeFileSync(
      path.join(binDir, 'tsc.ps1'),
      `#!/usr/bin/env pwsh\n$basedir = Split-Path $MyInvocation.MyCommand.Definition -Parent\n& node "$basedir\\${tscCmdTarget}" $args\nexit $LASTEXITCODE\n`,
    );
  } else {
    fs.symlinkSync(tscRelativeFromBin, path.join(binDir, 'tsc'));
  }
} catch {
  // Best-effort on platforms where bin rewriting is restricted.
}
