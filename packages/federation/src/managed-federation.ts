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
   * The graph ref of the managed federation graph.
   * It is composed of the graph ID and the variant (`<YOUR_GRAPH_ID>@<VARIANT>`).
   *
   * If not provided, `APOLLO_GRAPH_REF` environment variable is used.
   *
   * You can find a a graph's ref at the top of its Schema Reference page in Apollo Studio.
   */
  graphRef?: string;
  /**
   * The API key to use to authenticate with the managed federation up link.
   * It needs at least the `service:read` permission.
   *
   * If not provided, `APOLLO_KEY` environment variable will be used instead.
   *
   * [Learn how to create an API key](https://www.apollographql.com/docs/federation/v1/managed-federation/setup#4-connect-the-gateway-to-studio)
   */
  apiKey?: string;
  /**
   * The URL of the managed federation up link. When retrying after a failure, you should cycle through the default up links using this option.
   *
   * Uplinks are available in `DEFAULT_UPLINKS` constant.
   *
   * This options can also be defined using the `APOLLO_SCHEMA_CONFIG_DELIVERY_ENDPOINT` environment variable.
   * It should be a comma separated list of up links, but only the first one will be used.
   *
   * Default: 'https://uplink.api.apollographql.com/' (Apollo's managed federation up link on GCP)
   *
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
  /**
   * Up link can send back messages meant to be logged alongside the supergraph SDL.
   * By default, the console is used.
   */
  loggerByMessageLevel?: typeof DEFAULT_MESSAGE_LOGGER;
};

export type RouterConfig = {
  /**
   * The supergraph SDL.
   */
  supergraphSdl: string;
  /**
   * The minimum delay in seconds to wait before trying to fetch this supergraph again.
   */
  minDelaySeconds: number;
  /**
   * The ID of the supergraph. Should be used as `lastSeenId` in the next fetch.
   */
  id: string;
};

export type Unchanged = {
  /**
   * The minimum delay in seconds to wait before trying to fetch this supergraph again.
   */
  minDelaySeconds: number;
  /**
   * The ID of the supergraph. Should be used as `lastSeenId` in the next fetch.
   */
  id: string;
};

export type FetchError = {
  /**
   * The fetch error reported by the up link. This means it's not the local fetch error.
   * Local fetch errors are thrown as exceptions.
   */
  error: { code: string; message: string };
  /**
   * The minimum delay in seconds to wait before trying to fetch this supergraph again.
   */
  minDelaySeconds: number;
};

type RouterConfigResult = {
  routerConfig:
    | ({
        __typename: 'RouterConfigResult';
        messages: { level: 'ERROR' | 'WARN' | 'INFO'; body: string }[];
      } & RouterConfig)
    | ({ __typename: 'Unchanged' } & Unchanged)
    | { __typename: 'FetchError'; code: string; message: string; minDelaySeconds: never };
};

/**
 * The default managed federation up links. In case of failure, you should try to cycle through these up links.
 *
 * The first one is Apollo's managed federation up link on GCP, the second one is on AWS.
 */
export const DEFAULT_UPLINKS = [
  'https://uplink.api.apollographql.com/',
  'https://aws.uplink.api.apollographql.com/',
];

/**
 * Fetches the supergraph SDL from a managed federation GraphOS up link.
 * @param options
 * @throws When the fetch fails or the response is not a valid.
 * @returns An object with the supergraph SDL when possible. It also includes metadata to handle polling and retry logic.
 *
 *          If `lastSeenId` is provided and the supergraph has not changed, `supergraphSdl` is not present.
 *
 *          If The up link report a fetch error (which is not a local fetch error), it will be returned along with polling/retry metadata.
 *          Any local fetch error will be thrown as an exception.
 */
export async function fetchSupergraphSdlFromManagedFederation(
  options: FetchSupergraphSdlFromManagedFederationOpts = {},
): Promise<RouterConfig | Unchanged | FetchError> {
  const userDefinedUplinks =
    process.env['APOLLO_SCHEMA_CONFIG_DELIVERY_ENDPOINT']?.split(',') ?? [];

  const {
    upLink = userDefinedUplinks[0] || DEFAULT_UPLINKS[0],
    loggerByMessageLevel = DEFAULT_MESSAGE_LOGGER,
    fetch = defaultFetch,
    ...variables
  } = options;

  if (!variables.graphRef) {
    variables.graphRef = process.env['APOLLO_GRAPH_REF'];
  }

  if (!variables.apiKey) {
    variables.apiKey = process.env['APOLLO_KEY'];
  }

  const response = await fetch(upLink, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        query ($apiKey: String!, $graphRef: String!, $lastSeenId: ID) {
          routerConfig(ref: $graphRef, apiKey: $apiKey, ifAfterId: $lastSeenId) {
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
              messages {
                level
                body
              }
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

  if (result.errors) {
    const errors = result.errors.map(({ message }) => '\n' + message).join('');
    throw new Error(
      `Failed to fetch supergraph SDL from managed federation up link '${upLink}': ${errors}`,
    );
  }

  if (!result.data?.routerConfig) {
    throw new Error(
      `Failed to fetch supergraph SDL from managed federation up link '${upLink}': ${responseBody}`,
    );
  }

  const { routerConfig } = result.data;

  if (routerConfig.__typename === 'FetchError') {
    return {
      error: { code: routerConfig.code, message: routerConfig.message },
      minDelaySeconds: routerConfig.minDelaySeconds,
    };
  }

  if (routerConfig.__typename === 'Unchanged') {
    return { id: routerConfig.id, minDelaySeconds: routerConfig.minDelaySeconds };
  }

  for (const message of routerConfig.messages) {
    loggerByMessageLevel[message.level](message.body);
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

/**
 * Fetches the supergraph SDL from a managed federation GraphOS up link and stitches it into an executable schema.
 * @param options
 * @throws When the fetch fails, the response is not a valid or the stitching fails.
 * @returns An object with the supergraph SDL and the stitched schema when possible. It also includes metadata to handle polling and retry logic.
 *
 *          If `lastSeenId` is provided and the supergraph has not changed, `supergraphSdl` is not present.
 *
 *          If The up link report a fetch error (which is not a local fetch error), it will be returned along with polling/retry metadata.
 *          Any local fetch error will be thrown as an exception.
 */
export async function getStitchedSchemaFromManagedFederation(
  options: GetStitchedSchemaFromManagedFederationOpts,
): Promise<
  | (RouterConfig & {
      /**
       * The stitched schema based on the supergraph SDL.
       */
      schema: GraphQLSchema;
    })
  | FetchError
  | Unchanged
> {
  const result = await fetchSupergraphSdlFromManagedFederation({
    graphRef: options.graphRef,
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

const DEFAULT_MESSAGE_LOGGER = {
  ERROR: (message: string) =>
    console.error('[Managed Federation] Uplink message: [ERROR]', message),
  WARN: (message: string) => console.warn('[Managed Federation] Uplink message: [WARN]', message),
  INFO: (message: string) => console.info('[Managed Federation] Uplink message: [INFO]', message),
};
