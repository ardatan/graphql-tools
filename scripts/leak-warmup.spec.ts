import { describe, expect, it } from '@jest/globals';
// Load packages that leak suites import into the disposable first isolate.
// Babel 8 + Jest --detectLeaks retains that isolate; see jest-leak-runner.cjs.
// Import via package entrypoints (not `@babel/core` directly) so Jest transforms
// Babel 8's ESM graph the same way real suites do.
import '@graphql-tools/code-file-loader';
import '@graphql-tools/executor';
import '@graphql-tools/graphql-file-loader';
import '@graphql-tools/graphql-tag-pluck';
import '@graphql-tools/links';
import '@graphql-tools/load';
import '@graphql-tools/merge';
import '@graphql-tools/schema';
import '@graphql-tools/url-loader';
import '@graphql-tools/utils';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

describeIf(Boolean(process.env.LEAK_TEST))('leak-warmup', () => {
  it('warms the first Jest isolate', () => {
    expect(true).toBe(true);
  });
});
