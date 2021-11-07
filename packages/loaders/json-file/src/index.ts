import type { GlobbyOptions } from 'globby';

import {
  Source,
  Loader,
  isValidPath,
  BaseLoaderOptions,
  asArray,
  parseGraphQLJSON,
  AggregateError,
} from '@graphql-tools/utils';
import { isAbsolute, resolve } from 'path';
import { readFileSync, promises as fsPromises, existsSync } from 'fs';
import { cwd as processCwd, env } from 'process';
import globby from 'globby';
import unixify from 'unixify';

const { readFile, access } = fsPromises;

const FILE_EXTENSIONS = ['.json'];

/**
 * Additional options for loading from a JSON file
 */
export interface JsonFileLoaderOptions extends BaseLoaderOptions {}

function createGlobbyOptions(options: JsonFileLoaderOptions): GlobbyOptions {
  return { absolute: true, ...options, ignore: [] };
}

const buildIgnoreGlob = (path: string) => `!${path}`;

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
  async canLoad(pointer: string, options: JsonFileLoaderOptions): Promise<boolean> {
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

  canLoadSync(pointer: string, options: JsonFileLoaderOptions): boolean {
    if (isValidPath(pointer)) {
      if (FILE_EXTENSIONS.find(extension => pointer.endsWith(extension))) {
        const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || processCwd(), pointer);
        return existsSync(normalizedFilePath);
      }
    }
    return false;
  }

  private _buildGlobs(glob: string, options: JsonFileLoaderOptions) {
    const ignores = asArray(options.ignore || []);
    const globs = [unixify(glob), ...ignores.map(v => buildIgnoreGlob(unixify(v)))];
    return globs;
  }

  async resolveGlobs(glob: string, options: JsonFileLoaderOptions) {
    const globs = this._buildGlobs(glob, options);
    const result = await globby(globs, createGlobbyOptions(options));
    return result;
  }

  resolveGlobsSync(glob: string, options: JsonFileLoaderOptions) {
    const globs = this._buildGlobs(glob, options);
    const result = globby.sync(globs, createGlobbyOptions(options));
    return result;
  }

  async load(pointer: string, options: JsonFileLoaderOptions): Promise<Source[]> {
    const resolvedPaths = await this.resolveGlobs(pointer, options);
    const finalResult: Source[] = [];
    const errors: Error[] = [];

    await Promise.all(
      resolvedPaths.map(async path => {
        if (await this.canLoad(path, options)) {
          try {
            const normalizedFilePath = isAbsolute(path) ? path : resolve(options.cwd || processCwd(), path);
            const rawSDL: string = await readFile(normalizedFilePath, { encoding: 'utf8' });
            finalResult.push(this.handleFileContent(normalizedFilePath, rawSDL, options));
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

  loadSync(pointer: string, options: JsonFileLoaderOptions): Source[] {
    const resolvedPaths = this.resolveGlobsSync(pointer, options);
    const finalResult: Source[] = [];
    const errors: Error[] = [];

    for (const path of resolvedPaths) {
      if (this.canLoadSync(path, options)) {
        try {
          const normalizedFilePath = isAbsolute(path) ? path : resolve(options.cwd || processCwd(), path);
          const rawSDL = readFileSync(normalizedFilePath, { encoding: 'utf8' });
          finalResult.push(this.handleFileContent(normalizedFilePath, rawSDL, options));
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

  handleFileContent(normalizedFilePath: string, rawSDL: string, options: JsonFileLoaderOptions): Source {
    try {
      return parseGraphQLJSON(normalizedFilePath, rawSDL, options);
    } catch (e: any) {
      throw new Error(`Unable to read JSON file: ${normalizedFilePath}: ${e.message || /* istanbul ignore next */ e}`);
    }
  }
}
