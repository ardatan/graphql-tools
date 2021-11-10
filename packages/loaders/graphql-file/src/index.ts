import type { GlobbyOptions } from 'globby';

import {
  Source,
  Loader,
  isValidPath,
  parseGraphQLSDL,
  BaseLoaderOptions,
  asArray,
  AggregateError,
} from '@graphql-tools/utils';
import { isAbsolute, resolve } from 'path';
import { readFileSync, promises as fsPromises, existsSync } from 'fs';
import { cwd as processCwd, env } from 'process';
import { processImport } from '@graphql-tools/import';
import globby from 'globby';
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

const buildIgnoreGlob = (path: string) => `!${path}`;

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
  async canLoad(pointer: string, options: GraphQLFileLoaderOptions): Promise<boolean> {
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
    if (isValidPath(pointer)) {
      if (FILE_EXTENSIONS.find(extension => pointer.endsWith(extension))) {
        const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || processCwd(), pointer);
        return existsSync(normalizedFilePath);
      }
    }
    return false;
  }

  private _buildGlobs(glob: string, options: GraphQLFileLoaderOptions) {
    const ignores = asArray(options.ignore || []);
    const globs = [unixify(glob), ...ignores.map(v => buildIgnoreGlob(unixify(v)))];
    return globs;
  }

  async resolveGlobs(glob: string, options: GraphQLFileLoaderOptions) {
    if (
      !glob.includes('*') &&
      (await this.canLoad(glob, options)) &&
      !asArray(options.ignore || []).length &&
      !options['includeSources']
    )
      return [glob]; // bypass globby when no glob character, can be loaded, no ignores and source not requested. Fixes problem with pkg and passes ci tests
    const globs = this._buildGlobs(glob, options);
    const result = await globby(globs, createGlobbyOptions(options));
    return result;
  }

  resolveGlobsSync(glob: string, options: GraphQLFileLoaderOptions) {
    if (
      !glob.includes('*') &&
      this.canLoadSync(glob, options) &&
      !asArray(options.ignore || []).length &&
      !options['includeSources']
    )
      return [glob]; // bypass globby when no glob character, can be loaded, no ignores and source not requested. Fixes problem with pkg and passes ci tests
    const globs = this._buildGlobs(glob, options);
    const result = globby.sync(globs, createGlobbyOptions(options));
    return result;
  }

  async load(pointer: string, options: GraphQLFileLoaderOptions): Promise<Source[]> {
    const resolvedPaths = await this.resolveGlobs(pointer, options);
    const finalResult: Source[] = [];
    const errors: Error[] = [];

    await Promise.all(
      resolvedPaths.map(async path => {
        if (await this.canLoad(path, options)) {
          try {
            const normalizedFilePath = isAbsolute(path) ? path : resolve(options.cwd || processCwd(), path);
            const rawSDL: string = await readFile(normalizedFilePath, { encoding: 'utf8' });
            finalResult.push(this.handleFileContent(rawSDL, normalizedFilePath, options));
          } catch (e: any) {
            if (env['DEBUG']) {
              console.error(e);
            }
            errors.push(e);
          }
        }
      })
    );

    if (errors.length > 0) {
      if (errors.length === 1) {
        throw errors[0];
      }
      throw new AggregateError(
        errors,
        `Reading from ${pointer} failed ; \n ` + errors.map((e: Error) => e.message).join('\n')
      );
    }

    return finalResult;
  }

  loadSync(pointer: string, options: GraphQLFileLoaderOptions): Source[] {
    const resolvedPaths = this.resolveGlobsSync(pointer, options);
    const finalResult: Source[] = [];
    const errors: Error[] = [];

    for (const path of resolvedPaths) {
      if (this.canLoadSync(path, options)) {
        try {
          const normalizedFilePath = isAbsolute(path) ? path : resolve(options.cwd || processCwd(), path);
          const rawSDL = readFileSync(normalizedFilePath, { encoding: 'utf8' });
          finalResult.push(this.handleFileContent(rawSDL, normalizedFilePath, options));
        } catch (e: any) {
          if (env['DEBUG']) {
            console.error(e);
          }
          errors.push(e);
        }
      }
    }

    if (errors.length > 0) {
      if (errors.length === 1) {
        throw errors[0];
      }
      throw new AggregateError(
        errors,
        `Reading from ${pointer} failed ; \n ` + errors.map((e: Error) => e.message).join('\n')
      );
    }

    return finalResult;
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
