import { promises as fsPromises, readFileSync } from 'fs';
import { concatAST, parse } from 'graphql';
import type { DocumentNode } from 'graphql';
import {
  gqlPluckFromCodeString,
  gqlPluckFromCodeStringSync,
  type GraphQLTagPluckOptions,
} from '@graphql-tools/graphql-tag-pluck';
import type { Loader, Source } from '@graphql-tools/utils';
import type { ExternalFragmentLoaderOptions } from './options.js';
import { resolveExternalFragments, resolveExternalFragmentsSync } from './resolve.js';

const { readFile } = fsPromises;
const GQL_EXTENSIONS = ['.graphql', '.gql'];

function isGraphQLFile(filePath: string): boolean {
  return GQL_EXTENSIONS.some(extension => filePath.endsWith(extension));
}

async function extractSDL(
  filePath: string,
  fileContent: string,
  pluckConfig?: GraphQLTagPluckOptions,
): Promise<string[]> {
  if (isGraphQLFile(filePath)) return [fileContent];

  const sources = await gqlPluckFromCodeString(filePath, fileContent, pluckConfig);
  return sources.map(source => source.body);
}

function extractSDLSync(
  filePath: string,
  fileContent: string,
  pluckConfig?: GraphQLTagPluckOptions,
): string[] {
  if (isGraphQLFile(filePath)) return [fileContent];

  const sources = gqlPluckFromCodeStringSync(filePath, fileContent, pluckConfig);
  return sources.map(source => source.body);
}

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
  const resolvedFiles = resolveExternalFragmentsSync(options);

  const documents: DocumentNode[] = [];
  for (const file of resolvedFiles) {
    const content = readFileSync(file.filePath, 'utf8');
    const sdls = extractSDLSync(file.filePath, content, options.pluckConfig);
    for (const sdl of sdls) {
      documents.push(parse(sdl, { noLocation: true }));
    }
  }

  return concatAST(documents);
}

export class ExternalFragmentLoader implements Loader<ExternalFragmentLoaderOptions> {
  async load(_pointer: string, options: ExternalFragmentLoaderOptions): Promise<Source[]> {
    const resolvedFiles = await resolveExternalFragments(options);

    const sources: Source[] = [];
    for (const file of resolvedFiles) {
      const content = await readFile(file.filePath, 'utf8');
      const sdls = await extractSDL(file.filePath, content, options.pluckConfig);
      for (const sdl of sdls) {
        sources.push({
          location: file.filePath,
          rawSDL: sdl,
          document: parse(sdl, { noLocation: true }),
        });
      }
    }

    return sources;
  }

  loadSync(_pointer: string, options: ExternalFragmentLoaderOptions): Source[] {
    const resolvedFiles = resolveExternalFragmentsSync(options);

    const sources: Source[] = [];
    for (const file of resolvedFiles) {
      const content = readFileSync(file.filePath, 'utf8');
      const sdls = extractSDLSync(file.filePath, content, options.pluckConfig);
      for (const sdl of sdls) {
        sources.push({
          location: file.filePath,
          rawSDL: sdl,
          document: parse(sdl, { noLocation: true }),
        });
      }
    }

    return sources;
  }
}
