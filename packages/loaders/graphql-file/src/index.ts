import { existsSync, promises as fsPromises, readFileSync } from 'fs';
import { isAbsolute, resolve } from 'path';
import { env, cwd as processCwd } from 'process';
import unixify from 'unixify';
import { extractImportLines, PathAliases, processImport } from '@graphql-tools/import';
import { matchFiles, matchFilesSync } from '@graphql-tools/load-files';
import {
  asArray,
  BaseLoaderOptions,
  createFailedSource,
  isValidPath,
  Loader,
  parseGraphQLSDL,
  shouldCollectLoadErrors,
  Source,
  toLoadError,
} from '@graphql-tools/utils';

const { readFile, access } = fsPromises;

const FILE_EXTENSIONS = ['.gql', '.gqls', '.graphql', '.graphqls'];

function unixifyWithDriverLetter(path: string): string {
  if (path.match(/^[A-Z]:\\/)) {
    const driveLetter = path[0].toLowerCase();
    return `${driveLetter}:${unixify(path)}`;
  }
  return unixify(path);
}

/**
 * Additional options for loading from a GraphQL file
 */
export interface GraphQLFileLoaderOptions extends BaseLoaderOptions {
  /**
   * Set to `true` to disable handling `#import` syntax
   */
  skipGraphQLImport?: boolean;

  /**
   * A series of entries which re-map imports to lookup locations.
   */
  pathAliases?: PathAliases;
}

function isGraphQLImportFile(rawSDL: string) {
  return extractImportLines(rawSDL).importLines.length > 0;
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
        const normalizedFilePath = isAbsolute(pointer)
          ? pointer
          : resolve(options.cwd || processCwd(), pointer);
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
        const normalizedFilePath = isAbsolute(pointer)
          ? pointer
          : resolve(options.cwd || processCwd(), pointer);
        return existsSync(normalizedFilePath);
      }
    }
    return false;
  }

  private _buildGlobs(glob: string, options: GraphQLFileLoaderOptions) {
    const ignores = asArray(options.ignore || []);
    const globs = [
      unixifyWithDriverLetter(glob),
      ...ignores.map(v => buildIgnoreGlob(unixifyWithDriverLetter(v))),
    ];
    return globs;
  }

  async resolveGlobs(glob: string, options: GraphQLFileLoaderOptions) {
    if (
      !glob.includes('*') &&
      (await this.canLoad(glob, options)) &&
      !asArray(options.ignore || []).length &&
      !options['includeSources']
    )
      return [glob]; // bypass globbing when no glob character, can be loaded, no ignores and source not requested. Fixes problem with pkg and passes ci tests
    const globs = this._buildGlobs(glob, options);
    return matchFiles(globs, { absolute: true, cwd: options.cwd });
  }

  resolveGlobsSync(glob: string, options: GraphQLFileLoaderOptions) {
    if (
      !glob.includes('*') &&
      this.canLoadSync(glob, options) &&
      !asArray(options.ignore || []).length &&
      !options['includeSources']
    )
      return [glob]; // bypass globbing when no glob character, can be loaded, no ignores and source not requested. Fixes problem with pkg and passes ci tests
    const globs = this._buildGlobs(glob, options);
    return matchFilesSync(globs, { absolute: true, cwd: options.cwd });
  }

  async load(pointer: string, options: GraphQLFileLoaderOptions): Promise<Source[]> {
    const resolvedPaths = await this.resolveGlobs(pointer, options);
    const finalResult: Source[] = [];
    const errors: Error[] = [];
    const failures: Array<{ location: string; error: Error }> = [];

    await Promise.all(
      resolvedPaths.map(async path => {
        if (await this.canLoad(path, options)) {
          const normalizedFilePath = isAbsolute(path)
            ? path
            : resolve(options.cwd || processCwd(), path);
          try {
            const rawSDL: string = await readFile(normalizedFilePath, { encoding: 'utf8' });
            finalResult.push(this.handleFileContent(rawSDL, normalizedFilePath, options));
          } catch (e: any) {
            if (env['DEBUG']) {
              console.error(e);
            }
            const error = toLoadError(e);
            errors.push(error);
            failures.push({ location: normalizedFilePath, error });
          }
        }
      }),
    );

    if (errors.length > 0) {
      if (shouldCollectLoadErrors(options.errorHandling)) {
        for (const failure of failures) {
          finalResult.push(createFailedSource(failure.location, failure.error));
        }
        return finalResult;
      }
      if (errors.length === 1) {
        throw errors[0];
      }
      throw new AggregateError(
        errors,
        `Reading from ${pointer} failed ; \n ` + errors.map((e: Error) => e.message).join('\n'),
      );
    }

    return finalResult;
  }

  loadSync(pointer: string, options: GraphQLFileLoaderOptions): Source[] {
    const resolvedPaths = this.resolveGlobsSync(pointer, options);
    const finalResult: Source[] = [];
    const errors: Error[] = [];
    const failures: Array<{ location: string; error: Error }> = [];

    for (const path of resolvedPaths) {
      if (this.canLoadSync(path, options)) {
        const normalizedFilePath = isAbsolute(path)
          ? path
          : resolve(options.cwd || processCwd(), path);
        try {
          const rawSDL = readFileSync(normalizedFilePath, { encoding: 'utf8' });
          finalResult.push(this.handleFileContent(rawSDL, normalizedFilePath, options));
        } catch (e: any) {
          if (env['DEBUG']) {
            console.error(e);
          }
          const error = toLoadError(e);
          errors.push(error);
          failures.push({ location: normalizedFilePath, error });
        }
      }
    }

    if (errors.length > 0) {
      if (shouldCollectLoadErrors(options.errorHandling)) {
        for (const failure of failures) {
          finalResult.push(createFailedSource(failure.location, failure.error));
        }
        return finalResult;
      }
      if (errors.length === 1) {
        throw errors[0];
      }
      throw new AggregateError(
        errors,
        `Reading from ${pointer} failed ; \n ` + errors.map((e: Error) => e.message).join('\n'),
      );
    }

    return finalResult;
  }

  handleFileContent(rawSDL: string, pointer: string, options: GraphQLFileLoaderOptions) {
    if (!options.skipGraphQLImport && isGraphQLImportFile(rawSDL)) {
      const document = processImport(pointer, options.cwd, {}, new Map(), options.pathAliases);
      return {
        location: pointer,
        document,
      };
    }

    return parseGraphQLSDL(pointer, rawSDL, options);
  }
}
