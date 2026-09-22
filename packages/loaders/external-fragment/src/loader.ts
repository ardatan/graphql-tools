import { concatAST } from 'graphql';
import type { DocumentNode } from 'graphql';
import type { Loader, Source } from '@graphql-tools/utils';
import type { ExternalFragmentLoaderOptions } from './options.js';
import {
  resolveExternalFragmentsSyncWithSources,
  resolveExternalFragmentsWithSources,
} from './resolve.js';

/**
 * Custom-loader entry point for `@graphql-tools/load`.
 *
 * Custom loaders must return a single DocumentNode (or Source). By default,
 * use the synchronous resolver so this entry point works for both
 * `loadTypedefs` and `loadTypedefsSync`. Set `options.async` to use the
 * asynchronous resolver from an asynchronous load call.
 */
type AsyncExternalFragmentLoaderOptions = ExternalFragmentLoaderOptions & { async: true };
type SyncExternalFragmentLoaderOptions = ExternalFragmentLoaderOptions & { async?: false };

function mergeResolvedDocuments(
  resolvedFiles: Array<{ sources: Array<{ document: DocumentNode }> }>,
): DocumentNode {
  return concatAST(resolvedFiles.flatMap(file => file.sources.map(source => source.document)));
}

export default function externalFragmentLoader(
  _pointer: string,
  options: AsyncExternalFragmentLoaderOptions,
): Promise<DocumentNode>;
export default function externalFragmentLoader(
  _pointer: string,
  options: SyncExternalFragmentLoaderOptions,
): DocumentNode;
export default function externalFragmentLoader(
  _pointer: string,
  options: ExternalFragmentLoaderOptions,
): DocumentNode | Promise<DocumentNode>;
export default function externalFragmentLoader(
  _pointer: string,
  options: ExternalFragmentLoaderOptions,
): DocumentNode | Promise<DocumentNode> {
  if (options.async === true) {
    return resolveExternalFragmentsWithSources(options).then(mergeResolvedDocuments);
  }

  return mergeResolvedDocuments(resolveExternalFragmentsSyncWithSources(options));
}

export class ExternalFragmentLoader implements Loader<ExternalFragmentLoaderOptions> {
  async load(_pointer: string, options: ExternalFragmentLoaderOptions): Promise<Source[]> {
    const resolvedFiles = await resolveExternalFragmentsWithSources(options);

    return resolvedFiles.flatMap(file =>
      file.sources.map(source => ({
        location: file.filePath,
        ...source,
      })),
    );
  }

  loadSync(_pointer: string, options: ExternalFragmentLoaderOptions): Source[] {
    const resolvedFiles = resolveExternalFragmentsSyncWithSources(options);

    return resolvedFiles.flatMap(file =>
      file.sources.map(source => ({
        location: file.filePath,
        ...source,
      })),
    );
  }
}
