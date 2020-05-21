import {
  Source,
  parseGraphQLJSON,
  SchemaPointerSingle,
  DocumentLoader,
  isValidPath,
  SingleFileOptions,
} from '@graphql-tools/utils';
import { isAbsolute, resolve } from 'path';
import { exists, existsSync, readFile, readFileSync } from 'fs-extra';
import { cwd } from 'process';

const FILE_EXTENSIONS = ['.json'];

export interface JsonFileLoaderOptions extends SingleFileOptions {}

export class JsonFileLoader implements DocumentLoader {
  loaderId(): string {
    return 'json-file';
  }

  async canLoad(pointer: SchemaPointerSingle, options: JsonFileLoaderOptions): Promise<boolean> {
    if (isValidPath(pointer)) {
      if (FILE_EXTENSIONS.find(extension => pointer.endsWith(extension))) {
        const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || cwd(), pointer);
        return new Promise(resolve => exists(normalizedFilePath, resolve));
      }
    }

    return false;
  }

  canLoadSync(pointer: SchemaPointerSingle, options: JsonFileLoaderOptions): boolean {
    if (isValidPath(pointer)) {
      if (FILE_EXTENSIONS.find(extension => pointer.endsWith(extension))) {
        const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || cwd(), pointer);

        if (existsSync(normalizedFilePath)) {
          return true;
        }
      }
    }

    return false;
  }

  async load(pointer: SchemaPointerSingle, options: JsonFileLoaderOptions): Promise<Source> {
    const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || cwd(), pointer);

    try {
      const jsonContent: string = await readFile(normalizedFilePath, { encoding: 'utf8' });
      return parseGraphQLJSON(pointer, jsonContent, options);
    } catch (e) {
      throw new Error(`Unable to read JSON file: ${normalizedFilePath}: ${e.message || e}`);
    }
  }

  loadSync(pointer: SchemaPointerSingle, options: JsonFileLoaderOptions): Source {
    const normalizedFilepath = isAbsolute(pointer) ? pointer : resolve(options.cwd || cwd(), pointer);

    try {
      const jsonContent = readFileSync(normalizedFilepath, 'utf8');
      return parseGraphQLJSON(pointer, jsonContent, options);
    } catch (e) {
      throw new Error(`Unable to read JSON file: ${normalizedFilepath}: ${e.message || e}`);
    }
  }
}
