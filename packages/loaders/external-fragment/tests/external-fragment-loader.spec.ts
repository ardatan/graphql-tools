import * as path from 'path';
import monorepoFragmentLoader, {
  clearCache,
  MonorepoFragmentLoader,
  resolveMonorepoFragments,
  resolveMonorepoFragmentsSync,
} from '../src/index.js';

const FIXTURES_DIR = path.join(__dirname, 'test-external');
const FIXTURES_TS_DIR = path.join(__dirname, 'test-external-ts');
const FIXTURES_DUP_DIR = path.join(__dirname, 'test-external-dup');

describe('MonorepoFragmentLoader', () => {
  const loader = new MonorepoFragmentLoader();

  describe('resolveMonorepoFragments', () => {
    it('should resolve direct fragment dependency from a sibling package', async () => {
      const result = await resolveMonorepoFragments({
        packageDir: path.join(FIXTURES_DIR, 'package-a'),
        externalPackagesDirs: [FIXTURES_DIR],
      });

      expect(result.length).toBe(2);

      const fileNames = result.map(r => path.basename(r.filePath)).sort();
      expect(fileNames).toEqual(['user-email.graphql', 'user-fields.graphql']);

      const userFields = result.find(r => r.filePath.includes('user-fields.graphql'))!;
      expect(userFields.packageName).toBe('package-b');
      expect(userFields.definitions).toEqual([{ name: 'UserFields', typeCondition: 'User' }]);
    });

    it('should resolve fragments with a single custom extension', async () => {
      const result = await resolveMonorepoFragments({
        packageDir: path.join(FIXTURES_DIR, 'package-a'),
        externalPackagesDirs: [FIXTURES_DIR],
        extensions: ['graphql'],
      });

      expect(result.map(r => path.basename(r.filePath)).sort()).toEqual([
        'user-email.graphql',
        'user-fields.graphql',
      ]);
    });

    it('should resolve fragments with a single custom extension synchronously', () => {
      const result = resolveMonorepoFragmentsSync({
        packageDir: path.join(FIXTURES_DIR, 'package-a'),
        externalPackagesDirs: [FIXTURES_DIR],
        extensions: ['graphql'],
      });

      expect(result.map(r => path.basename(r.filePath)).sort()).toEqual([
        'user-email.graphql',
        'user-fields.graphql',
      ]);
    });

    it('should resolve transitive fragment dependencies (fragments that spread other external fragments)', async () => {
      const result = await resolveMonorepoFragments({
        packageDir: path.join(FIXTURES_DIR, 'package-a'),
        externalPackagesDirs: [FIXTURES_DIR],
      });

      const userEmail = result.find(r => r.filePath.includes('user-email.graphql'))!;
      expect(userEmail).toBeDefined();
      expect(userEmail.packageName).toBe('package-c');
      expect(userEmail.definitions).toEqual([{ name: 'UserEmail', typeCondition: 'User' }]);
    });

    it('should return empty array when no external fragments are needed', async () => {
      const result = await resolveMonorepoFragments({
        packageDir: path.join(FIXTURES_DIR, 'package-c'),
        externalPackagesDirs: [FIXTURES_DIR],
      });

      expect(result).toEqual([]);
    });

    it('should respect the filter option', async () => {
      // Only package-b passes the filter, so package-c (which defines UserEmail)
      // won't be found in transitive deps. This should throw.
      await expect(
        resolveMonorepoFragments({
          packageDir: path.join(FIXTURES_DIR, 'package-a'),
          externalPackagesDirs: [FIXTURES_DIR],
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
      // package-b spreads UserEmail but has no dependency on package-c
      // when we set filter to reject package-c
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
    it('should return Source objects with document and location', async () => {
      const sources = await loader.load('.', {
        packageDir: path.join(FIXTURES_DIR, 'package-a'),
        externalPackagesDirs: [FIXTURES_DIR],
      });

      expect(sources.length).toBe(2);
      for (const source of sources) {
        expect(source.location).toBeDefined();
        expect(source.document).toBeDefined();
        expect(source.rawSDL).toBeDefined();
        expect(source.document!.kind).toBe('Document');
      }
    });

    it('should work synchronously via loadSync', () => {
      const sources = loader.loadSync('.', {
        packageDir: path.join(FIXTURES_DIR, 'package-a'),
        externalPackagesDirs: [FIXTURES_DIR],
      });

      expect(sources.length).toBe(2);
      const locations = sources.map(s => path.basename(s.location!)).sort();
      expect(locations).toEqual(['user-email.graphql', 'user-fields.graphql']);
    });
  });

  describe('TypeScript code files', () => {
    const options = {
      packageDir: path.join(FIXTURES_TS_DIR, 'app'),
      externalPackagesDirs: [FIXTURES_TS_DIR],
      extensions: ['ts', 'tsx', 'js', 'jsx'],
    };

    it('should resolve fragments from .ts files using CodeFileLoader', async () => {
      const result = await resolveMonorepoFragments(options);

      expect(result.length).toBe(1);
      expect(result[0].packageName).toBe('shared');
      expect(result[0].definitions).toEqual([
        { name: 'SharedUserFragment', typeCondition: 'User' },
      ]);
    });

    it('should load fragments from .ts files with the async loader interface', async () => {
      const sources = await loader.load('.', options);

      expect(sources).toHaveLength(1);
      expect(sources[0].rawSDL).toContain('fragment SharedUserFragment on User');
      expect(sources[0].rawSDL).not.toContain('import { gql }');
      expect(sources[0].document?.definitions).toHaveLength(1);
    });

    it('should load fragments from .ts files with the sync loader interface', () => {
      const sources = loader.loadSync('.', options);

      expect(sources).toHaveLength(1);
      expect(sources[0].rawSDL).toContain('fragment SharedUserFragment on User');
      expect(sources[0].rawSDL).not.toContain('import { gql }');
      expect(sources[0].document?.definitions).toHaveLength(1);
    });

    it('should load fragments from .ts files with the function loader', async () => {
      const sources = await monorepoFragmentLoader('.', options);

      expect(sources).toHaveLength(1);
      expect(sources[0].document.definitions).toHaveLength(1);
    });
  });

  describe('fileContentFilter option', () => {
    it('should skip files that do not pass the filter', async () => {
      const result = await resolveMonorepoFragments({
        packageDir: path.join(FIXTURES_TS_DIR, 'app'),
        externalPackagesDirs: [FIXTURES_TS_DIR],
        extensions: ['ts', 'tsx', 'js', 'jsx'],
        fileContentFilter: content => content.includes('graphql-tag'),
      });

      expect(result.length).toBe(1);
    });

    it('should return empty when fileContentFilter rejects all files in root', async () => {
      const result = await resolveMonorepoFragments({
        packageDir: path.join(FIXTURES_TS_DIR, 'app'),
        externalPackagesDirs: [FIXTURES_TS_DIR],
        extensions: ['ts', 'tsx', 'js', 'jsx'],
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
      const opts = {
        packageDir: path.join(FIXTURES_DIR, 'package-a'),
        externalPackagesDirs: [FIXTURES_DIR],
      };

      const result1 = await resolveMonorepoFragments(opts);
      const result2 = await resolveMonorepoFragments(opts);

      expect(result1).toEqual(result2);
    });

    it('should not reuse async fragment maps for different pluck configurations', async () => {
      const baseOptions = {
        packageDir: path.join(FIXTURES_TS_DIR, 'app'),
        externalPackagesDirs: [FIXTURES_TS_DIR],
        extensions: ['ts', 'tsx'],
      };

      const withGqlIdentifier = await resolveMonorepoFragments({
        ...baseOptions,
        pluckConfig: { globalGqlIdentifierName: ['gql'] },
      });
      const withGraphqlIdentifier = await resolveMonorepoFragments({
        ...baseOptions,
        pluckConfig: { globalGqlIdentifierName: ['graphql'] },
      });

      expect(withGqlIdentifier).toHaveLength(1);
      expect(withGraphqlIdentifier).toEqual([]);
    });

    it('should not reuse sync fragment maps for different pluck configurations', () => {
      const baseOptions = {
        packageDir: path.join(FIXTURES_TS_DIR, 'app'),
        externalPackagesDirs: [FIXTURES_TS_DIR],
        extensions: ['ts', 'tsx'],
      };

      const withGqlIdentifier = resolveMonorepoFragmentsSync({
        ...baseOptions,
        pluckConfig: { globalGqlIdentifierName: ['gql'] },
      });
      const withGraphqlIdentifier = resolveMonorepoFragmentsSync({
        ...baseOptions,
        pluckConfig: { globalGqlIdentifierName: ['graphql'] },
      });

      expect(withGqlIdentifier).toHaveLength(1);
      expect(withGraphqlIdentifier).toEqual([]);
    });

    it('should invalidate root package cache when invalidateRootPackageCache is set', async () => {
      const opts = {
        packageDir: path.join(FIXTURES_DIR, 'package-a'),
        externalPackagesDirs: [FIXTURES_DIR],
        invalidateRootPackageCache: true,
      };

      const result1 = await resolveMonorepoFragments(opts);
      const result2 = await resolveMonorepoFragments(opts);

      expect(result1.length).toBe(2);
      expect(result2.length).toBe(2);
    });

    it('clearCache should reset all caches', async () => {
      await resolveMonorepoFragments({
        packageDir: path.join(FIXTURES_DIR, 'package-a'),
        externalPackagesDirs: [FIXTURES_DIR],
      });

      clearCache();

      const result = await resolveMonorepoFragments({
        packageDir: path.join(FIXTURES_DIR, 'package-a'),
        externalPackagesDirs: [FIXTURES_DIR],
      });
      expect(result.length).toBe(2);
    });
  });
});
