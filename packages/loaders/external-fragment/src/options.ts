import type { GraphQLTagPluckOptions } from '@graphql-tools/graphql-tag-pluck';
import type { BaseLoaderOptions } from '@graphql-tools/utils';

export interface MonorepoFragmentLoaderOptions extends BaseLoaderOptions {
  /**
   * Absolute path to the root package directory whose fragments we're resolving.
   * This is the package that has missing fragment spreads referencing other packages.
   */
  targetPackageDir: string;

  /**
   * Directories where dependency packages can be found.
   * Each entry is an absolute path to a directory containing package folders.
   *
   * @example ['/path/to/monorepo/packages', '/path/to/monorepo/libs', '/path/to/node_modules']
   */
  externalPackagesDirs: string[];

  /**
   * Directories within each package to scan for GraphQL fragments.
   * @default ['src']
   */
  scanInternalDirs?: string[];

  /**
   * File extensions to scan for GraphQL fragments (without the dot).
   * @default ['ts', 'tsx', 'js', 'jsx', 'graphql', 'gql']
   */
  extensions?: string[];

  /**
   * Glob patterns to exclude when scanning packages.
   * @default ['**\/__generated__/**', '**\/node_modules/**']
   */
  excludePatterns?: string[];

  /**
   * Filter function to decide which dependencies from package.json
   * should be considered as potential monorepo packages.
   * Return true to include the dependency in the search.
   * @default () => true (all dependencies are considered)
   *
   * @example (name) => name.startsWith('my-org-')
   */
  externalPackageNameFilter?: (packageName: string) => boolean;

  /**
   * Optional predicate to filter which files should be scanned for fragments.
   * Receives the file content as a string. Return true to include the file.
   * Useful to skip files that don't import a GraphQL tag function.
   *
   * @example (content) => content.includes('from "@apollo/client"')
   */
  sourceFileFilter?: (content: string, filePath: string) => boolean;

  /**
   * Whether to include devDependencies when scanning for transitive deps.
   * @default true
   */
  includeDevDependencies?: boolean;

  /**
   * Options for graphql-tag-pluck when extracting GraphQL from code files.
   */
  pluckConfig?: GraphQLTagPluckOptions;

  /**
   * Time-to-live for cache entries in milliseconds.
   * Set this for long-running processes (e.g. watch mode) so stale entries
   * are automatically evicted. Applied once on the first call; subsequent
   * calls ignore this value.
   * @default Infinity (cache forever)
   */
  cacheTTL?: number;

  /**
   * When true, the root package's cached fragment map is invalidated before
   * each resolution call. This is useful in watch mode where the root package
   * is the one being edited, so its cache should be refreshed, while dependency
   * caches can remain valid.
   * @default false
   */
  invalidateRootPackageCache?: boolean;
}
