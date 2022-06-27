import { getCustomLoaderByPath } from '../src/utils/custom-loader.js';

describe('getCustomLoaderByPath', () => {
  it('can load a custom loader from a file path', async () => {
    const loader = getCustomLoaderByPath('./custom-loader.js', __dirname);
    expect(loader).toBeDefined();
    expect(loader('some-name', { customLoaderContext: {} })).toEqual('I like turtles');
  });
});
