import assert from 'node:assert';
import { describe, it } from 'node:test';
import { versionInfo as graphqlVersionInfo } from 'graphql';
import { useCustomLoader, useCustomLoaderSync } from '../src/utils/custom-loader.ts';

describe('useCustomLoader', () => {
  const skipCjsTests = graphqlVersionInfo.major >= 17;

  it('can load a custom cjs loader from a file path', { skip: skipCjsTests }, async () => {
    const loader = await useCustomLoader(`./custom-loader.cjs`, import.meta.dirname);
    const result = await loader('some-name', { customLoaderContext: {} });
    assert.strictEqual(result, 'I like turtles');
  });

  it('can load a custom cjs loader synchronously', { skip: skipCjsTests }, async () => {
    const loader = useCustomLoaderSync(`./custom-loader.cjs`, import.meta.dirname);
    const result = await loader('some-name', { customLoaderContext: {} });
    assert.strictEqual(result, 'I like turtles');
  });

  it('can load a custom mjs loader from a file path', async () => {
    const loader = await useCustomLoader(`./custom-loader.mjs`, import.meta.dirname);
    const result = await loader('some-name', { customLoaderContext: {} });
    assert.strictEqual(result, 'I like turtles');
  });
});
