import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = dirname(fileURLToPath(import.meta.url));
// Point at another checkout's built packages (e.g. master worktree) for CI baselines.
const packageRoot = process.env.BENCH_PACKAGE_ROOT ? resolve(process.env.BENCH_PACKAGE_ROOT) : root;

function pkgDist(name: string): string {
  return resolve(packageRoot, 'packages', name, 'dist/esm/index.js');
}

// One graphql instance for schema construction and the package under test.
const graphqlRoot = resolve(packageRoot, 'node_modules/graphql');

export default defineConfig({
  resolve: {
    alias: {
      graphql: graphqlRoot,
      '@graphql-tools/utils': pkgDist('utils'),
      '@graphql-tools/executor': pkgDist('executor'),
      '@graphql-tools/load-files': pkgDist('load-files'),
    },
    dedupe: ['graphql'],
  },
  ssr: {
    // Keep tools packages in the Vite graph so the graphql alias applies inside dist.
    noExternal: [
      'graphql',
      '@graphql-tools/utils',
      '@graphql-tools/executor',
      '@graphql-tools/load-files',
    ],
  },
  test: {
    environment: 'node',
    benchmark: {
      include: ['packages/**/__benchmarks__/**/*.{bench,benchmark}.?(c|m)[jt]s?(x)'],
      suppressExportGetterWarnings: true,
    },
    testTimeout: 120_000,
  },
});
