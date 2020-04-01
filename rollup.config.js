import autoExternal from 'rollup-plugin-auto-external';
import resolveNode from '@rollup/plugin-node-resolve';
import rollupTypescript from 'rollup-plugin-typescript2';

const commonOutputOptions = {
  preferConst: true,
  sourcemap: true
};

export default {
  input: 'src/index.ts',
  plugins: [
    resolveNode(),
    autoExternal({ builtins: true, dependencies: true, peerDependencies: true }),
    rollupTypescript()
  ],
  output: [
    {
      ...commonOutputOptions,
      file: 'dist/index.cjs.js',
      format: 'cjs'
    },
    {
      ...commonOutputOptions,
      file: 'dist/index.esm.js',
      format: 'esm'
    }
  ]
};
