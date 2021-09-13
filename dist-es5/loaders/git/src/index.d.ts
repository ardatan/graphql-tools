import { GraphQLTagPluckOptions } from '@graphql-tools/graphql-tag-pluck';
import { BaseLoaderOptions, Loader, Source } from '@graphql-tools/utils';
/**
 * Additional options for loading from git
 */
export declare type GitLoaderOptions = BaseLoaderOptions & {
  /**
   * Additional options to pass to `graphql-tag-pluck`
   */
  pluckConfig?: GraphQLTagPluckOptions;
};
/**
 * This loader loads a file from git.
 *
 * ```js
 * const typeDefs = await loadTypedefs('git:someBranch:some/path/to/file.js', {
 *   loaders: [new GitLoader()],
 * })
 * ```
 */
export declare class GitLoader implements Loader<GitLoaderOptions> {
  canLoad(pointer: string): Promise<boolean>;
  canLoadSync(pointer: string): boolean;
  resolveGlobs(glob: string, ignores: string[]): Promise<Array<string>>;
  resolveGlobsSync(glob: string, ignores: string[]): string[];
  private handleSingularPointerAsync;
  load(pointer: string, options: GitLoaderOptions): Promise<Source[]>;
  private handleSingularPointerSync;
  loadSync(pointer: string, options: GitLoaderOptions): Source[];
}
