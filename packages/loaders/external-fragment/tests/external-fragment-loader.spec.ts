import * as path from 'path';
import { loadDocuments, loadDocumentsSync } from '@graphql-tools/load';
import monorepoFragmentLoader, {
  clearCache,
  MonorepoFragmentLoader,
  resolveMonorepoFragments,
  resolveMonorepoFragmentsSync,
} from '../src/index.js';

const FIXTURES_DIR = path.join(__dirname, 'test-external');
const FIXTURES_TS_DIR = path.join(__dirname, 'test-external-ts');
const FIXTURES_DUP_DIR = path.join(__dirname, 'test-external-dup');

const packageAOpts = {
  packageDir: path.join(FIXTURES_DIR, 'package-a'),
  externalPackagesDirs: [FIXTURES_DIR],
};

const tsOpts = {
  packageDir: path.join(FIXTURES_TS_DIR, 'app'),
  externalPackagesDirs: [FIXTURES_TS_DIR],
  extensions: ['ts', 'tsx', 'js', 'jsx'] as string[],
};

describe('MonorepoFragmentLoader', () => {
  const loader = new MonorepoFragmentLoader();

  describe('resolveMonorepoFragments', () => {
    it('should resolve direct and transitive fragment dependencies', async () => {
      const result = await resolveMonorepoFragments(packageAOpts);

      expect(result.map(r => path.basename(r.filePath)).sort()).toEqual([
        'user-email.graphql',
        'user-fields.graphql',
      ]);

      const userFields = result.find(r => r.filePath.includes('user-fields.graphql'))!;
      expect(userFields.packageName).toBe('package-b');
      expect(userFields.definitions).toEqual([{ name: 'UserFields', typeCondition: 'User' }]);

      const userEmail = result.find(r => r.filePath.includes('user-email.graphql'))!;
      expect(userEmail.packageName).toBe('package-c');
      expect(userEmail.definitions).toEqual([{ name: 'UserEmail', typeCondition: 'User' }]);
    });

    it.each([
      [
        'async',
        (opts: typeof packageAOpts & { extensions?: string[] }) => resolveMonorepoFragments(opts),
      ],
      [
        'sync',
        (opts: typeof packageAOpts & { extensions?: string[] }) =>
          resolveMonorepoFragmentsSync(opts),
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
      const result = await resolveMonorepoFragments({
        packageDir: path.join(FIXTURES_DIR, 'package-c'),
        externalPackagesDirs: [FIXTURES_DIR],
      });

      expect(result).toEqual([]);
    });

    it('should respect the filter option', async () => {
      await expect(
        resolveMonorepoFragments({
          ...packageAOpts,
          externalPackageNameFilter: name => name === 'package-b',
        }),
      ).rejects.toThrow(
        'Fragment "UserEmail" is spread in "package-a" but not defined in any of its transitive dependencies.',
      );
    });

    it('should throw on duplicate fragments across dependencies', async () => {
      await expect(
        resolveMonorepoFragments({
          packageDir: path.join(FIXTURES_DUP_DIR, 'pkg-main'),
          externalPackagesDirs: [FIXTURES_DUP_DIR],
        }),
      ).rejects.toThrow('Duplicate fragment "ItemFields"');
    });

    it('should throw when a fragment is not found in any dependency', async () => {
      await expect(
        resolveMonorepoFragments({
          packageDir: path.join(FIXTURES_DIR, 'package-b'),
          externalPackagesDirs: [FIXTURES_DIR],
          externalPackageNameFilter: name => name !== 'package-c',
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
      },
    );
  });

  describe('TypeScript code files', () => {
    it('should resolve fragments from .ts files', async () => {
      const result = await resolveMonorepoFragments(tsOpts);

      expect(result.length).toBe(1);
      expect(result[0].packageName).toBe('shared');
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

    it('should load fragments from .ts files with the function loader', () => {
      const document = monorepoFragmentLoader('.', tsOpts);

      expect(document.kind).toBe('Document');
      expect(document.definitions).toHaveLength(1);
    });

    it('should work as an @graphql-tools/load custom loader', async () => {
      const pointer = {
        '.': {
          loader: monorepoFragmentLoader,
          ...packageAOpts,
        },
      };

      const [asyncSource] = await loadDocuments(pointer, { loaders: [] });
      const [syncSource] = loadDocumentsSync(pointer, { loaders: [] });

      expect(asyncSource.document?.definitions).toHaveLength(2);
      expect(syncSource.document?.definitions).toHaveLength(2);
    });
  });

  describe('fileContentFilter option', () => {
    it('should skip files that do not pass the filter', async () => {
      const result = await resolveMonorepoFragments({
        ...tsOpts,
        fileContentFilter: content => content.includes('graphql-tag'),
      });

      expect(result.length).toBe(1);
    });

    it('should return empty when fileContentFilter rejects all files in root', async () => {
      const result = await resolveMonorepoFragments({
        ...tsOpts,
        fileContentFilter: () => false,
      });

      expect(result).toEqual([]);
    });
  });

  describe('caching', () => {
    beforeEach(() => {
      clearCache();
    });

    it('should return cached results on second call', async () => {
      const result1 = await resolveMonorepoFragments(packageAOpts);
      const result2 = await resolveMonorepoFragments(packageAOpts);

      expect(result1).toEqual(result2);
    });

    it.each([
      ['async', (opts: Record<string, unknown>) => resolveMonorepoFragments(opts as any)],
      ['sync', (opts: Record<string, unknown>) => resolveMonorepoFragmentsSync(opts as any)],
    ] as const)(
      'should not reuse fragment maps for different pluck configurations (%s)',
      async (_label, resolve) => {
        const baseOptions = {
          packageDir: path.join(FIXTURES_TS_DIR, 'app'),
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

    it('should invalidate root package cache when invalidateRootPackageCache is set', async () => {
      const opts = { ...packageAOpts, invalidateRootPackageCache: true };

      const result1 = await resolveMonorepoFragments(opts);
      const result2 = await resolveMonorepoFragments(opts);

      expect(result1.length).toBe(2);
      expect(result2.length).toBe(2);
    });

    it('clearCache should reset all caches', async () => {
      await resolveMonorepoFragments(packageAOpts);
      clearCache();
      const result = await resolveMonorepoFragments(packageAOpts);
      expect(result.length).toBe(2);
    });
  });
});
