import { promises as fsPromises, readFileSync } from 'fs';
import { parse } from 'graphql';
import type { DocumentNode } from 'graphql';
import {
  gqlPluckFromCodeString,
  gqlPluckFromCodeStringSync,
  type GraphQLTagPluckOptions,
} from '@graphql-tools/graphql-tag-pluck';
import type { Loader, Source } from '@graphql-tools/utils';
import type { MonorepoFragmentLoaderOptions } from './options.js';
import { resolveMonorepoFragments, resolveMonorepoFragmentsSync } from './resolve.js';

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

export default async function monorepoFragmentLoader(
  _pointer: string,
  options: MonorepoFragmentLoaderOptions,
): Promise<Array<{ document: DocumentNode; location: string }>> {
  const resolvedFiles = await resolveMonorepoFragments(options);

  const sources: Array<{ document: DocumentNode; location: string }> = [];
  for (const file of resolvedFiles) {
    const content = await readFile(file.filePath, 'utf8');
    const sdls = await extractSDL(file.filePath, content, options.pluckConfig);
    for (const sdl of sdls) {
      sources.push({
        location: file.filePath,
        document: parse(sdl, { noLocation: true }),
      });
    }
  }

  return sources;
}

export class MonorepoFragmentLoader implements Loader<MonorepoFragmentLoaderOptions> {
  async load(_pointer: string, options: MonorepoFragmentLoaderOptions): Promise<Source[]> {
    const resolvedFiles = await resolveMonorepoFragments(options);

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

  loadSync(_pointer: string, options: MonorepoFragmentLoaderOptions): Source[] {
    const resolvedFiles = resolveMonorepoFragmentsSync(options);

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
