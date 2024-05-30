import { GraphQLSchema } from 'graphql';
import type { FetchFn } from '@graphql-tools/executor-http';
import { ExecutionResult } from '@graphql-tools/utils';
import { fetch as defaultFetch } from '@whatwg-node/fetch';
import {
  getStitchedSchemaFromSupergraphSdl,
  GetSubschemasFromSupergraphSdlOpts,
} from './supergraph.js';

export type FetchSupergraphSdlFromManagedFederationOpts = {
  /**
   * The graph ID of the managed federation graph.
   */
  graphId: string;
  /**
   * The API key to use to authenticate with the managed federation up link.
   * It needs at least the `service:read` permission.
   */
  apiKey: string;
  /**
   * The URL of the managed federation up link.
   * Default: 'https://uplink.api.apollographql.com/' (Apollo's managed federation up link on GCP)
   * Alternative: 'https://aws.uplink.api.apollographql.com/' (Apollo's managed federation up link on AWS)
   */
  upLink?: string;
  /**
   * The ID of the last fetched supergraph.
   * If provided, a supergraph is returned only if the managed supergraph have changed.
   */
  lastSeenId?: string;
  /**
   * The fetch implementation to use.
   * Default: global.fetch
   */
  fetch?: FetchFn;
};

export type RouterConfig = {
  supergraphSdl: string;
  minDelaySeconds: number;
  id: string;
};

export type Unchanged = {
  minDelaySeconds?: never;
  id: string;
};

export type FetchError = {
  error: { code: string; message: string };
  minDelaySeconds: never;
};

type RouterConfigResult = {
  routerConfig:
    | ({ __typename: 'RouterConfigResult' } & RouterConfig)
    | ({ __typename: 'Unchanged' } & Unchanged)
    | { __typename: 'FetchError'; code: string; message: string; minDelaySeconds: never };
};

export const DEFAULT_UPLINK_ENDPOINTS = [
  'https://uplink.api.apollographql.com/',
  'https://aws.uplink.api.apollographql.com/',
];

/**
 * Fetches the supergraph SDL from a managed federation GraphOS up link.
 * @param options
 * @returns An object with the supergraph SDL when possible. It also includes metadata to handle polling and retry logic.
 *          If `lastSeenId` is provided and the supergraph has not changed, `supergraphSdl` is not present.
 */
export async function fetchSupergraphSdlFromManagedFederation(
  options: FetchSupergraphSdlFromManagedFederationOpts,
): Promise<RouterConfig | Unchanged | FetchError> {
  const { upLink = DEFAULT_UPLINK_ENDPOINTS[0], fetch = defaultFetch, ...variables } = options;

  const response = await fetch(upLink, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        query ($apiKey: String!, $graphId: String!, $lastSeenId: ID) {
          routerConfig(ref: $graphId, apiKey: $apiKey, ifAfterId: $lastSeenId) {
            __typename
            ... on FetchError {
              code
              message
              minDelaySeconds
            }
            ... on Unchanged {
              id
              minDelaySeconds
            }
            ... on RouterConfigResult {
              id
              supergraphSdl: supergraphSDL
              minDelaySeconds
            }
          }
        }
      `,
      variables,
    }),
  });

  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(
      `Failed to fetch supergraph SDL from managed federation up link '${upLink}': [${response.status} ${response.statusText}] ${responseBody}`,
    );
  }

  let result: ExecutionResult<RouterConfigResult>;
  try {
    result = JSON.parse(responseBody);
  } catch (err) {
    throw new Error(
      `Failed to parse response from managed federation up link '${upLink}': ${(err as Error).message}\n\n${responseBody}`,
    );
  }

  if (!result.data?.routerConfig) {
    throw new Error(
      `Failed to fetch supergraph SDL from managed federation up link '${upLink}': ${responseBody}`,
    );
  }

  if (result.errors) {
    const errors = result.errors.map(({ message }) => '\n' + message).join('');
    throw new Error(
      `Failed to fetch supergraph SDL from managed federation up link '${upLink}': ${errors}`,
    );
  }

  const { routerConfig } = result.data;

  if (routerConfig.__typename === 'FetchError') {
    const fetchError: FetchError = {
      error: { code: routerConfig.code, message: routerConfig.message },
      minDelaySeconds: routerConfig.minDelaySeconds,
    };
    return fetchError;
  }

  if (routerConfig.__typename === 'Unchanged') {
    return { id: routerConfig.id, minDelaySeconds: routerConfig.minDelaySeconds };
  }

  return {
    supergraphSdl: routerConfig.supergraphSdl,
    id: routerConfig.id,
    minDelaySeconds: routerConfig.minDelaySeconds,
  };
}

export type GetStitchedSchemaFromManagedFederationOpts =
  FetchSupergraphSdlFromManagedFederationOpts &
    Omit<GetSubschemasFromSupergraphSdlOpts, 'supergraphSdl'>;

export async function getStitchedSchemaFromManagedFederation(
  options: GetStitchedSchemaFromManagedFederationOpts,
): Promise<
  | {
      supergraphSdl: string;
      schema: GraphQLSchema;
      id: string;
      minDelaySeconds: number;
    }
  | FetchError
  | Unchanged
> {
  const result = await fetchSupergraphSdlFromManagedFederation({
    graphId: options.graphId,
    apiKey: options.apiKey,
    upLink: options.upLink,
    lastSeenId: options.lastSeenId,
    fetch: options.fetch,
  });
  if ('supergraphSdl' in result) {
    return {
      ...result,
      schema: getStitchedSchemaFromSupergraphSdl({
        supergraphSdl: result.supergraphSdl,
        onExecutor: options.onExecutor,
        batch: options.batch,
      }),
    };
  }
  return result;
}
