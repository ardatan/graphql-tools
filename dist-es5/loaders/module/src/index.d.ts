import { Loader, Source } from '@graphql-tools/utils';
/**
 * * This loader loads documents and type definitions from a Node module
 *
 * ```js
 * const schema = await loadSchema('module:someModuleName#someNamedExport', {
 *   loaders: [new ModuleLoader()],
 * })
 * ```
 */
export declare class ModuleLoader implements Loader {
  private isExpressionValid;
  canLoad(pointer: string): Promise<boolean>;
  canLoadSync(pointer: string): boolean;
  load(pointer: string): Promise<Source[]>;
  loadSync(pointer: string): Source[];
  private parse;
  private extractFromModule;
  private importModule;
  private importModuleSync;
}
