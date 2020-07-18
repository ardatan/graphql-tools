import { UniversalLoader, SingleFileOptions } from '@graphql-tools/utils';
import {
  GraphQLTagPluckOptions,
  gqlPluckFromCodeString,
  gqlPluckFromCodeStringSync,
} from '@graphql-tools/graphql-tag-pluck';

import { loadFromGit, loadFromGitSync } from './load-git';
import { parse } from './parse';

// git:branch:path/to/file
function extractData(
  pointer: string
): {
  ref: string;
  path: string;
} {
  const parts = pointer.replace(/^git\:/i, '').split(':');

  if (!parts || parts.length !== 2) {
    throw new Error('Schema pointer should match "git:branchName:path/to/file"');
  }

  return {
    ref: parts[0],
    path: parts[1],
  };
}

/**
 * Additional options for loading from git
 */
export type GitLoaderOptions = SingleFileOptions & {
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
export class GitLoader implements UniversalLoader {
  loaderId() {
    return 'git-loader';
  }

  async canLoad(pointer: string) {
    return this.canLoadSync(pointer);
  }

  canLoadSync(pointer: string) {
    return typeof pointer === 'string' && pointer.toLowerCase().startsWith('git:');
  }

  async load(pointer: string, options: GitLoaderOptions) {
    const { ref, path } = extractData(pointer);
    const content = await loadFromGit({ ref, path });
    const parsed = parse({ path, options, pointer, content });

    if (parsed) {
      return parsed;
    }

    const rawSDL = await gqlPluckFromCodeString(pointer, content, options.pluckConfig);

    return {
      location: pointer,
      rawSDL,
    };
  }

  loadSync(pointer: string, options: GitLoaderOptions) {
    const { ref, path } = extractData(pointer);
    const content = loadFromGitSync({ ref, path });
    const parsed = parse({ path, options, pointer, content });

    if (parsed) {
      return parsed;
    }

    const rawSDL = gqlPluckFromCodeStringSync(pointer, content, options.pluckConfig);

    return {
      location: pointer,
      rawSDL,
    };
  }
}
