import { concatAST } from 'graphql';
import type { DocumentNode } from 'graphql';
import type { Loader, Source } from '@graphql-tools/utils';
import type { ExternalFragmentLoaderOptions } from './options.js';
import {
  resolveExternalFragmentsSyncWithSources,
  resolveExternalFragmentsWithSources,
} from './resolve.js';

type LoaderOptionsWithCache = ExternalFragmentLoaderOptions & {
  cache?: object;
};

/**
 * Custom-loader entry point for `@graphql-tools/load`.
 *
 * Custom loaders must return a single DocumentNode (or Source), and the sync
 * load path cannot consume a Promise. Use the synchronous resolver here so
 * this entry point works for both `loadTypedefs` and `loadTypedefsSync`.
 */
export default function externalFragmentLoader(
  _pointer: string,
  options: ExternalFragmentLoaderOptions,
): DocumentNode {
  const resolvedFiles = resolveExternalFragmentsSyncWithSources(options);
  return concatAST(resolvedFiles.flatMap(file => file.sources.map(source => source.document)));
}

export class ExternalFragmentLoader implements Loader<ExternalFragmentLoaderOptions> {
  /**
   * `@graphql-tools/load` invokes a loader once for every pointer in a load
   * operation. Its cache object is shared by those invocations, so use it to
   * ensure that external fragments are added only once per operation.
   */
  private readonly loadedOperations = new WeakSet<object>();

  private claimLoadOperation(options: ExternalFragmentLoaderOptions): object | false | undefined {
    const cache = (options as LoaderOptionsWithCache).cache;
    if (!cache) {
      return undefined;
    }
    if (this.loadedOperations.has(cache)) {
      return false;
    }
    this.loadedOperations.add(cache);
    return cache;
  }

  async load(_pointer: string, options: ExternalFragmentLoaderOptions): Promise<Source[]> {
    const operation = this.claimLoadOperation(options);
    if (operation === false) {
      return [];
    }

    try {
      const resolvedFiles = await resolveExternalFragmentsWithSources(options);

      return resolvedFiles.flatMap(file =>
        file.sources.map(source => ({
          location: file.filePath,
          ...source,
        })),
      );
    } catch (error) {
      if (operation) {
        this.loadedOperations.delete(operation);
      }
      throw error;
    }
  }

  loadSync(_pointer: string, options: ExternalFragmentLoaderOptions): Source[] {
    const operation = this.claimLoadOperation(options);
    if (operation === false) {
      return [];
    }

    try {
      const resolvedFiles = resolveExternalFragmentsSyncWithSources(options);

      return resolvedFiles.flatMap(file =>
        file.sources.map(source => ({
          location: file.filePath,
          ...source,
        })),
      );
    } catch (error) {
      if (operation) {
        this.loadedOperations.delete(operation);
      }
      throw error;
    }
  }
}
