import { Source, parseGraphQLJSON, Loader, isValidPath, BaseLoaderOptions } from '@graphql-tools/utils';
import { isAbsolute, resolve } from 'path';
import { readFileSync, promises as fsPromises, existsSync } from 'fs';
import { cwd } from 'process';

const { readFile, access } = fsPromises;

const FILE_EXTENSIONS = ['.json'];

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
export class JsonFileLoader implements Loader {
  loaderId(): string {
    return 'json-file';
  }

  async canLoad(pointer: string, options: JsonFileLoaderOptions): Promise<boolean> {
    if (isValidPath(pointer)) {
      if (FILE_EXTENSIONS.find(extension => pointer.endsWith(extension))) {
        const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || cwd(), pointer);
        try {
          await access(normalizedFilePath);
          return true;
        } catch {
          return false;
        }
      }
    }

    return false;
  }

  canLoadSync(pointer: string, options: JsonFileLoaderOptions): boolean {
    if (isValidPath(pointer)) {
      if (FILE_EXTENSIONS.find(extension => pointer.endsWith(extension))) {
        const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || cwd(), pointer);
        return existsSync(normalizedFilePath);
      }
    }

    return false;
  }

  async load(pointer: string, options: JsonFileLoaderOptions): Promise<Source[]> {
    const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || cwd(), pointer);
    if (!(await this.canLoad(normalizedFilePath, options))) {
      return [];
    }

    try {
      const jsonContent: string = await readFile(normalizedFilePath, { encoding: 'utf8' });
      return [parseGraphQLJSON(pointer, jsonContent, options)];
    } catch (e) {
      throw new Error(`Unable to read JSON file: ${normalizedFilePath}: ${e.message || /* istanbul ignore next */ e}`);
    }
  }

  loadSync(pointer: string, options: JsonFileLoaderOptions): Source[] {
    const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || cwd(), pointer);
    if (!this.canLoadSync(normalizedFilePath, options)) {
      return [];
    }

    try {
      const jsonContent = readFileSync(normalizedFilePath, 'utf8');
      return [parseGraphQLJSON(pointer, jsonContent, options)];
    } catch (e) {
      throw new Error(`Unable to read JSON file: ${normalizedFilePath}: ${e.message || /* istanbul ignore next */ e}`);
    }
  }
}
