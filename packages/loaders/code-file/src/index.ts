import { Kind, isSchema, print } from 'graphql';
import {
  SchemaPointerSingle,
  DocumentPointerSingle,
  debugLog,
  SingleFileOptions,
  Source,
  UniversalLoader,
  asArray,
  isValidPath,
  parseGraphQLSDL,
  printSchemaWithDirectives,
} from '@graphql-tools/utils';
import {
  GraphQLTagPluckOptions,
  gqlPluckFromCodeString,
  gqlPluckFromCodeStringSync,
} from '@graphql-tools/graphql-tag-pluck';
import { tryToLoadFromExport, tryToLoadFromExportSync } from './load-from-module';
import { isAbsolute, resolve } from 'path';
import { readFileSync, readFile, pathExists, pathExistsSync } from 'fs-extra';
import { cwd } from 'process';

/**
 * Additional options for loading from a code file
 */
export type CodeFileLoaderOptions = {
  require?: string | string[];
  pluckConfig?: GraphQLTagPluckOptions;
  noPluck?: boolean;
  noRequire?: boolean;
} & SingleFileOptions;

const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.vue'];

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
export class CodeFileLoader implements UniversalLoader<CodeFileLoaderOptions> {
  loaderId(): string {
    return 'code-file';
  }

  async canLoad(
    pointer: SchemaPointerSingle | DocumentPointerSingle,
    options: CodeFileLoaderOptions
  ): Promise<boolean> {
    if (isValidPath(pointer)) {
      if (FILE_EXTENSIONS.find(extension => pointer.endsWith(extension))) {
        const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || cwd(), pointer);
        return pathExists(normalizedFilePath);
      }
    }

    return false;
  }

  canLoadSync(pointer: SchemaPointerSingle | DocumentPointerSingle, options: CodeFileLoaderOptions): boolean {
    if (isValidPath(pointer)) {
      if (FILE_EXTENSIONS.find(extension => pointer.endsWith(extension))) {
        const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || cwd(), pointer);
        return pathExistsSync(normalizedFilePath);
      }
    }

    return false;
  }

  async load(pointer: SchemaPointerSingle | DocumentPointerSingle, options: CodeFileLoaderOptions): Promise<Source> {
    const normalizedFilePath = ensureAbsolutePath(pointer, options);

    const errors: Error[] = [];

    if (!options.noPluck) {
      try {
        const content = await readFile(normalizedFilePath, { encoding: 'utf-8' });
        const sdl = await gqlPluckFromCodeString(normalizedFilePath, content, options.pluckConfig);

        if (sdl) {
          return parseSDL({ pointer, sdl, options });
        }
      } catch (e) {
        debugLog(`Failed to load schema from code file "${normalizedFilePath}": ${e.message}`);
        errors.push(e);
      }
    }

    if (!options.noRequire) {
      try {
        if (options && options.require) {
          await Promise.all(asArray(options.require).map(m => import(m)));
        }

        const loaded = await tryToLoadFromExport(normalizedFilePath);
        const source = resolveSource(pointer, loaded, options);

        if (source) {
          return source;
        }
      } catch (e) {
        errors.push(e);
      }
    }

    if (errors.length > 0) {
      throw errors[0];
    }

    return null;
  }

  loadSync(pointer: SchemaPointerSingle | DocumentPointerSingle, options: CodeFileLoaderOptions): Source {
    const normalizedFilePath = ensureAbsolutePath(pointer, options);

    const errors: Error[] = [];

    if (!options.noPluck) {
      try {
        const content = readFileSync(normalizedFilePath, { encoding: 'utf-8' });
        const sdl = gqlPluckFromCodeStringSync(normalizedFilePath, content, options.pluckConfig);

        if (sdl) {
          return parseSDL({ pointer, sdl, options });
        }
      } catch (e) {
        debugLog(`Failed to load schema from code file "${normalizedFilePath}": ${e.message}`);
        errors.push(e);
      }
    }

    if (!options.noRequire) {
      try {
        if (options && options.require) {
          asArray(options.require).forEach(m => require(m));
        }

        const loaded = tryToLoadFromExportSync(normalizedFilePath);
        const source = resolveSource(pointer, loaded, options);

        if (source) {
          return source;
        }
      } catch (e) {
        errors.push(e);
      }
    }

    if (errors.length > 0) {
      throw errors[0];
    }

    return null;
  }
}

function parseSDL({ pointer, sdl, options }: { pointer: string; sdl: string; options: CodeFileLoaderOptions }) {
  return parseGraphQLSDL(pointer, sdl, options);
}

function resolveSource(pointer: string, value: any, options: CodeFileLoaderOptions): Source | null {
  if (isSchema(value)) {
    return {
      location: pointer,
      rawSDL: printSchemaWithDirectives(value, options),
      schema: value,
    };
  } else if (value?.kind === Kind.DOCUMENT) {
    return {
      location: pointer,
      rawSDL: print(value),
      document: value,
    };
  } else if (typeof value === 'string') {
    return parseGraphQLSDL(pointer, value, options);
  }

  return null;
}

function ensureAbsolutePath(
  pointer: SchemaPointerSingle | DocumentPointerSingle,
  options: CodeFileLoaderOptions
): string {
  return isAbsolute(pointer) ? pointer : resolve(options.cwd || cwd(), pointer);
}
