import { randomUUID } from 'crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { Kind, print, visit, type DocumentNode, type Location } from 'graphql';
import { loadDocuments, loadDocumentsSync } from '@graphql-tools/load';
import externalFragmentLoader, {
  clearCache,
  ExternalFragmentLoader,
  resolveExternalFragments,
  resolveExternalFragmentsSync,
  type ExternalFragmentLoaderOptions,
} from '../src/index.js';

// Tests edit fixtures, so concurrent unit and leak runs need separate copies.
const FIXTURES_DIR = path.join(tmpdir(), `external-fragment-loader-${randomUUID()}`);
const FIXTURES_TS_DIR = FIXTURES_DIR;
const FIXTURES_DUP_DIR = FIXTURES_DIR;

// matchFiles (and therefore this loader) always emits POSIX separators, even on Windows.
function expectedPath(...parts: string[]): string {
  return path.join(...parts).replace(/\\/g, '/');
}

const packageAOpts = {
  packageDir: path.join(FIXTURES_DIR, 'fragment-consumer'),
  externalPackagesDirs: [FIXTURES_DIR],
};

const tsOpts = {
  packageDir: path.join(FIXTURES_TS_DIR, 'typescript-consumer'),
  externalPackagesDirs: [FIXTURES_TS_DIR],
  extensions: ['ts', 'tsx', 'js', 'jsx'] as string[],
};

describe('ExternalFragmentLoader', () => {
  const loader = new ExternalFragmentLoader();

  beforeAll(() => {
    cpSync(path.join(__dirname, 'fixtures'), FIXTURES_DIR, { recursive: true });
  });

  afterAll(() => {
    clearCache();
    rmSync(FIXTURES_DIR, { recursive: true, force: true });
  });

  describe('resolveExternalFragments', () => {
    it('should resolve direct and transitive fragment dependencies', async () => {
      const result = await resolveExternalFragments(packageAOpts);

      expect(result.map(r => path.basename(r.filePath)).sort()).toEqual([
        'user-email.graphql',
        'user-fields.graphql',
      ]);

      const userFields = result.find(r => r.filePath.includes('user-fields.graphql'))!;
      expect(userFields.packageName).toBe('fragment-direct-provider');
      expect(userFields.definitions).toEqual([
        { name: 'UserFields', typeCondition: 'User' },
        { name: 'UnusedUserFragment', typeCondition: 'User' },
      ]);

      const userEmail = result.find(r => r.filePath.includes('user-email.graphql'))!;
      expect(userEmail.packageName).toBe('fragment-transitive-provider');
      expect(userEmail.definitions).toEqual([{ name: 'UserEmail', typeCondition: 'User' }]);
    });

    it.each([
      [
        'async',
        (opts: typeof packageAOpts & { extensions?: string[] }) => resolveExternalFragments(opts),
      ],
      [
        'sync',
        (opts: typeof packageAOpts & { extensions?: string[] }) =>
          resolveExternalFragmentsSync(opts),
      ],
    ] as const)(
      'should resolve fragments with a single custom extension (%s)',
      async (_label, resolve) => {
        const result = await resolve({ ...packageAOpts, extensions: ['graphql'] });

        expect(result.map(r => path.basename(r.filePath)).sort()).toEqual([
          'user-email.graphql',
          'user-fields.graphql',
        ]);
      },
    );

    it('should return empty array when no external fragments are needed', async () => {
      const result = await resolveExternalFragments({
        packageDir: path.join(FIXTURES_DIR, 'fragment-transitive-provider'),
        externalPackagesDirs: [FIXTURES_DIR],
      });

      expect(result).toEqual([]);
    });

    it('should respect the filter option', async () => {
      await expect(
        resolveExternalFragments({
          ...packageAOpts,
          packageNameFilter: name => name === 'fragment-direct-provider',
        }),
      ).rejects.toThrow(
        'Fragment "UserEmail" is spread in "fragment-consumer" but not defined in any of its transitive dependencies.',
      );
    });

    it('should throw on duplicate fragments across dependencies', async () => {
      await expect(
        resolveExternalFragments({
          packageDir: path.join(FIXTURES_DUP_DIR, 'duplicate-fragment-consumer'),
          externalPackagesDirs: [FIXTURES_DUP_DIR],
        }),
      ).rejects.toThrow('Duplicate fragment "ItemFields"');
    });

    it('should throw when a fragment is not found in any dependency', async () => {
      await expect(
        resolveExternalFragments({
          packageDir: path.join(FIXTURES_DIR, 'fragment-direct-provider'),
          externalPackagesDirs: [FIXTURES_DIR],
          packageNameFilter: name => name !== 'fragment-transitive-provider',
        }),
      ).rejects.toThrow('no transitive dependencies were found to search');
    });
  });

  describe('loader interface', () => {
    it.each([
      ['async', () => loader.load('.', packageAOpts)],
      ['sync', () => loader.loadSync('.', packageAOpts)],
    ] as const)(
      'should return Source objects with document and location (%s)',
      async (_label, load) => {
        const sources = await load();

        expect(sources.length).toBe(2);
        const locations = sources.map(s => path.basename(s.location!)).sort();
        expect(locations).toEqual(['user-email.graphql', 'user-fields.graphql']);
        for (const source of sources) {
          expect(source.document!.kind).toBe('Document');
          expect(source.rawSDL).toBeDefined();
        }

        const userFieldsSource = sources.find(source =>
          source.location?.endsWith('user-fields.graphql'),
        );
        expect(userFieldsSource?.document?.definitions).toHaveLength(1);
        expect(userFieldsSource?.rawSDL).toContain('fragment UserFields');
        expect(userFieldsSource?.rawSDL).not.toContain('UnusedUserFragment');
      },
    );

    describe.each([
      {
        collision: 'a local fragment',
        consumer: 'filtered-duplicate-consumer',
        expectedFiles: ['user-email.graphql', 'user-fields.graphql'],
        expectedFragments: ['UserEmail', 'UserFields'],
      },
      {
        collision: 'an unused fragment in another provider',
        consumer: 'filtered-provider-duplicate-consumer',
        expectedFiles: ['profile-fields.graphql', 'user-email.graphql', 'user-fields.graphql'],
        expectedFragments: ['ProfileFields', 'UserEmail', 'UserFields'],
      },
    ])(
      'provider fragments duplicated by $collision',
      ({ consumer, expectedFiles, expectedFragments }) => {
        const options = {
          packageDir: path.join(FIXTURES_DIR, consumer),
          externalPackagesDirs: [FIXTURES_DIR],
        };

        it.each([
          ['async', () => loader.load('.', options)],
          ['sync', () => loader.loadSync('.', options)],
        ] as const)('should ignore duplicates that are filtered out (%s)', async (_label, load) => {
          const sources = await load();

          expect(sources.map(source => path.basename(source.location!)).sort()).toEqual(
            expectedFiles,
          );
          expect(
            sources
              .flatMap(source => source.document!.definitions)
              .filter(definition => definition.kind === 'FragmentDefinition')
              .map(definition => definition.name.value)
              .sort(),
          ).toEqual(expectedFragments);
          for (const source of sources) {
            expect(source.rawSDL).not.toContain('UnusedUserFragment');
          }
        });

        it.each([
          ['async', () => resolveExternalFragments(options)],
          ['sync', () => resolveExternalFragmentsSync(options)],
        ] as const)(
          'should report duplicates when resolving whole files (%s)',
          async (_label, resolve) => {
            await expect(Promise.resolve().then(resolve)).rejects.toThrow(
              'Duplicate fragment "UnusedUserFragment"',
            );
          },
        );
      },
    );

    it.each([
      ['async', (options: typeof packageAOpts) => loader.load('.', options)],
      ['sync', (options: typeof packageAOpts) => loader.loadSync('.', options)],
    ] as const)('should reject duplicate required fragments (%s)', async (_label, load) => {
      await expect(
        Promise.resolve().then(() =>
          load({
            packageDir: path.join(FIXTURES_DUP_DIR, 'duplicate-fragment-consumer'),
            externalPackagesDirs: [FIXTURES_DUP_DIR],
          }),
        ),
      ).rejects.toThrow('Duplicate fragment "ItemFields"');
    });
  });

  describe('TypeScript code files', () => {
    it('should resolve fragments from .ts files', async () => {
      const result = await resolveExternalFragments(tsOpts);

      expect(result.length).toBe(1);
      expect(result[0].packageName).toBe('typescript-provider');
      expect(result[0].definitions).toEqual([
        { name: 'SharedUserFragment', typeCondition: 'User' },
      ]);
    });

    it.each([
      ['async loader', () => loader.load('.', tsOpts)],
      ['sync loader', () => loader.loadSync('.', tsOpts)],
    ] as const)('should pluck and load fragments from .ts files (%s)', async (_label, load) => {
      const sources = await load();

      expect(sources).toHaveLength(1);
      expect(sources[0].rawSDL).toContain('fragment SharedUserFragment on User');
      expect(sources[0].rawSDL).not.toContain('import { gql }');
      expect(sources[0].document?.definitions).toHaveLength(1);
    });

    it.each([
      ['async', () => loader.load('.', tsOpts)],
      ['sync', () => loader.loadSync('.', tsOpts)],
    ] as const)(
      'should surface GraphQL syntax errors inside gql tags (%s)',
      async (_label, load) => {
        const providerFile = path.join(FIXTURES_TS_DIR, 'typescript-provider/src/fragments.ts');
        const originalContent = readFileSync(providerFile, 'utf8');
        clearCache();

        try {
          writeFileSync(
            providerFile,
            originalContent.replace(
              'fragment SharedUserFragment on User',
              'fragment SharedUserFragment User',
            ),
          );

          await expect(Promise.resolve().then(load)).rejects.toThrow(
            'Syntax Error: Expected "on", found Name "User".',
          );
        } finally {
          writeFileSync(providerFile, originalContent);
          clearCache();
        }
      },
    );

    it.each([
      ['async', () => loader.load('.', tsOpts)],
      ['sync', () => loader.loadSync('.', tsOpts)],
    ] as const)('should skip unrelated TypeScript syntax errors (%s)', async (_label, load) => {
      const temporaryDir = mkdtempSync(
        path.join(FIXTURES_TS_DIR, 'typescript-provider/src/unparseable-'),
      );
      clearCache();

      try {
        writeFileSync(path.join(temporaryDir, 'unrelated.ts'), 'export const broken = ;');

        const sources = await load();

        expect(sources).toHaveLength(1);
        expect(sources[0].rawSDL).toContain('fragment SharedUserFragment on User');
      } finally {
        rmSync(temporaryDir, { recursive: true, force: true });
        clearCache();
      }
    });

    it('should load fragments from .ts files with the function loader', () => {
      const document = externalFragmentLoader('.', tsOpts);

      expect(document.kind).toBe('Document');
      expect(document.definitions).toHaveLength(1);
    });

    it('should use the async resolver when async is true', async () => {
      const documentPromise = externalFragmentLoader('.', { ...tsOpts, async: true });

      expect(documentPromise).toBeInstanceOf(Promise);

      const document = await documentPromise;
      expect(document.kind).toBe('Document');
      expect(document.definitions).toHaveLength(1);
    });

    it('should use the sync resolver when async is false', () => {
      const document = externalFragmentLoader('.', { ...tsOpts, async: false });

      expect(document.kind).toBe('Document');
      expect(document.definitions).toHaveLength(1);
    });

    it('should work as an @graphql-tools/load custom loader', async () => {
      const pointer = {
        '.': {
          loader: externalFragmentLoader,
          ...packageAOpts,
        },
      };

      const [asyncSource] = await loadDocuments(pointer, { loaders: [] });
      const [syncSource] = loadDocumentsSync(pointer, { loaders: [] });

      expect(asyncSource.document?.definitions).toHaveLength(2);
      expect(syncSource.document?.definitions).toHaveLength(2);
      expect(
        asyncSource.document?.definitions
          .filter(definition => definition.kind === 'FragmentDefinition')
          .map(definition => definition.name.value),
      ).toEqual(['UserFields', 'UserEmail']);
      expect(
        syncSource.document?.definitions
          .filter(definition => definition.kind === 'FragmentDefinition')
          .map(definition => definition.name.value),
      ).toEqual(['UserFields', 'UserEmail']);
    });

    it('should select the async resolver from the custom-loader options', async () => {
      const pointer = {
        '.': {
          loader: externalFragmentLoader,
          ...packageAOpts,
          async: true,
        },
      };

      const [source] = await loadDocuments(pointer, { loaders: [] });

      expect(source.document?.definitions).toHaveLength(2);
      expect(
        source.document?.definitions
          .filter(definition => definition.kind === 'FragmentDefinition')
          .map(definition => definition.name.value),
      ).toEqual(['UserFields', 'UserEmail']);
    });
  });

  describe('noLocation option', () => {
    const locationOptions = {
      packageDir: path.join(FIXTURES_DIR, 'location-consumer'),
      externalPackagesDirs: [FIXTURES_DIR],
    };

    const entryPoints = [
      {
        name: 'class async',
        load: async (options: ExternalFragmentLoaderOptions) =>
          (await loader.load('.', options)).map(source => source.document!),
      },
      {
        name: 'class sync',
        load: (options: ExternalFragmentLoaderOptions) =>
          loader.loadSync('.', options).map(source => source.document!),
      },
      {
        name: 'default async',
        load: async (options: ExternalFragmentLoaderOptions) => [
          await externalFragmentLoader('.', { ...options, async: true }),
        ],
      },
      {
        name: 'default sync',
        load: (options: ExternalFragmentLoaderOptions) => [
          externalFragmentLoader('.', { ...options, async: false }),
        ],
      },
    ];

    function expectLocations(documents: DocumentNode[], noLocation: boolean) {
      const selectionLocations: Location[] = [];
      expect(documents.length).toBeGreaterThan(0);
      for (const document of documents) {
        expect(document.definitions.length).toBeGreaterThan(0);
        visit(document, {
          enter(node) {
            // Filtering and concatAST may create a synthetic document wrapper.
            if (node.kind === Kind.DOCUMENT) return;
            if (noLocation) {
              expect(node.loc).toBeUndefined();
            } else {
              expect(node.loc).toBeDefined();
              expect(node.loc!.end).toBeGreaterThan(node.loc!.start);
              if (node.kind === Kind.SELECTION_SET) {
                selectionLocations.push(node.loc!);
                const text = node.loc!.source.body.slice(node.loc!.start, node.loc!.end);
                expect(text.startsWith('{')).toBe(true);
                expect(text.endsWith('}')).toBe(true);
              }
            }
          },
        });
      }
      if (!noLocation) {
        expect(selectionLocations.length).toBeGreaterThan(0);
        expect(new Set(selectionLocations).size).toBe(selectionLocations.length);
      }
    }

    beforeEach(() => {
      clearCache();
    });

    describe.each(entryPoints)('$name', ({ load }) => {
      it.each([undefined, true, false])(
        'honors noLocation: %s for GraphQL and TypeScript',
        async noLocation => {
          for (const options of [locationOptions, tsOpts, packageAOpts]) {
            const documents = await load({ ...options, noLocation });
            expectLocations(documents, noLocation ?? true);
            expect(
              documents
                .flatMap(document => document.definitions)
                .every(definition => definition.kind === Kind.FRAGMENT_DEFINITION),
            ).toBe(true);
            const printed = documents.map(print).join('\n');
            expect(printed).not.toContain('Unused');
            if (options === locationOptions) {
              expect(documents.flatMap(document => document.definitions)).toHaveLength(1);
              expect(printed).toContain('id @include(if: $condition)');
              expect(printed).toContain('id @skip(if: $condition)');
            }
          }
        },
      );

      it.each([true, false])(
        'isolates warm caches starting with noLocation: %s',
        async noLocation => {
          const first = await load({ ...locationOptions, noLocation });
          const opposite = await load({ ...locationOptions, noLocation: !noLocation });
          const repeated = await load({ ...locationOptions, noLocation });

          expectLocations(first, noLocation);
          expectLocations(opposite, !noLocation);
          expectLocations(repeated, noLocation);
          expect(opposite.map(print)).toEqual(first.map(print));
          expect(repeated.map(print)).toEqual(first.map(print));
          expect(repeated[0].definitions[0]).toBe(first[0].definitions[0]);
          expect(opposite[0].definitions[0]).not.toBe(first[0].definitions[0]);
        },
      );

      it('reuses the provider cache for omitted, undefined and true', async () => {
        const fileContentFilter = jest.fn((_content: string, _filePath: string) => true);
        const options = { ...locationOptions, fileContentFilter };
        const omitted = await load(options);
        const explicitUndefined = await load({ ...options, noLocation: undefined });
        const explicitTrue = await load({ ...options, noLocation: true });

        expectLocations(omitted, true);
        expect(explicitUndefined[0].definitions[0]).toBe(omitted[0].definitions[0]);
        expect(explicitTrue[0].definitions[0]).toBe(omitted[0].definitions[0]);
        const providerFile = expectedPath(FIXTURES_DIR, 'location-provider/src/fragments.graphql');
        expect(
          fileContentFilter.mock.calls.filter(([, file]) => file === providerFile),
        ).toHaveLength(1);
      });
    });

    describe.each(entryPoints.slice(0, 2))('$name provider reused as consumer', ({ load }) => {
      it.each([true, false])(
        'reuses and invalidates the correct cache with noLocation: %s',
        async noLocation => {
          const providerDir = path.join(FIXTURES_DIR, 'fragment-direct-provider');
          const providerFileNative = path.join(providerDir, 'src/user-fields.graphql');
          const providerFile = expectedPath(providerFileNative);
          const packageJson = path.join(providerDir, 'package.json');
          const originalSource = readFileSync(providerFileNative, 'utf8');
          const originalPackageJson = readFileSync(packageJson, 'utf8');
          const fileContentFilter = jest.fn((_content: string, _filePath: string) => true);
          const options = { ...packageAOpts, noLocation, fileContentFilter };
          const targetOptions = { ...options, packageDir: providerDir };

          try {
            await load(options);
            await load({ ...options, noLocation: !noLocation });
            expectLocations(await load(targetOptions), noLocation);
            expectLocations(await load({ ...targetOptions, noLocation: !noLocation }), !noLocation);
            expect(
              fileContentFilter.mock.calls.filter(([, file]) => file === providerFile),
            ).toHaveLength(2);

            writeFileSync(providerFileNative, originalSource.replace('  ...UserEmail\n', ''));
            expect(await load(targetOptions)).toHaveLength(1);
            expect(await load({ ...targetOptions, invalidateTargetPackageCache: true })).toEqual(
              [],
            );

            writeFileSync(providerFileNative, originalSource);
            writeFileSync(packageJson, JSON.stringify({ name: 'fragment-direct-provider' }));
            await expect(
              Promise.resolve().then(() =>
                load({
                  ...targetOptions,
                  invalidateTargetPackageCache: true,
                }),
              ),
            ).rejects.toThrow('no transitive dependencies were found to search');
          } finally {
            writeFileSync(providerFileNative, originalSource);
            writeFileSync(packageJson, originalPackageJson);
            clearCache();
          }
        },
      );
    });

    it('isolates concurrent async callers with different location modes', async () => {
      const modes = [true, false, true, false];
      const results = await Promise.all(
        modes.map(noLocation => loader.load('.', { ...locationOptions, noLocation })),
      );
      results.forEach((sources, i) => {
        expectLocations(
          sources.map(source => source.document!),
          modes[i],
        );
        expect(sources[0].location).toBe(
          expectedPath(FIXTURES_DIR, 'location-provider/src/fragments.graphql'),
        );
        expect(sources[0].rawSDL).toBe(results[0][0].rawSDL);
      });
    });

    it.each([
      ['async', resolveExternalFragments],
      ['sync', resolveExternalFragmentsSync],
    ] as const)('preserves metadata-only results (%s)', async (_label, resolve) => {
      const withoutLocations = await resolve(locationOptions);
      const withLocations = await resolve({ ...locationOptions, noLocation: false });
      expect(withLocations).toEqual(withoutLocations);
      expect(withLocations).toEqual([
        {
          filePath: expectedPath(FIXTURES_DIR, 'location-provider/src/fragments.graphql'),
          packageName: 'location-provider',
          definitions: [
            { name: 'Fields', typeCondition: 'Foo' },
            { name: 'Unused', typeCondition: 'Foo' },
          ],
        },
      ]);
    });
  });

  describe('fileContentFilter option', () => {
    it('should skip files that do not pass the filter', async () => {
      const result = await resolveExternalFragments({
        ...tsOpts,
        fileContentFilter: content => content.includes('graphql-tag'),
      });

      expect(result.length).toBe(1);
    });

    it('should return empty when fileContentFilter rejects all files in root', async () => {
      const result = await resolveExternalFragments({
        ...tsOpts,
        fileContentFilter: () => false,
      });

      expect(result).toEqual([]);
    });
  });

  describe('packageDependencyFilter option', () => {
    const depFilterOpts = {
      packageDir: path.join(FIXTURES_DIR, 'dep-filter-consumer'),
      externalPackagesDirs: [FIXTURES_DIR],
    };

    it('should scan only packages whose deps pass the filter, traversing intermediaries', async () => {
      const result = await resolveExternalFragments({
        ...depFilterOpts,
        packageDependencyFilter: deps => 'graphql-tag' in deps,
      });

      expect(result.length).toBe(1);
      expect(result[0].packageName).toBe('dep-filter-provider');
      expect(result[0].definitions).toEqual([{ name: 'ProductFields', typeCondition: 'Product' }]);
    });

    it('should scan all packages when packageDependencyFilter is not provided', async () => {
      const result = await resolveExternalFragments(depFilterOpts);

      expect(result.length).toBe(1);
      expect(result[0].packageName).toBe('dep-filter-provider');
    });

    it('should throw when the filter excludes the package that defines the needed fragment', async () => {
      await expect(
        resolveExternalFragments({
          ...depFilterOpts,
          packageDependencyFilter: () => false,
        }),
      ).rejects.toThrow('ProductFields');
    });
  });

  describe('caching', () => {
    beforeEach(() => {
      clearCache();
    });

    it('should return cached results on second call', async () => {
      const result1 = await resolveExternalFragments(packageAOpts);
      const result2 = await resolveExternalFragments(packageAOpts);

      expect(result1).toEqual(result2);
    });

    it.each([
      ['async', (opts: Record<string, unknown>) => resolveExternalFragments(opts as any)],
      ['sync', (opts: Record<string, unknown>) => resolveExternalFragmentsSync(opts as any)],
    ] as const)(
      'should avoid caching consumer maps but reuse provider maps (%s)',
      async (_label, resolve) => {
        const consumerFile = path.join(FIXTURES_DIR, 'fragment-consumer/src/query.graphql');
        const providerFile = path.join(
          FIXTURES_DIR,
          'fragment-direct-provider/src/user-fields.graphql',
        );
        const originalConsumer = readFileSync(consumerFile, 'utf8');
        const originalProvider = readFileSync(providerFile, 'utf8');

        try {
          await resolve(packageAOpts);

          writeFileSync(consumerFile, originalConsumer.replace('    ...UserFields\n', ''));
          expect(
            await resolve({
              ...packageAOpts,
              invalidateTargetPackageCache: false,
            }),
          ).toEqual([]);

          writeFileSync(providerFile, originalProvider.replace('  ...UserEmail\n', ''));
          const providerResult = await resolve({
            ...packageAOpts,
            packageDir: path.join(FIXTURES_DIR, 'fragment-direct-provider'),
          });

          expect(providerResult.map(result => path.basename(result.filePath))).toEqual([
            'user-email.graphql',
          ]);
        } finally {
          writeFileSync(consumerFile, originalConsumer);
          writeFileSync(providerFile, originalProvider);
          clearCache();
        }
      },
    );

    it.each([
      ['async', (opts: Record<string, unknown>) => resolveExternalFragments(opts as any)],
      ['sync', (opts: Record<string, unknown>) => resolveExternalFragmentsSync(opts as any)],
    ] as const)(
      'should not reuse fragment maps for different pluck configurations (%s)',
      async (_label, resolve) => {
        const baseOptions = {
          packageDir: path.join(FIXTURES_TS_DIR, 'typescript-consumer'),
          externalPackagesDirs: [FIXTURES_TS_DIR],
          extensions: ['ts', 'tsx'],
        };

        const withGqlIdentifier = await resolve({
          ...baseOptions,
          pluckConfig: { globalGqlIdentifierName: ['gql'] },
        });
        const withGraphqlIdentifier = await resolve({
          ...baseOptions,
          pluckConfig: { globalGqlIdentifierName: ['graphql'] },
        });

        expect(withGqlIdentifier).toHaveLength(1);
        expect(withGraphqlIdentifier).toEqual([]);
      },
    );

    it('should invalidate the target package cache when invalidateTargetPackageCache is set', async () => {
      const opts = { ...packageAOpts, invalidateTargetPackageCache: true };

      const result1 = await resolveExternalFragments(opts);
      const result2 = await resolveExternalFragments(opts);

      expect(result1.length).toBe(2);
      expect(result2.length).toBe(2);
    });

    it('clearCache should reset all caches', async () => {
      await resolveExternalFragments(packageAOpts);
      clearCache();
      const result = await resolveExternalFragments(packageAOpts);
      expect(result.length).toBe(2);
    });
  });
});
