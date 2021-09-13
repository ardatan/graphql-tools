import { Source, Loader, BaseLoaderOptions } from '@graphql-tools/utils';
/**
 * Additional options for loading from a JSON file
 */
export interface JsonFileLoaderOptions extends BaseLoaderOptions {}
/**
 * This loader loads documents and type definitions from JSON files.
 *
 * The JSON file can be the result of an introspection query made against a schema:
 *
 * ```js
 * const schema = await loadSchema('schema-introspection.json', {
 *   loaders: [
 *     new JsonFileLoader()
 *   ]
 * });
 * ```
 *
 * Or it can be a `DocumentNode` object representing a GraphQL document or type definitions:
 *
 * ```js
 * const documents = await loadDocuments('queries/*.json', {
 *   loaders: [
 *     new GraphQLFileLoader()
 *   ]
 * });
 * ```
 */
export declare class JsonFileLoader implements Loader {
  canLoad(pointer: string, options: JsonFileLoaderOptions): Promise<boolean>;
  canLoadSync(pointer: string, options: JsonFileLoaderOptions): boolean;
  private _buildGlobs;
  resolveGlobs(glob: string, options: JsonFileLoaderOptions): Promise<string[]>;
  resolveGlobsSync(glob: string, options: JsonFileLoaderOptions): string[];
  load(pointer: string, options: JsonFileLoaderOptions): Promise<Source[]>;
  loadSync(pointer: string, options: JsonFileLoaderOptions): Source[];
  handleFileContent(normalizedFilePath: string, rawSDL: string, options: JsonFileLoaderOptions): Source;
}
