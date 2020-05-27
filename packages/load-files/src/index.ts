import globby, { sync as globbySync, GlobbyOptions } from 'globby';
import unixify from 'unixify';
import { extname } from 'path';
import { readFile, stat, statSync, readFileSync } from 'fs-extra';

const DEFAULT_IGNORED_EXTENSIONS = ['spec', 'test', 'd', 'map'];
const DEFAULT_EXTENSIONS = ['gql', 'graphql', 'graphqls', 'ts', 'js'];
const DEFAULT_EXPORT_NAMES = ['typeDefs', 'schema'];

function asArray<T>(obj: T | T[]): T[] {
  if (obj instanceof Array) {
    return obj;
  } else {
    return [obj];
  }
}

function isDirectorySync(path: string) {
  try {
    const pathStat = statSync(path);
    return pathStat.isDirectory();
  } catch (e) {
    return false;
  }
}

async function isDirectory(path: string) {
  try {
    const pathStat = await stat(path);
    return pathStat.isDirectory();
  } catch (e) {
    return false;
  }
}

function scanForFilesSync(globStr: string | string[], globOptions: GlobbyOptions = {}): string[] {
  return globbySync(globStr, { absolute: true, ...globOptions });
}

function buildGlob(
  basePath: string,
  extensions: string[],
  ignoredExtensions: string[] = [],
  recursive: boolean
): string {
  const ignored = ignoredExtensions.length > 0 ? `!(${ignoredExtensions.map(e => '*.' + e).join('|')})` : '*';
  const ext = extensions.map(e => '*.' + e).join('|');

  return `${basePath}${recursive ? '/**' : ''}/${ignored}+(${ext})`;
}

function extractExports(fileExport: any, exportNames: string[]): any | null {
  if (!fileExport) {
    return null;
  }

  if (fileExport.default) {
    for (const exportName of exportNames) {
      if (fileExport.default[exportName]) {
        return fileExport.default[exportName];
      }
    }

    return fileExport.default;
  }

  for (const exportName of exportNames) {
    if (fileExport[exportName]) {
      return fileExport[exportName];
    }
  }

  return fileExport;
}

export interface LoadFilesOptions {
  ignoredExtensions?: string[];
  extensions?: string[];
  useRequire?: boolean;
  requireMethod?: any;
  globOptions?: GlobbyOptions;
  exportNames?: string[];
  recursive?: boolean;
  ignoreIndex?: boolean;
}

const LoadFilesDefaultOptions: LoadFilesOptions = {
  ignoredExtensions: DEFAULT_IGNORED_EXTENSIONS,
  extensions: DEFAULT_EXTENSIONS,
  useRequire: false,
  requireMethod: null,
  globOptions: {
    absolute: true,
  },
  exportNames: DEFAULT_EXPORT_NAMES,
  recursive: true,
  ignoreIndex: false,
};

export function loadFilesSync<T = any>(
  pattern: string | string[],
  options: LoadFilesOptions = LoadFilesDefaultOptions
): T[] {
  const execOptions = { ...LoadFilesDefaultOptions, ...options };
  const relevantPaths = scanForFilesSync(
    asArray(pattern).map(path =>
      isDirectorySync(path)
        ? buildGlob(unixify(path), execOptions.extensions, execOptions.ignoredExtensions, execOptions.recursive)
        : unixify(path)
    ),
    options.globOptions
  );

  return relevantPaths
    .map(path => {
      if (!checkExtension(path, options)) {
        return;
      }

      if (isIndex(path, execOptions.extensions) && options.ignoreIndex) {
        return false;
      }

      const extension = extname(path);

      if (extension.endsWith('.js') || extension.endsWith('.ts') || execOptions.useRequire) {
        const fileExports = (execOptions.requireMethod ? execOptions.requireMethod : require)(path);
        const extractedExport = extractExports(fileExports, execOptions.exportNames);

        if (extractedExport.typeDefs && extractedExport.resolvers) {
          return extractedExport;
        }

        if (extractedExport.schema) {
          return extractedExport.schema;
        }

        if (extractedExport.typeDef) {
          return extractedExport.typeDef;
        }

        if (extractedExport.typeDefs) {
          return extractedExport.typeDefs;
        }

        if (extractedExport.resolver) {
          return extractedExport.resolver;
        }

        if (extractedExport.resolvers) {
          return extractedExport.resolvers;
        }

        return extractedExport;
      } else {
        return readFileSync(path, { encoding: 'utf-8' });
      }
    })
    .filter(v => v);
}

async function scanForFiles(globStr: string | string[], globOptions: GlobbyOptions = {}): Promise<string[]> {
  return globby(globStr, { absolute: true, ...globOptions });
}

const checkExtension = (
  path: string,
  { extensions, ignoredExtensions }: { extensions?: string[]; ignoredExtensions?: string[] }
) => {
  if (ignoredExtensions) {
    for (const ignoredExtension of ignoredExtensions) {
      if (path.endsWith(ignoredExtension)) {
        return false;
      }
    }
  }

  if (!extensions) {
    return true;
  }

  for (const extension of extensions) {
    if (path.endsWith(extension)) {
      return true;
    }
  }

  return false;
};

export async function loadFiles(
  pattern: string | string[],
  options: LoadFilesOptions = LoadFilesDefaultOptions
): Promise<any[]> {
  const execOptions = { ...LoadFilesDefaultOptions, ...options };
  const relevantPaths = await scanForFiles(
    await Promise.all(
      asArray(pattern).map(async path =>
        (await isDirectory(path))
          ? buildGlob(unixify(path), execOptions.extensions, execOptions.ignoredExtensions, execOptions.recursive)
          : unixify(path)
      )
    ),
    options.globOptions
  );

  const require$ = (path: string) => import(path).catch(async () => require(path));

  return Promise.all(
    relevantPaths
      .filter(path => checkExtension(path, options) && !(isIndex(path, execOptions.extensions) && options.ignoreIndex))
      .map(async path => {
        const extension = extname(path);

        if (extension.endsWith('.js') || extension.endsWith('.ts') || execOptions.useRequire) {
          const fileExports = await (execOptions.requireMethod ? execOptions.requireMethod : require$)(path);
          const extractedExport = extractExports(fileExports, execOptions.exportNames);

          if (extractedExport.resolver) {
            return extractedExport.resolver;
          }

          if (extractedExport.resolvers) {
            return extractedExport.resolvers;
          }

          return extractedExport;
        } else {
          return readFile(path, { encoding: 'utf-8' });
        }
      })
  );
}

function isIndex(path: string, extensions: string[] = []): boolean {
  const IS_INDEX = /(\/|\\)index\.[^\/\\]+$/i; // (/ or \) AND `index.` AND (everything except \ and /)(end of line)
  return IS_INDEX.test(path) && extensions.some(ext => path.endsWith('.' + ext));
}
