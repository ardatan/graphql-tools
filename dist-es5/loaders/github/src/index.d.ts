import { Loader, BaseLoaderOptions, Source } from '@graphql-tools/utils';
import { GraphQLTagPluckOptions } from '@graphql-tools/graphql-tag-pluck';
/**
 * Additional options for loading from GitHub
 */
export interface GithubLoaderOptions extends BaseLoaderOptions {
  /**
   * A GitHub access token
   */
  token: string;
  /**
   * Additional options to pass to `graphql-tag-pluck`
   */
  pluckConfig?: GraphQLTagPluckOptions;
}
/**
 * This loader loads a file from GitHub.
 *
 * ```js
 * const typeDefs = await loadTypedefs('github:githubUser/githubRepo#branchName:path/to/file.ts', {
 *   loaders: [new GithubLoader()],
 *   token: YOUR_GITHUB_TOKEN,
 * })
 * ```
 */
export declare class GithubLoader implements Loader<GithubLoaderOptions> {
  canLoad(pointer: string): Promise<boolean>;
  canLoadSync(): boolean;
  load(pointer: string, options: GithubLoaderOptions): Promise<Source[]>;
  loadSync(): never;
}
