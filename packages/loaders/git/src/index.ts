import {
  GraphQLTagPluckOptions,
  gqlPluckFromCodeString,
  gqlPluckFromCodeStringSync,
} from '@graphql-tools/graphql-tag-pluck';
import micromatch from 'micromatch';
import unixify from 'unixify';

import { loadFromGit, loadFromGitSync, readTreeAtRef, readTreeAtRefSync } from './load-git.js';
import { parse as handleStuff } from './parse.js';
import { parse } from 'graphql';
import { asArray, BaseLoaderOptions, Loader, Source, AggregateError } from '@graphql-tools/utils';
import isGlob from 'is-glob';
import { env } from 'process';

// git:branch:path/to/file
function extractData(pointer: string): null | {
  ref: string;
  path: string;
} {
  const parts = pointer.replace(/^git\:/i, '').split(':');

  if (!parts || parts.length !== 2) {
    return null;
  }

  return {
    ref: parts[0],
    path: parts[1],
  };
}

/**
 * Additional options for loading from git
 */
export type GitLoaderOptions = BaseLoaderOptions & {
  /**
   * Additional options to pass to `graphql-tag-pluck`
   */
  pluckConfig?: GraphQLTagPluckOptions;
};

/**
 * This loader loads a file from git.
 *
 * ```js
 * const typeDefs = await loadTypedefs('git:someBranch:some/path/to/file.js', {
 *   loaders: [new GitLoader()],
 * })
 * ```
 */
export class GitLoader implements Loader<GitLoaderOptions> {
  async canLoad(pointer: string) {
    return this.canLoadSync(pointer);
  }

  canLoadSync(pointer: string) {
    return typeof pointer === 'string' && pointer.toLowerCase().startsWith('git:');
  }

  async resolveGlobs(glob: string, ignores: string[]): Promise<Array<string>> {
    const data = extractData(glob);
    if (data === null) {
      return [];
    }
    const refsForPaths = new Map();
    const { ref, path } = data;
    if (!refsForPaths.has(ref)) {
      refsForPaths.set(ref, []);
    }
    refsForPaths.get(ref).push(unixify(path));

    for (const ignore of ignores) {
      const data = extractData(ignore);
      if (data === null) {
        continue;
      }
      const { ref, path } = data;
      if (!refsForPaths.has(ref)) {
        refsForPaths.set(ref, []);
      }
      refsForPaths.get(ref).push(`!${unixify(path)}`);
    }

    const resolved: string[] = [];
    await Promise.all(
      [...refsForPaths.entries()].map(async ([ref, paths]) => {
        resolved.push(...micromatch(await readTreeAtRef(ref), paths).map(filePath => `git:${ref}:${filePath}`));
      })
    );
    return resolved;
  }

  resolveGlobsSync(glob: string, ignores: string[]) {
    const data = extractData(glob);
    if (data === null) {
      return [];
    }
    const { ref, path } = data;
    const refsForPaths = new Map();

    if (!refsForPaths.has(ref)) {
      refsForPaths.set(ref, []);
    }
    refsForPaths.get(ref).push(unixify(path));

    for (const ignore of ignores) {
      const data = extractData(ignore);
      if (data === null) {
        continue;
      }
      const { ref, path } = data;
      if (!refsForPaths.has(ref)) {
        refsForPaths.set(ref, []);
      }
      refsForPaths.get(ref).push(`!${unixify(path)}`);
    }

    const resolved: string[] = [];
    for (const [ref, paths] of refsForPaths.entries()) {
      resolved.push(...micromatch(readTreeAtRefSync(ref), paths).map(filePath => `git:${ref}:${filePath}`));
    }
    return resolved;
  }

  private async handleSingularPointerAsync(pointer: string, options: GitLoaderOptions): Promise<Source[]> {
    const result = extractData(pointer);
    if (result === null) {
      return [];
    }
    const { ref, path } = result;
    const content = await loadFromGit({ ref, path });
    const parsed = handleStuff({ path, options, pointer, content });

    if (parsed) {
      return [parsed];
    }

    const sources = await gqlPluckFromCodeString(pointer, content, options.pluckConfig);

    return sources.map(source => ({
      location: pointer,
      document: parse(source, options),
    }));
  }

  async load(pointer: string, options: GitLoaderOptions): Promise<Source[]> {
    const result = extractData(pointer);
    if (result === null) {
      return [];
    }
    const { path } = result;
    const finalResult: Source[] = [];
    const errors: Error[] = [];

    try {
      if (isGlob(path)) {
        const resolvedPaths = await this.resolveGlobs(pointer, asArray(options.ignore || []));

        await Promise.all(
          resolvedPaths.map(async path => {
            const results = await this.load(path, options);
            results?.forEach(result => finalResult.push(result));
          })
        );
      } else if (await this.canLoad(pointer)) {
        const results = await this.handleSingularPointerAsync(pointer, options);
        results?.forEach(result => finalResult.push(result));
      }
    } catch (error: any) {
      if (env['DEBUG']) {
        console.error(error);
      }
      if (error instanceof AggregateError) {
        for (const errorElement of error.errors) {
          errors.push(errorElement);
        }
      } else {
        errors.push(error);
      }
    }

    if (finalResult.length === 0 && errors.length > 0) {
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

  private handleSingularPointerSync(pointer: string, options: GitLoaderOptions): Source[] {
    const result = extractData(pointer);
    if (result === null) {
      return [];
    }
    const { ref, path } = result;

    const content = loadFromGitSync({ ref, path });
    const parsed = handleStuff({ path, options, pointer, content });

    if (parsed) {
      return [parsed];
    }

    const sources = gqlPluckFromCodeStringSync(pointer, content, options.pluckConfig);

    return sources.map(source => ({
      location: pointer,
      document: parse(source, options),
    }));
  }

  loadSync(pointer: string, options: GitLoaderOptions): Source[] {
    const result = extractData(pointer);
    if (result === null) {
      return [];
    }
    const { path } = result;
    const finalResult: Source[] = [];
    const errors: Error[] = [];

    try {
      if (isGlob(path)) {
        const resolvedPaths = this.resolveGlobsSync(pointer, asArray(options.ignore || []));
        const finalResult: Source[] = [];
        for (const path of resolvedPaths) {
          if (this.canLoadSync(path)) {
            const results = this.loadSync(path, options);
            for (const result of results) {
              finalResult.push(result);
            }
          }
        }
      } else if (this.canLoadSync(pointer)) {
        const results = this.handleSingularPointerSync(pointer, options);
        for (const result of results) {
          finalResult.push(result);
        }
      }
    } catch (error: any) {
      if (env['DEBUG']) {
        console.error(error);
      }
      if (error instanceof AggregateError) {
        for (const errorElement of error.errors) {
          errors.push(errorElement);
        }
      } else {
        errors.push(error);
      }
    }

    if (finalResult.length === 0 && errors.length > 0) {
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
}
