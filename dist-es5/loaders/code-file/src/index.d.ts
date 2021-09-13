import { Source, BaseLoaderOptions, Loader } from '@graphql-tools/utils';
import { GraphQLTagPluckOptions } from '@graphql-tools/graphql-tag-pluck';
export declare type CodeFileLoaderConfig = {
  pluckConfig?: GraphQLTagPluckOptions;
  noPluck?: boolean;
  noRequire?: boolean;
};
/**
 * Additional options for loading from a code file
 */
export declare type CodeFileLoaderOptions = {
  require?: string | string[];
} & CodeFileLoaderConfig &
  BaseLoaderOptions;
/**
 * This loader loads GraphQL documents and type definitions from code files
 * using `graphql-tag-pluck`.
 *
 * ```js
 * const documents = await loadDocuments('queries/*.js', {
 *   loaders: [
 *     new CodeFileLoader()
 *   ]
 * });
 * ```
 *
 * Supported extensions include: `.ts`, `.tsx`, `.js`, `.jsx`, `.vue`
 */
export declare class CodeFileLoader implements Loader<CodeFileLoaderOptions> {
  private config;
  constructor(config?: CodeFileLoaderConfig);
  private getMergedOptions;
  canLoad(pointer: string, options: CodeFileLoaderOptions): Promise<boolean>;
  canLoadSync(pointer: string, options: CodeFileLoaderOptions): boolean;
  private _buildGlobs;
  resolveGlobs(glob: string, options: CodeFileLoaderOptions): Promise<string[]>;
  resolveGlobsSync(glob: string, options: CodeFileLoaderOptions): string[];
  load(pointer: string, options: CodeFileLoaderOptions): Promise<Source[]>;
  loadSync(pointer: string, options: CodeFileLoaderOptions): Source[] | null;
  handleSinglePath(location: string, options: CodeFileLoaderOptions): Promise<Source[]>;
  handleSinglePathSync(location: string, options: CodeFileLoaderOptions): Source[] | null;
}
