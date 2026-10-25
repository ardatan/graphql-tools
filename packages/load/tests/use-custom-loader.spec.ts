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
    if (loader == null) {
      throw new Error('expected a loader function');
    }
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

  it('keeps getCustomLoaderByPath returning null when the file cannot be loaded (#4612)', async () => {
    await expect(
      getCustomLoaderByPath('./missing-custom-loader.js', __dirname),
    ).resolves.toBeNull();
  });

  it('includes the original error when useCustomLoader cannot load a missing file (#4612)', async () => {
    await expect(useCustomLoader('./missing-custom-loader.js', __dirname)).rejects.toThrow(
      /Failed to load custom loader: \.\/missing-custom-loader\.js[\s\S]*(Cannot find module|ERR_MODULE_NOT_FOUND)/,
    );
  });

  it('includes the syntax error when useCustomLoader loads a broken file (#4612)', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'broken-custom-loader-'));
    writeFileSync(join(cwd, 'broken-loader.js'), 'module.exports = function ( {\n');

    try {
      await expect(useCustomLoader('./broken-loader.js', cwd)).rejects.toThrow(
        /Failed to load custom loader: \.\/broken-loader\.js[\s\S]*SyntaxError/,
      );
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('includes the original error when useCustomLoaderSync cannot load a missing file (#4612)', () => {
    expect(() => useCustomLoaderSync('./missing-custom-loader.js', __dirname)).toThrow(
      /Failed to load custom loader: \.\/missing-custom-loader\.js[\s\S]*Cannot find module/,
    );
  });

  it('includes that the module did not export a function (#4612)', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'object-custom-loader-'));
    writeFileSync(join(cwd, 'object-loader.js'), 'module.exports = { foo: 1 };\n');

    try {
      await expect(useCustomLoader('./object-loader.js', cwd)).rejects.toThrow(
        /Failed to load custom loader: \.\/object-loader\.js[\s\S]*did not export a function/,
      );
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
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

  it('resolves root-level exports.import without a "." subpath', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'import-only-root-exports-'));
    const packageDir = join(cwd, 'node_modules', 'import-only-root-exports-loader');
    mkdirSync(packageDir, { recursive: true });
    writeFileSync(
      join(cwd, 'package.json'),
      JSON.stringify({ name: 'import-only-root-exports-app' }),
    );
    writeFileSync(
      join(packageDir, 'package.json'),
      JSON.stringify({
        name: 'import-only-root-exports-loader',
        type: 'module',
        exports: {
          import: './index.mjs',
        },
      }),
    );
    writeFileSync(
      join(packageDir, 'index.mjs'),
      'export default function () { return "import-only"; }\n',
    );

    try {
      const href = resolveLoaderModuleUrl(
        'import-only-root-exports-loader',
        cwd,
        createRequire(join(cwd, 'noop.js')),
      );
      expect(fileURLToPath(href)).toBe(join(packageDir, 'index.mjs'));
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
