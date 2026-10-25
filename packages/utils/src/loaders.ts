import { BuildSchemaOptions, DocumentNode, GraphQLSchema } from 'graphql';
import { GraphQLParseOptions } from './Interfaces.js';
import { LoadErrorHandling } from './load-error-handling.js';

export interface Source {
  document?: DocumentNode | null;
  schema?: GraphQLSchema;
  rawSDL?: string;
  location?: string;
  /**
   * Set when `errorHandling` is `'return'` or `'aggregate'` and this source
   * failed to parse or load. `document` is then `null`.
   */
  error?: Error;
}

export type BaseLoaderOptions = GraphQLParseOptions &
  BuildSchemaOptions & {
    cwd?: string;
    ignore?: string | string[];
    includeSources?: boolean;
    /**
     * How to handle a parse or load failure for one source.
     *
     * - `throw` (default): throw the first error. Other sources from the same
     *   pointer are not returned.
     * - `aggregate`: collect every failed source, then throw `AggregateError`.
     * - `return`: do not throw. Failed sources are `{ location, error }` with
     *   no `document`.
     */
    errorHandling?: LoadErrorHandling;
  };

export type WithList<T> = T | T[];
export type ElementOf<TList> = TList extends Array<infer TElement> ? TElement : never;

export interface Loader<TOptions extends BaseLoaderOptions = BaseLoaderOptions> {
  load(pointer: string, options?: TOptions): Promise<Source[] | null | never>;
  loadSync?(pointer: string, options?: TOptions): Source[] | null | never;
}
