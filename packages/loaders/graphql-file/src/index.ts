import {
  Source,
  UniversalLoader,
  DocumentPointerSingle,
  SchemaPointerSingle,
  isValidPath,
  parseGraphQLSDL,
  SingleFileOptions,
} from '@graphql-tools/utils';

const FILE_EXTENSIONS = ['.gql', '.gqls', '.graphql', '.graphqls'];

export interface GraphQLFileLoaderOptions extends SingleFileOptions {
  fs?: typeof import('fs');
  path?: typeof import('path');
}

export class GraphQLFileLoader implements UniversalLoader<GraphQLFileLoaderOptions> {
  loaderId(): string {
    return 'graphql-file';
  }

  async canLoad(
    pointer: SchemaPointerSingle | DocumentPointerSingle,
    options: GraphQLFileLoaderOptions
  ): Promise<boolean> {
    return this.canLoadSync(pointer, options);
  }

  canLoadSync(pointer: SchemaPointerSingle | DocumentPointerSingle, options: GraphQLFileLoaderOptions): boolean {
    if (isValidPath(pointer) && options.path && options.fs) {
      const { resolve, isAbsolute } = options.path;

      if (FILE_EXTENSIONS.find(extension => pointer.endsWith(extension))) {
        const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || process.cwd(), pointer);
        const { existsSync } = options.fs;

        if (existsSync(normalizedFilePath)) {
          return true;
        }
      }
    }

    return false;
  }

  async load(pointer: SchemaPointerSingle | DocumentPointerSingle, options: GraphQLFileLoaderOptions): Promise<Source> {
    return this.loadSync(pointer, options);
  }

  loadSync(pointer: SchemaPointerSingle | DocumentPointerSingle, options: GraphQLFileLoaderOptions): Source {
    const { resolve, isAbsolute } = options.path;
    const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || process.cwd(), pointer);
    const { readFileSync } = options.fs;
    const rawSDL = readFileSync(normalizedFilePath, 'utf-8').trim();

    return parseGraphQLSDL(pointer, rawSDL, options);
  }
}
