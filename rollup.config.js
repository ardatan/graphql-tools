import autoExternal from 'rollup-plugin-auto-external';
import resolveNode from '@rollup/plugin-node-resolve';
import generatePackageJson from 'rollup-plugin-generate-package-json';
import rollupTypescript from 'rollup-plugin-typescript2';
import path from 'path';
import fs from 'fs';

const commonOutputOptions = {
  preferConst: true,
  sourcemap: true,
};

export default {
  input: 'src/index.ts',
  plugins: [
    resolveNode(),
    autoExternal({
      builtins: true,
      dependencies: true,
      peerDependencies: true,
    }),
    generatePackageJson({
      baseContents: rewritePackageJson,
    }),
    rollupTypescript(),
    copyFiles(['README.md', 'LICENSE']),
  ],
  output: [
    {
      ...commonOutputOptions,
      file: 'dist/index.cjs.js',
      format: 'cjs',
    },
    {
      ...commonOutputOptions,
      file: 'dist/index.esm.js',
      format: 'esm',
    },
  ],
};

function rewritePackageJson(pkg) {
  const newPkg = {};
  const fields = [
    'name',
    'version',
    'description',
    'sideEffects',
    'peerDependencies',
    'dependencies',
    'repository',
    'homepage',
    'keywords',
    'author',
    'license',
    'engines',
  ];

  fields.forEach((field) => {
    if (pkg[field]) {
      newPkg[field] = pkg[field];
    }
  });

  newPkg.main = 'index.cjs.js';
  newPkg.module = 'index.esm.js';
  newPkg.typings = 'index.d.ts';
  newPkg.types = 'index.d.ts';
  newPkg.typescript = {
    definition: newPkg.typings,
  };

  return newPkg;
}

function copyFiles(paths) {
  return {
    name: 'copy-files',
    generateBundle(outputOptions) {
      const outputPath = outputOptions.dir || path.dirname(outputOptions.file);

      paths.forEach((file) => {
        fs.copyFileSync(file, path.join(outputPath, path.basename(file)));
      });
    },
  };
}
