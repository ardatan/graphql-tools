import { promises as fsPromises, readFileSync } from 'fs';
import { parse } from 'graphql';
import type { DocumentNode } from 'graphql';
import type { Loader, Source } from '@graphql-tools/utils';
import type { MonorepoFragmentLoaderOptions } from './options.js';
import { resolveMonorepoFragments, resolveMonorepoFragmentsSync } from './resolve.js';

const { readFile } = fsPromises;

export default async function monorepoFragmentLoader(
  _pointer: string,
  options: MonorepoFragmentLoaderOptions,
): Promise<Array<{ document: DocumentNode; location: string }>> {
  const resolvedFiles = await resolveMonorepoFragments(options);

  return resolvedFiles.map(file => {
    const content = readFileSync(file.filePath, 'utf8');
    return {
      location: file.filePath,
      document: parse(content, { noLocation: true }),
    };
  });
}

export class MonorepoFragmentLoader implements Loader<MonorepoFragmentLoaderOptions> {
  async load(_pointer: string, options: MonorepoFragmentLoaderOptions): Promise<Source[]> {
    const resolvedFiles = await resolveMonorepoFragments(options);

    const sources: Source[] = [];
    for (const file of resolvedFiles) {
      const content = await readFile(file.filePath, 'utf8');
      sources.push({
        location: file.filePath,
        rawSDL: content,
        document: parse(content, { noLocation: true }),
      });
    }

    return sources;
  }

  loadSync(_pointer: string, options: MonorepoFragmentLoaderOptions): Source[] {
    const resolvedFiles = resolveMonorepoFragmentsSync(options);

    const sources: Source[] = [];
    for (const file of resolvedFiles) {
      const content = readFileSync(file.filePath, 'utf8');
      sources.push({
        location: file.filePath,
        rawSDL: content,
        document: parse(content, { noLocation: true }),
      });
    }

    return sources;
  }
}
