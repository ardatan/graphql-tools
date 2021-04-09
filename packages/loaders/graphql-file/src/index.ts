import {
  Source,
  UniversalLoader,
  DocumentPointerSingle,
  SchemaPointerSingle,
  isValidPath,
  parseGraphQLSDL,
  SingleFileOptions,
  makeCacheable,
  makeCacheableSync,
} from '@graphql-tools/utils';
import { isAbsolute, resolve } from 'path';
import { readFileSync, accessSync, promises as fsPromises } from 'fs';
import { cwd as processCwd } from 'process';
import { processImport } from '@graphql-tools/import';

const { readFile, access } = fsPromises;

const FILE_EXTENSIONS = ['.gql', '.gqls', '.graphql', '.graphqls'];

/**
 * Additional options for loading from a GraphQL file
 */
export interface GraphQLFileLoaderOptions extends SingleFileOptions {
  /**
   * Set to `true` to disable handling `#import` syntax
   */
  skipGraphQLImport?: boolean;
}

function isGraphQLImportFile(rawSDL: string) {
  const trimmedRawSDL = rawSDL.trim();
  return trimmedRawSDL.startsWith('# import') || trimmedRawSDL.startsWith('#import');
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
export class GraphQLFileLoader implements UniversalLoader<GraphQLFileLoaderOptions> {
  loaderId(): string {
    return 'graphql-file';
  }

  async canLoad(
    pointer: SchemaPointerSingle | DocumentPointerSingle,
    options: GraphQLFileLoaderOptions
  ): Promise<boolean> {
    if (isValidPath(pointer)) {
      if (FILE_EXTENSIONS.find(extension => pointer.endsWith(extension))) {
        const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || processCwd(), pointer);
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

  canLoadSync(pointer: SchemaPointerSingle | DocumentPointerSingle, options: GraphQLFileLoaderOptions): boolean {
    if (isValidPath(pointer)) {
      if (FILE_EXTENSIONS.find(extension => pointer.endsWith(extension))) {
        const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || processCwd(), pointer);
        try {
          accessSync(normalizedFilePath);
          return true;
        } catch {
          return false;
        }
      }
    }

    return false;
  }

  async load(pointer: SchemaPointerSingle | DocumentPointerSingle, options: GraphQLFileLoaderOptions): Promise<Source> {
    return makeCacheable(this._load.bind(this), pointer, options);
  }

  loadSync(pointer: SchemaPointerSingle | DocumentPointerSingle, options: GraphQLFileLoaderOptions): Source {
    return makeCacheableSync(this._loadSync.bind(this), pointer, options);
  }

  private _loadSync(pointer: SchemaPointerSingle | DocumentPointerSingle, options: GraphQLFileLoaderOptions): Source {
    const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || processCwd(), pointer);
    const rawSDL = readFileSync(normalizedFilePath, { encoding: 'utf8' });
    return this.handleFileContent(rawSDL, pointer, options);
  }

  private async _load(
    pointer: SchemaPointerSingle | DocumentPointerSingle,
    options: GraphQLFileLoaderOptions
  ): Promise<Source> {
    const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || processCwd(), pointer);
    const rawSDL: string = await readFile(normalizedFilePath, { encoding: 'utf8' });

    return this.handleFileContent(rawSDL, pointer, options);
  }

  handleFileContent(rawSDL: string, pointer: string, options: GraphQLFileLoaderOptions) {
    if (!options.skipGraphQLImport && isGraphQLImportFile(rawSDL)) {
      const document = processImport(pointer, options.cwd);
      return {
        location: pointer,
        document,
      };
    }

    return parseGraphQLSDL(pointer, rawSDL, options);
  }
}
