import {
  GraphQLTagPluckOptions,
  gqlPluckFromCodeString,
  gqlPluckFromCodeStringSync,
} from '@graphql-tools/graphql-tag-pluck';
import micromatch from 'micromatch';
import unixify from 'unixify';

import { loadFromGit, loadFromGitSync, readTreeAtRef, readTreeAtRefSync } from './load-git';
import { parse as handleStuff } from './parse';
import { parse } from 'graphql';
import { asArray, BaseLoaderOptions, Loader, Source } from '@graphql-tools/utils';
import isGlob from 'is-glob';

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
  loaderId() {
    return 'git-loader';
  }

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

  private async _load(pointer: string, options: GitLoaderOptions): Promise<Source[]> {
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

    if (isGlob(path)) {
      const resolvedPaths = await this.resolveGlobs(pointer, asArray(options.ignore || []));

      await Promise.all(
        resolvedPaths.map(async path => {
          const results = await this.load(path, options);
          finalResult.push(...results);
        })
      );
    } else if (await this.canLoad(pointer)) {
      finalResult.push(...(await this._load(pointer, options)));
    }

    return finalResult;
  }

  private _loadSync(pointer: string, options: GitLoaderOptions): Source[] {
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

    if (isGlob(path)) {
      const resolvedPaths = this.resolveGlobsSync(pointer, asArray(options.ignore || []));
      const finalResult: Source[] = [];
      for (const path of resolvedPaths) {
        if (this.canLoadSync(path)) {
          finalResult.push(...this.loadSync(path, options));
        }
      }
    } else if (this.canLoadSync(pointer)) {
      finalResult.push(...this._loadSync(pointer, options));
    }

    return finalResult;
  }
}
