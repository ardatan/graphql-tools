import { Source, parseGraphQLSDL, AggregateError, BaseLoaderOptions, Loader } from '@graphql-tools/utils';
import { fetch } from '@whatwg-node/fetch';
import syncFetch from '@ardatan/sync-fetch';

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

const DEFAULT_APOLLO_ENDPOINT = 'https://engine-graphql.apollographql.com/api/graphql';

/**
 * This loader loads a schema from Apollo Engine
 */
export class ApolloEngineLoader implements Loader<ApolloEngineOptions> {
  private getFetchArgs(options: ApolloEngineOptions): [string, RequestInit] {
    return [
      options.engine.endpoint || DEFAULT_APOLLO_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'x-api-key': options.engine.apiKey,
          'apollo-client-name': 'Apollo Language Server',
          'apollo-client-reference-id': '146d29c0-912c-46d3-b686-920e52586be6',
          'apollo-client-version': '2.6.8',
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...options.headers,
        },
        body: JSON.stringify({
          query: SCHEMA_QUERY,
          variables: {
            id: options.graph,
            tag: options.variant,
          },
        }),
      },
    ];
  }

  async canLoad(ptr: string) {
    return this.canLoadSync(ptr);
  }

  canLoadSync(ptr: string) {
    return typeof ptr === 'string' && ptr === 'apollo-engine';
  }

  async load(pointer: string, options: ApolloEngineOptions): Promise<Source[]> {
    if (!(await this.canLoad(pointer))) {
      return [];
    }
    const fetchArgs = this.getFetchArgs(options);
    const response = await fetch(...fetchArgs);

    const { data, errors } = await response.json();

    if (errors) {
      throw new AggregateError(
        errors,
        'Introspection from Apollo Engine failed; \n ' + errors.map((e: Error) => e.message).join('\n')
      );
    }

    const source = parseGraphQLSDL(pointer, data.service.schema.document, options);
    return [source];
  }

  loadSync(pointer: string, options: ApolloEngineOptions): Source[] {
    if (!this.canLoadSync(pointer)) {
      return [];
    }
    const fetchArgs = this.getFetchArgs(options);
    const response = syncFetch(...fetchArgs);

    const { data, errors } = response.json();

    if (errors) {
      throw new AggregateError(
        errors,
        'Introspection from Apollo Engine failed; \n ' + errors.map((e: Error) => e.message).join('\n')
      );
    }

    const source = parseGraphQLSDL(pointer, data.service.schema.document, options);
    return [source];
  }
}

/**
 * @internal
 */
export const SCHEMA_QUERY = /* GraphQL */ `
  query GetSchemaByTag($tag: String!, $id: ID!) {
    service(id: $id) {
      ... on Service {
        __typename
        schema(tag: $tag) {
          document
        }
      }
    }
  }
`;
