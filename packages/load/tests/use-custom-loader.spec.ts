import { useCustomLoader } from '../src/utils/custom-loader.js';

describe('useCustomLoader', () => {
  it.each(['js', 'mjs'])('can load a custom loader from a file path', async (extension: string) => {
    const loader = await useCustomLoader(`./custom-loader.${extension}`, __dirname);
    const result = await loader('some-name', { customLoaderContext: {} });
    expect(result).toEqual('I like turtles');
  });
});
