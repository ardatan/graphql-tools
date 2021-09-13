import { Source, Loader, BaseLoaderOptions } from '@graphql-tools/utils';
/**
 * Additional options for loading from a GraphQL file
 */
export interface GraphQLFileLoaderOptions extends BaseLoaderOptions {
  /**
   * Set to `true` to disable handling `#import` syntax
   */
  skipGraphQLImport?: boolean;
}
/**
 * This loader loads documents and type definitions from `.graphql` files.
 *
 * You can load a single source:
 *
 * ```js
 * const schema = await loadSchema('schema.graphql', {
 *   loaders: [
 *     new GraphQLFileLoader()
 *   ]
 * });
 * ```
 *
 * Or provide a glob pattern to load multiple sources:
 *
 * ```js
 * const schema = await loadSchema('graphql/*.graphql', {
 *   loaders: [
 *     new GraphQLFileLoader()
 *   ]
 * });
 * ```
 */
export declare class GraphQLFileLoader implements Loader<GraphQLFileLoaderOptions> {
  canLoad(pointer: string, options: GraphQLFileLoaderOptions): Promise<boolean>;
  canLoadSync(pointer: string, options: GraphQLFileLoaderOptions): boolean;
  private _buildGlobs;
  resolveGlobs(glob: string, options: GraphQLFileLoaderOptions): Promise<string[]>;
  resolveGlobsSync(glob: string, options: GraphQLFileLoaderOptions): string[];
  load(pointer: string, options: GraphQLFileLoaderOptions): Promise<Source[]>;
  loadSync(pointer: string, options: GraphQLFileLoaderOptions): Source[];
  handleFileContent(
    rawSDL: string,
    pointer: string,
    options: GraphQLFileLoaderOptions
  ): {
    location: string | undefined;
    document: import('graphql').DocumentNode;
  };
}
