import { GlobbyOptions } from 'globby';
/**
 * Additional options for loading files
 */
export interface LoadFilesOptions {
  ignoredExtensions?: string[];
  extensions?: string[];
  useRequire?: boolean;
  requireMethod?: any;
  globOptions?: GlobbyOptions;
  exportNames?: string[];
  recursive?: boolean;
  ignoreIndex?: boolean;
  extractExports?: (fileExport: any) => any;
}
/**
 * Synchronously loads files using the provided glob pattern.
 * @param pattern Glob pattern or patterns to use when loading files
 * @param options Additional options
 */
export declare function loadFilesSync<T = any>(pattern: string | string[], options?: LoadFilesOptions): T[];
/**
 * Asynchronously loads files using the provided glob pattern.
 * @param pattern Glob pattern or patterns to use when loading files
 * @param options Additional options
 */
export declare function loadFiles(pattern: string | string[], options?: LoadFilesOptions): Promise<any[]>;
