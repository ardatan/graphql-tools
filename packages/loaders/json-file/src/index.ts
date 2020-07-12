import {
  Source,
  parseGraphQLJSON,
  SchemaPointerSingle,
  DocumentLoader,
  isValidPath,
  SingleFileOptions,
} from '@graphql-tools/utils';
import { isAbsolute, resolve } from 'path';
import { readFile, readFileSync, pathExists, pathExistsSync } from 'fs-extra';
import { cwd } from 'process';

const FILE_EXTENSIONS = ['.json'];

/**
 * Additional options for loading from a JSON file
 */
export interface JsonFileLoaderOptions extends SingleFileOptions {}

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
export class JsonFileLoader implements DocumentLoader {
  loaderId(): string {
    return 'json-file';
  }

  async canLoad(pointer: SchemaPointerSingle, options: JsonFileLoaderOptions): Promise<boolean> {
    if (isValidPath(pointer)) {
      if (FILE_EXTENSIONS.find(extension => pointer.endsWith(extension))) {
        const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || cwd(), pointer);
        return pathExists(normalizedFilePath);
      }
    }

    return false;
  }

  canLoadSync(pointer: SchemaPointerSingle, options: JsonFileLoaderOptions): boolean {
    if (isValidPath(pointer)) {
      if (FILE_EXTENSIONS.find(extension => pointer.endsWith(extension))) {
        const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || cwd(), pointer);

        return pathExistsSync(normalizedFilePath);
      }
    }

    return false;
  }

  async load(pointer: SchemaPointerSingle, options: JsonFileLoaderOptions): Promise<Source> {
    const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || cwd(), pointer);

    try {
      const jsonContent: string = await readFile(normalizedFilePath, { encoding: 'utf8' });
      return parseGraphQLJSON(pointer, jsonContent, options);
    } catch (e) {
      throw new Error(`Unable to read JSON file: ${normalizedFilePath}: ${e.message || e}`);
    }
  }

  loadSync(pointer: SchemaPointerSingle, options: JsonFileLoaderOptions): Source {
    const normalizedFilepath = isAbsolute(pointer) ? pointer : resolve(options.cwd || cwd(), pointer);

    try {
      const jsonContent = readFileSync(normalizedFilepath, 'utf8');
      return parseGraphQLJSON(pointer, jsonContent, options);
    } catch (e) {
      throw new Error(`Unable to read JSON file: ${normalizedFilepath}: ${e.message || e}`);
    }
  }
}
