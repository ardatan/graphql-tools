import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { tmpdir } from 'os';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { GraphQLSchema, parse, print } from 'graphql';
import {
  getCustomLoaderByPath,
  resolveLoaderModuleUrl,
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

  it('resolves a package whose exports only define an import condition', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'import-only-loader-'));
    const packageDir = join(cwd, 'node_modules', 'import-only-custom-loader');
    mkdirSync(packageDir, { recursive: true });
    writeFileSync(join(cwd, 'package.json'), JSON.stringify({ name: 'import-only-loader-app' }));
    writeFileSync(
      join(packageDir, 'package.json'),
      JSON.stringify({
        name: 'import-only-custom-loader',
        type: 'module',
        exports: {
          '.': {
            import: './index.mjs',
          },
        },
      }),
    );
    writeFileSync(
      join(packageDir, 'index.mjs'),
      'export default function () { return "import-only"; }\n',
    );

    try {
      const href = resolveLoaderModuleUrl(
        'import-only-custom-loader',
        cwd,
        createRequire(join(cwd, 'noop.js')),
      );
      expect(fileURLToPath(href)).toBe(join(packageDir, 'index.mjs'));
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
