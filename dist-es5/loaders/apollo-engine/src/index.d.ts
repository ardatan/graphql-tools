import { Source, BaseLoaderOptions, Loader } from '@graphql-tools/utils';
/**
 * Additional options for loading from Apollo Engine
 */
export interface ApolloEngineOptions extends BaseLoaderOptions {
  engine: {
    endpoint?: string;
    apiKey: string;
  };
  graph: string;
  variant: string;
  headers?: Record<string, string>;
}
/**
 * This loader loads a schema from Apollo Engine
 */
export declare class ApolloEngineLoader implements Loader<ApolloEngineOptions> {
  private getFetchArgs;
  canLoad(ptr: string): Promise<boolean>;
  canLoadSync(ptr: string): boolean;
  load(pointer: string, options: ApolloEngineOptions): Promise<Source[]>;
  loadSync(pointer: string, options: ApolloEngineOptions): Source[];
}
/**
 * @internal
 */
export declare const SCHEMA_QUERY =
  '\n  query GetSchemaByTag($tag: String!, $id: ID!) {\n    service(id: $id) {\n      ... on Service {\n        __typename\n        schema(tag: $tag) {\n          document\n        }\n      }\n    }\n  }\n';
