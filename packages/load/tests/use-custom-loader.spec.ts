import { join } from 'path';
import { GraphQLSchema, parse, print } from 'graphql';
import {
  getCustomLoaderByPath,
  useCustomLoader,
  useCustomLoaderSync,
} from '../src/utils/custom-loader.js';

describe('custom loaders', () => {
  it('can load a CommonJS loader from a relative file path', async () => {
    const loader = await getCustomLoaderByPath('./custom-loader.js', __dirname);
    expect(loader).toBeDefined();
    expect(loader('some-name', { customLoaderContext: {} })).toEqual('I like turtles');
  });

  it('can load an ESM loader from a relative file path', async () => {
    const loader = await useCustomLoader('./custom-loader.mjs', __dirname);
    expect(loader('some-name', { customLoaderContext: {} })).toEqual('I like turtles');
  });

  it('can load an ESM loader from an absolute file path', async () => {
    const loader = await useCustomLoader(join(__dirname, 'custom-loader.mjs'), __dirname);
    const schema = loader('schema.json', {
      customLoaderContext: { loaderType: 'schema' },
      fooFieldName: 'myFooField',
    });
    expect(schema).toBeInstanceOf(GraphQLSchema);
    expect(schema.getQueryType()?.getFields()['myFooField']).toBeDefined();
  });

  it('can load a CommonJS loader synchronously', () => {
    const loader = useCustomLoaderSync('./custom-loader.js', __dirname);
    expect(loader('some-name', { customLoaderContext: {} })).toEqual('I like turtles');
  });

  it('loads ESM documents through the custom loader pointer', async () => {
    const loader = await useCustomLoader('./custom-loader.mjs', __dirname);
    const doc = loader('query.graphql', {
      customLoaderContext: { loaderType: 'documents' },
      fooFieldName: 'myFooField',
    });
    expect(print(doc)).toBe(print(parse('query TestQuery { myFooField }')));
  });
});
