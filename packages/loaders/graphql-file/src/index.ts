import type { GlobbyOptions } from 'globby';

import { Source, Loader, isValidPath, parseGraphQLSDL, BaseLoaderOptions, asArray } from '@graphql-tools/utils';
import { isAbsolute, resolve } from 'path';
import { readFileSync, promises as fsPromises, existsSync } from 'fs';
import { cwd as processCwd } from 'process';
import { processImport } from '@graphql-tools/import';
import globby from 'globby';
import isGlob from 'is-glob';
import unixify from 'unixify';

const { readFile, access } = fsPromises;

const FILE_EXTENSIONS = ['.gql', '.gqls', '.graphql', '.graphqls'];

/**
 * Additional options for loading from a GraphQL file
 */
export interface GraphQLFileLoaderOptions extends BaseLoaderOptions {
  /**
   * Set to `true` to disable handling `#import` syntax
   */
  skipGraphQLImport?: boolean;
}

function isGraphQLImportFile(rawSDL: string) {
  const trimmedRawSDL = rawSDL.trim();
  return trimmedRawSDL.startsWith('# import') || trimmedRawSDL.startsWith('#import');
}

function createGlobbyOptions(options: GraphQLFileLoaderOptions): GlobbyOptions {
  return { absolute: true, ...options, ignore: [] };
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
export class GraphQLFileLoader implements Loader<GraphQLFileLoaderOptions> {
  loaderId(): string {
    return 'graphql-file';
  }

  async canLoad(pointer: string, options: GraphQLFileLoaderOptions): Promise<boolean> {
    if (isGlob(pointer)) {
      // FIXME: parse to find and check the file extensions?
      return true;
    }

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

  canLoadSync(pointer: string, options: GraphQLFileLoaderOptions): boolean {
    if (isGlob(pointer)) {
      // FIXME: parse to find and check the file extensions?
      return true;
    }

    if (isValidPath(pointer)) {
      if (FILE_EXTENSIONS.find(extension => pointer.endsWith(extension))) {
        const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || processCwd(), pointer);
        return existsSync(normalizedFilePath);
      }
    }

    return false;
  }

  async resolveGlobs(glob: string, options: GraphQLFileLoaderOptions) {
    const ignores = asArray(options.ignore || []);
    return globby([glob, ...ignores.map(v => `!(${v})`).map(v => unixify(v))], createGlobbyOptions(options));
  }

  resolveGlobsSync(glob: string, options: GraphQLFileLoaderOptions) {
    const ignores = asArray(options.ignore || []);
    return globby.sync([glob, ...ignores.map(v => `!(${v})`).map(v => unixify(v))], createGlobbyOptions(options));
  }

  async load(pointer: string, options: GraphQLFileLoaderOptions): Promise<Source[]> {
    if (isGlob(pointer)) {
      const resolvedPaths = await this.resolveGlobs(pointer, options);
      const finalResult: Source[] = [];
      await Promise.all(
        resolvedPaths.map(async path => {
          if (await this.canLoad(path, options)) {
            const result = await this.load(path, options);
            result?.forEach(result => finalResult.push(result));
          }
        })
      );
      return finalResult;
    }
    const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || processCwd(), pointer);
    const rawSDL: string = await readFile(normalizedFilePath, { encoding: 'utf8' });

    return [this.handleFileContent(rawSDL, normalizedFilePath, options)];
  }

  loadSync(pointer: string, options: GraphQLFileLoaderOptions): Source[] {
    if (isGlob(pointer)) {
      const resolvedPaths = this.resolveGlobsSync(pointer, options);
      const finalResult: Source[] = [];
      for (const path of resolvedPaths) {
        if (this.canLoadSync(path, options)) {
          const result = this.loadSync(path, options);
          result?.forEach(result => finalResult.push(result));
        }
      }
      return finalResult;
    }
    const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || processCwd(), pointer);
    const rawSDL = readFileSync(normalizedFilePath, { encoding: 'utf8' });
    return [this.handleFileContent(rawSDL, normalizedFilePath, options)];
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
