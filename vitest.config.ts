import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Benchmark the built artifacts so Vite SSR export getters stay off the hot path.
      '@graphql-tools/utils': resolve(root, 'packages/utils/dist/esm/index.js'),
      '@graphql-tools/executor': resolve(root, 'packages/executor/dist/esm/index.js'),
    },
  },
  ssr: {
    external: ['graphql', '@graphql-tools/utils', '@graphql-tools/executor'],
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
