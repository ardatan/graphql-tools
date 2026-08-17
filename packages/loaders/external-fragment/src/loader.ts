import { promises as fsPromises, readFileSync } from 'fs';
import { parse } from 'graphql';
import type { DocumentNode } from 'graphql';
import type { Loader, Source } from '@graphql-tools/utils';
import type { MonorepoFragmentLoaderOptions } from './options.js';
import { resolveMonorepoFragments, resolveMonorepoFragmentsSync } from './resolve.js';

const { readFile } = fsPromises;

/**
 * A GraphQL loader that resolves cross-package fragment dependencies in monorepos.
 *
 * Given a package in a monorepo, it scans the package for fragment spreads,
 * identifies which fragments are not defined locally, then walks the package's
 * transitive dependencies to locate those fragments. It iteratively resolves
 * further spreads found in external files (fragments can spread other external fragments).
 *
 * The loader returns Source objects for each external file containing needed fragments,
 * suitable for use as `externalDocuments` in GraphQL Codegen or any tool that uses
 * the @graphql-tools loader interface.
 *
 * ```js
 * const sources = await loader.load('.', {
 *   packageDir: '/path/to/my-package',
 *   externalPackagesDirs: ['/path/to/monorepo/packages'],
 *   externalPackageNameFilter: name => name.startsWith('@my-org/'),
 *   fileContentFilter: content => content.includes('from "@apollo/client"')
 * });
 * ```
 */
/**
 * Function-based loader for use with GraphQL Codegen's custom loader config.
 *
 * ```yaml
 * # codegen.yml
 * externalDocuments:
 *   '.':
 *     loader: '@graphql-tools/external-fragment-loader'
 *     packageDir: ./packages/my-package
 *     externalPackagesDirs:
 *       - ./packages
 * ```
 *
 * All properties alongside `loader` are passed as options.
 */
export default async function monorepoFragmentLoader(
  _pointer: string,
  options: MonorepoFragmentLoaderOptions,
): Promise<Array<{ document: DocumentNode; location: string }>> {
  const resolvedFiles = await resolveMonorepoFragments(options);

  return resolvedFiles.map(file => {
    const content = readFileSync(file.filePath, 'utf8');
    return {
      location: file.filePath,
      document: parse(content, { noLocation: true }),
    };
  });
}

export class MonorepoFragmentLoader implements Loader<MonorepoFragmentLoaderOptions> {
  async load(_pointer: string, options: MonorepoFragmentLoaderOptions): Promise<Source[]> {
    const resolvedFiles = await resolveMonorepoFragments({
      packageDir: options.packageDir,
      externalPackagesDirs: options.externalPackagesDirs,
      externalPackageNameFilter: options.externalPackageNameFilter,
      includeDevDependencies: options.includeDevDependencies,
      scanInternalDirs: options.scanInternalDirs,
      extensions: options.extensions,
      excludePatterns: options.excludePatterns,
      pluckConfig: options.pluckConfig,
      fileContentFilter: options.fileContentFilter,
      cacheTTL: options.cacheTTL,
      invalidateRootPackageCache: options.invalidateRootPackageCache,
    });

    const sources: Source[] = [];
    for (const file of resolvedFiles) {
      const content = await readFile(file.filePath, 'utf8');
      sources.push({
        location: file.filePath,
        rawSDL: content,
        document: parse(content, { noLocation: true }),
      });
    }

    return sources;
  }

  loadSync(_pointer: string, options: MonorepoFragmentLoaderOptions): Source[] {
    const resolvedFiles = resolveMonorepoFragmentsSync({
      packageDir: options.packageDir,
      externalPackagesDirs: options.externalPackagesDirs,
      externalPackageNameFilter: options.externalPackageNameFilter,
      includeDevDependencies: options.includeDevDependencies,
      scanInternalDirs: options.scanInternalDirs,
      extensions: options.extensions,
      excludePatterns: options.excludePatterns,
      pluckConfig: options.pluckConfig,
      fileContentFilter: options.fileContentFilter,
      cacheTTL: options.cacheTTL,
      invalidateRootPackageCache: options.invalidateRootPackageCache,
    });

    const sources: Source[] = [];
    for (const file of resolvedFiles) {
      const content = readFileSync(file.filePath, 'utf8');
      sources.push({
        location: file.filePath,
        rawSDL: content,
        document: parse(content, { noLocation: true }),
      });
    }

    return sources;
  }
}
