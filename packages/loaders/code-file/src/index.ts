import type { GlobbyOptions } from 'globby';

import { isSchema, GraphQLSchema, DocumentNode, parse } from 'graphql';
import {
  Source,
  asArray,
  isValidPath,
  parseGraphQLSDL,
  isDocumentNode,
  BaseLoaderOptions,
  Loader,
} from '@graphql-tools/utils';
import {
  GraphQLTagPluckOptions,
  gqlPluckFromCodeString,
  gqlPluckFromCodeStringSync,
} from '@graphql-tools/graphql-tag-pluck';
import globby from 'globby';
import isGlob from 'is-glob';
import unixify from 'unixify';
import { tryToLoadFromExport, tryToLoadFromExportSync } from './load-from-module';
import { isAbsolute, resolve } from 'path';
import { cwd, env } from 'process';
import { readFileSync, promises as fsPromises, existsSync } from 'fs';
import { createRequire } from 'module';

const { readFile, access } = fsPromises;

export type CodeFileLoaderConfig = {
  pluckConfig?: GraphQLTagPluckOptions;
  noPluck?: boolean;
  noRequire?: boolean;
};

/**
 * Additional options for loading from a code file
 */
export type CodeFileLoaderOptions = {
  require?: string | string[];
} & CodeFileLoaderConfig &
  BaseLoaderOptions;

const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.vue'];

function createGlobbyOptions(options: CodeFileLoaderOptions): GlobbyOptions {
  return { absolute: true, ...options, ignore: [] };
}

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
export class CodeFileLoader implements Loader<CodeFileLoaderOptions> {
  private config: CodeFileLoaderConfig;
  constructor(config?: CodeFileLoaderConfig) {
    this.config = config ?? {};
  }

  private getMergedOptions(options: CodeFileLoaderOptions): CodeFileLoaderOptions {
    return { ...this.config, ...options };
  }

  loaderId(): string {
    return 'code-file';
  }

  async canLoad(pointer: string, options: CodeFileLoaderOptions): Promise<boolean> {
    options = this.getMergedOptions(options);
    if (isGlob(pointer)) {
      // FIXME: parse to find and check the file extensions?
      return true;
    }

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

  canLoadSync(pointer: string, options: CodeFileLoaderOptions): boolean {
    options = this.getMergedOptions(options);
    if (isGlob(pointer)) {
      // FIXME: parse to find and check the file extensions?
      return true;
    }

    if (isValidPath(pointer)) {
      if (FILE_EXTENSIONS.find(extension => pointer.endsWith(extension))) {
        const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || cwd(), pointer);
        return existsSync(normalizedFilePath);
      }
    }

    return false;
  }

  async resolveGlobs(glob: string, options: CodeFileLoaderOptions) {
    options = this.getMergedOptions(options);
    const ignores = asArray(options.ignore || []);
    return globby([glob, ...ignores.map(v => `!(${v})`).map(v => unixify(v))], createGlobbyOptions(options));
  }

  resolveGlobsSync(glob: string, options: CodeFileLoaderOptions) {
    options = this.getMergedOptions(options);
    const ignores = asArray(options.ignore || []);
    return globby.sync([glob, ...ignores.map(v => `!(${v})`).map(v => unixify(v))], createGlobbyOptions(options));
  }

  async load(pointer: string, options: CodeFileLoaderOptions): Promise<Source[] | null> {
    options = this.getMergedOptions(options);
    if (isGlob(pointer)) {
      const resolvedPaths = await this.resolveGlobs(pointer, options);
      const finalResult: Source[] = [];
      await Promise.all(
        resolvedPaths.map(async path => {
          if (await this.canLoad(path, options)) {
            const result = await this.handleSinglePath(path, options);
            result?.forEach(result => finalResult.push(result));
          }
        })
      );
      return finalResult;
    }

    return this.handleSinglePath(pointer, options);
  }

  loadSync(pointer: string, options: CodeFileLoaderOptions): Source[] | null {
    options = this.getMergedOptions(options);
    if (isGlob(pointer)) {
      const resolvedPaths = this.resolveGlobsSync(pointer, options);
      const finalResult: Source[] = [];
      for (const path of resolvedPaths) {
        if (this.canLoadSync(path, options)) {
          const result = this.handleSinglePathSync(path, options);
          result?.forEach(result => finalResult.push(result));
        }
      }
      return finalResult;
    }

    return this.handleSinglePathSync(pointer, options);
  }

  async handleSinglePath(location: string, options: CodeFileLoaderOptions): Promise<Source[] | null> {
    options = this.getMergedOptions(options);
    const normalizedFilePath = ensureAbsolutePath(location, options);

    const errors: Error[] = [];

    if (!options.noPluck) {
      try {
        const content = await readFile(normalizedFilePath, { encoding: 'utf-8' });
        const sources = await gqlPluckFromCodeString(normalizedFilePath, content, options.pluckConfig);

        if (sources.length) {
          return sources.map(source => ({
            document: parse(source, options),
            location,
            rawSDL: source.body,
          }));
        }
      } catch (e) {
        if (env['DEBUG']) {
          console.error(`Failed to load schema from code file "${normalizedFilePath}": ${e.message}`);
        }
        errors.push(e);
      }
    }

    if (!options.noRequire) {
      try {
        if (options && options.require) {
          await Promise.all(asArray(options.require).map(m => import(m)));
        }

        const loaded = await tryToLoadFromExport(normalizedFilePath);
        const source = resolveSource(location, loaded, options);

        if (source) {
          return [source];
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

  handleSinglePathSync(location: string, options: CodeFileLoaderOptions): Source[] | null {
    options = this.getMergedOptions(options);
    const normalizedFilePath = ensureAbsolutePath(location, options);

    const errors: Error[] = [];

    if (!options.noPluck) {
      try {
        const content = readFileSync(normalizedFilePath, { encoding: 'utf-8' });
        const sources = gqlPluckFromCodeStringSync(normalizedFilePath, content, options.pluckConfig);

        if (sources.length) {
          return sources.map(source => ({
            document: parse(source, options),
            location,
            rawSDL: source.body,
          }));
        }
      } catch (e) {
        if (env['DEBUG']) {
          console.error(`Failed to load schema from code file "${normalizedFilePath}": ${e.message}`);
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
        const source = resolveSource(location, loaded, options);

        if (source) {
          return [source];
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

function resolveSource(
  pointer: string,
  value: GraphQLSchema | DocumentNode | string | null,
  options: CodeFileLoaderOptions
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
