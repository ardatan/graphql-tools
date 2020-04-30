import {
  Source,
  UniversalLoader,
  DocumentPointerSingle,
  SchemaPointerSingle,
  isValidPath,
  parseGraphQLSDL,
  SingleFileOptions,
} from '@graphql-tools/utils';
import { isAbsolute, resolve } from 'path';
import { exists, existsSync, readFile, readFileSync } from 'fs-extra';
import { cwd as processCwd } from 'process';
import { processImport } from 'packages/import/src';

const FILE_EXTENSIONS = ['.gql', '.gqls', '.graphql', '.graphqls'];

export interface GraphQLFileLoaderOptions extends SingleFileOptions {}

function isGraphQLImportFile(rawSDL: string) {
  const trimmedRawSDL = rawSDL.trim();
  return trimmedRawSDL.startsWith('# import') || trimmedRawSDL.startsWith('#import');
}

export class GraphQLFileLoader implements UniversalLoader<GraphQLFileLoaderOptions> {
  loaderId(): string {
    return 'graphql-file';
  }

  async canLoad(
    pointer: SchemaPointerSingle | DocumentPointerSingle,
    options: GraphQLFileLoaderOptions
  ): Promise<boolean> {
    if (isValidPath(pointer)) {
      if (FILE_EXTENSIONS.find(extension => pointer.endsWith(extension))) {
        const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd, pointer);
        return new Promise(resolve => exists(normalizedFilePath, resolve));
      }
    }

    return false;
  }

  canLoadSync(pointer: SchemaPointerSingle | DocumentPointerSingle, options: GraphQLFileLoaderOptions): boolean {
    if (isValidPath(pointer)) {
      if (FILE_EXTENSIONS.find(extension => pointer.endsWith(extension))) {
        const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd, pointer);
        return existsSync(normalizedFilePath);
      }
    }

    return false;
  }

  async load(pointer: SchemaPointerSingle | DocumentPointerSingle, options: GraphQLFileLoaderOptions): Promise<Source> {
    const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd, pointer);
    const rawSDL: string = await readFile(normalizedFilePath, { encoding: 'utf8' });

    if (isGraphQLImportFile(rawSDL)) {
      return {
        location: pointer,
        document: processImport(pointer, options.cwd),
      };
    }
    return parseGraphQLSDL(pointer, rawSDL.trim(), options);
  }

  loadSync(pointer: SchemaPointerSingle | DocumentPointerSingle, options: GraphQLFileLoaderOptions): Source {
    const cwd = options.cwd || processCwd();
    const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(cwd, pointer);
    const rawSDL = readFileSync(normalizedFilePath, { encoding: 'utf8' });

    if (isGraphQLImportFile(rawSDL)) {
      return {
        location: pointer,
        document: processImport(pointer, options.cwd),
      };
    }
    return parseGraphQLSDL(pointer, rawSDL.trim(), options);
  }
}
