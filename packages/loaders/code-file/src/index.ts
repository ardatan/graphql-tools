import { existsSync, promises as fsPromises, readFileSync } from 'fs';
import { createRequire } from 'module';
import { isAbsolute, resolve } from 'path';
import { cwd, env } from 'process';
import { DocumentNode, GraphQLSchema, isSchema, parse } from 'graphql';
import unixify from 'unixify';
import {
  gqlPluckFromCodeString,
  gqlPluckFromCodeStringSync,
  GraphQLTagPluckOptions,
} from '@graphql-tools/graphql-tag-pluck';
import { matchFiles, matchFilesSync } from '@graphql-tools/load-files';
import {
  asArray,
  BaseLoaderOptions,
  isDocumentNode,
  isValidPath,
  Loader,
  parseGraphQLSDL,
  shouldCollectLoadErrors,
  Source,
  toLoadError,
} from '@graphql-tools/utils';
import { tryToLoadFromExport, tryToLoadFromExportSync } from './load-from-module.js';
import { toImportSpecifier } from './to-import-specifier.js';

const { readFile, access } = fsPromises;

export type CodeFileLoaderConfig = {
  pluckConfig?: GraphQLTagPluckOptions;
  noPluck?: boolean;
  noRequire?: boolean;

  /**
   * Set to `true` to raise errors if any matched files are not valid GraphQL
   */
  noSilentErrors?: boolean;
};

/**
 * Additional options for loading from a code file
 */
export type CodeFileLoaderOptions = {
  require?: string | string[];
} & CodeFileLoaderConfig &
  BaseLoaderOptions;

const FILE_EXTENSIONS = [
  '.ts',
  '.mts',
  '.cts',
  '.tsx',
  '.js',
  '.mjs',
  'cjs',
  '.jsx',
  '.vue',
  '.svelte',
  '.astro',
  '.gts',
  '.gjs',
];

const buildIgnoreGlob = (path: string) => `!${path}`;

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
 * Supported extensions include: `.ts`, `.mts`, `.cts`, `.tsx`, `.js`, `.mjs`,
 * `.cjs`, `.jsx`, `.vue`, `.svelte`, `.astro`, `.gts`, `.gjs`.
 */
export class CodeFileLoader implements Loader<CodeFileLoaderOptions> {
  private config: CodeFileLoaderConfig;
  constructor(config?: CodeFileLoaderConfig) {
    this.config = config ?? {};
  }

  private getMergedOptions(options: CodeFileLoaderOptions): CodeFileLoaderOptions {
    return {
      ...this.config,
      ...options,
      pluckConfig: { ...(this.config.pluckConfig || {}), ...(options.pluckConfig || {}) },
    };
  }

  async canLoad(pointer: string, options: CodeFileLoaderOptions): Promise<boolean> {
    options = this.getMergedOptions(options);

    if (isValidPath(pointer)) {
      if (FILE_EXTENSIONS.find(extension => pointer.endsWith(extension))) {
        const normalizedFilePath = isAbsolute(pointer)
          ? pointer
          : resolve(options.cwd || cwd(), pointer);
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

  canLoadSync(pointer: string, options: CodeFileLoaderOptions): boolean {
    options = this.getMergedOptions(options);

    if (isValidPath(pointer)) {
      if (FILE_EXTENSIONS.find(extension => pointer.endsWith(extension))) {
        const normalizedFilePath = isAbsolute(pointer)
          ? pointer
          : resolve(options.cwd || cwd(), pointer);
        return existsSync(normalizedFilePath);
      }
    }

    return false;
  }

  private _buildGlobs(glob: string, options: CodeFileLoaderOptions) {
    const ignores = asArray(options.ignore || []);
    const globs = [unixify(glob), ...ignores.map(v => buildIgnoreGlob(unixify(v)))];
    return globs;
  }

  async resolveGlobs(glob: string, options: CodeFileLoaderOptions) {
    options = this.getMergedOptions(options);
    const globs = this._buildGlobs(glob, options);
    return matchFiles(globs, { absolute: true, cwd: options.cwd });
  }

  resolveGlobsSync(glob: string, options: CodeFileLoaderOptions) {
    options = this.getMergedOptions(options);
    const globs = this._buildGlobs(glob, options);
    return matchFilesSync(globs, { absolute: true, cwd: options.cwd });
  }

  async load(pointer: string, options: CodeFileLoaderOptions): Promise<Source[]> {
    options = this.getMergedOptions(options);
    const resolvedPaths = await this.resolveGlobs(pointer, options);

    const finalResult: Source[] = [];
    const errors: Error[] = [];
    const failures: Array<{ location: string; error: Error }> = [];

    await Promise.all(
      resolvedPaths.map(async path => {
        try {
          const result = await this.handleSinglePath(path, options);
          result?.forEach(result => finalResult.push(result));
        } catch (e: any) {
          if (env['DEBUG']) {
            console.error(e);
          }
          const error = toLoadError(e);
          errors.push(error);
          failures.push({ location: path, error });
        }
      }),
    );

    if (errors.length > 0 && shouldCollectLoadErrors(options.errorHandling)) {
      for (const failure of failures) {
        finalResult.push({
          location: failure.location,
          error: failure.error,
        });
      }
      return finalResult;
    }

    if (errors.length > 0 && (options.noSilentErrors || finalResult.length === 0)) {
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

  loadSync(pointer: string, options: CodeFileLoaderOptions): Source[] | null {
    options = this.getMergedOptions(options);
    const resolvedPaths = this.resolveGlobsSync(pointer, options);
    const finalResult: Source[] = [];
    const errors: Error[] = [];
    const failures: Array<{ location: string; error: Error }> = [];

    for (const path of resolvedPaths) {
      if (this.canLoadSync(path, options)) {
        try {
          const result = this.handleSinglePathSync(path, options);
          result?.forEach(result => finalResult.push(result));
        } catch (e: any) {
          if (env['DEBUG']) {
            console.error(e);
          }
          const error = toLoadError(e);
          errors.push(error);
          failures.push({ location: path, error });
        }
      }
    }

    if (errors.length > 0 && shouldCollectLoadErrors(options.errorHandling)) {
      for (const failure of failures) {
        finalResult.push({
          location: failure.location,
          error: failure.error,
        });
      }
      return finalResult;
    }

    if (errors.length > 0 && (options.noSilentErrors || finalResult.length === 0)) {
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

  async handleSinglePath(location: string, options: CodeFileLoaderOptions): Promise<Source[]> {
    if (!(await this.canLoad(location, options))) {
      return [];
    }

    options = this.getMergedOptions(options);
    const normalizedFilePath = ensureAbsolutePath(location, options);

    const errors: Error[] = [];

    if (!options.noPluck) {
      try {
        const content = await readFile(normalizedFilePath, { encoding: 'utf-8' });
        const sources = await gqlPluckFromCodeString(
          normalizedFilePath,
          content,
          options.pluckConfig,
        );

        if (sources.length) {
          return sources.map(source => ({
            rawSDL: source.body,
            document: parse(source),
            location,
          }));
        }
      } catch (e: any) {
        if (env['DEBUG']) {
          console.error(
            `Failed to load schema from code file "${normalizedFilePath}": ${e.message}`,
          );
        }
        errors.push(e);
      }
    }

    if (!options.noRequire) {
      try {
        if (options && options.require) {
          await Promise.all(asArray(options.require).map(m => import(toImportSpecifier(m))));
        }

        const loaded = await tryToLoadFromExport(normalizedFilePath);
        const sources = asArray(loaded)
          .map(value => resolveSource(location, value, options))
          .filter(Boolean);

        if (sources.length) {
          return sources as Source[];
        }
      } catch (e: any) {
        errors.push(e);
      }
    }

    if (errors.length > 0) {
      throw errors[0];
    }

    return [];
  }

  handleSinglePathSync(location: string, options: CodeFileLoaderOptions): Source[] | null {
    if (!this.canLoadSync(location, options)) {
      return [];
    }
    options = this.getMergedOptions(options);
    const normalizedFilePath = ensureAbsolutePath(location, options);

    const errors: Error[] = [];

    if (!options.noPluck) {
      try {
        const content = readFileSync(normalizedFilePath, { encoding: 'utf-8' });
        const sources = gqlPluckFromCodeStringSync(
          normalizedFilePath,
          content,
          options.pluckConfig,
        );

        if (sources.length) {
          return sources.map(source => ({
            rawSDL: source.body,
            document: parse(source),
            location,
          }));
        }
      } catch (e: any) {
        if (env['DEBUG']) {
          console.error(
            `Failed to load schema from code file "${normalizedFilePath}": ${e.message}`,
          );
        }
        errors.push(e);
      }
    }

    if (!options.noRequire) {
      try {
        if (options && options.require) {
          const cwdRequire = createRequire(options.cwd || cwd());
          for (const m of asArray(options.require)) {
            cwdRequire(m);
          }
        }

        const loaded = tryToLoadFromExportSync(normalizedFilePath);
        const sources = asArray(loaded)
          .map(value => resolveSource(location, value, options))
          .filter(Boolean);

        if (sources.length) {
          return sources as Source[];
        }
      } catch (e: any) {
        errors.push(e);
      }
    }

    if (errors.length > 0) {
      throw errors[0];
    }

    return null;
  }
}

function resolveSource(
  pointer: string,
  value: GraphQLSchema | DocumentNode | string | null,
  options: CodeFileLoaderOptions,
): Source | null {
  if (typeof value === 'string') {
    return parseGraphQLSDL(pointer, value, options);
  } else if (isSchema(value)) {
    return {
      location: pointer,
      schema: value,
    };
  } else if (isDocumentNode(value)) {
    return {
      location: pointer,
      document: value,
    };
  }

  return null;
}

function ensureAbsolutePath(pointer: string, options: CodeFileLoaderOptions): string {
  return isAbsolute(pointer) ? pointer : resolve(options.cwd || cwd(), pointer);
}
