import {
  buildASTSchema,
  concatAST,
  DocumentNode,
  FieldDefinitionNode,
  GraphQLSchema,
  Kind,
  ObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
  parse,
  visit,
} from 'graphql';
import { createDefaultExecutor, SubschemaConfig } from '@graphql-tools/delegate';
import { buildHTTPExecutor, HTTPExecutorOptions } from '@graphql-tools/executor-http';
import { stitchSchemas, SubschemaConfigTransform } from '@graphql-tools/stitch';
import {
  AsyncExecutor,
  createGraphQLError,
  ExecutionResult,
  Executor,
  getDocumentNodeFromSchema,
  inspect,
} from '@graphql-tools/utils';
import { SubgraphBaseSDL } from './subgraph.js';
import {
  filterInternalFieldsAndTypes,
  getArgsFromKeysForFederation,
  getCacheKeyFnFromKey,
  getKeyForFederation,
} from './utils.js';

export const SubgraphSDLQuery = /* GraphQL */ `
  query SubgraphSDL {
    _service {
      sdl
    }
  }
`;

export async function getSubschemaForFederationWithURL(
  config: HTTPExecutorOptions,
): Promise<SubschemaConfig> {
  const executor = buildHTTPExecutor(config as any) as AsyncExecutor;
  const subschemaConfig = await getSubschemaForFederationWithExecutor(executor);
  return {
    batch: true,
    ...subschemaConfig,
  };
}

export function getSubschemaForFederationWithTypeDefs(typeDefs: DocumentNode): SubschemaConfig {
  const subschemaConfig = {} as SubschemaConfig;
  const typeMergingConfig = (subschemaConfig.merge = subschemaConfig.merge || {});
  const entityTypes: string[] = [];
  const visitor = (node: ObjectTypeDefinitionNode | ObjectTypeExtensionNode) => {
    if (node.directives) {
      const typeName = node.name.value;
      const selections: string[] = [];
      for (const directive of node.directives) {
        const directiveArgs = directive.arguments || [];
        switch (directive.name.value) {
          case 'key': {
            if (
              directiveArgs.some(
                arg =>
                  arg.name.value === 'resolvable' &&
                  arg.value.kind === Kind.BOOLEAN &&
                  arg.value.value === false,
              )
            ) {
              continue;
            }
            const selectionValueNode = directiveArgs.find(
              arg => arg.name.value === 'fields',
            )?.value;
            if (selectionValueNode?.kind === Kind.STRING) {
              selections.push(selectionValueNode.value);
            }
            break;
          }
          case 'inaccessible':
            return null;
        }
      }
      // If it is not an entity, continue
      if (selections.length === 0) {
        return node;
      }
      const typeMergingTypeConfig = (typeMergingConfig[typeName] =
        typeMergingConfig[typeName] || {});
      if (
        node.kind === Kind.OBJECT_TYPE_DEFINITION &&
        !node.directives?.some(d => d.name.value === 'extends')
      ) {
        typeMergingTypeConfig.canonical = true;
      }
      entityTypes.push(typeName);
      const selectionsStr = selections.join(' ');
      typeMergingTypeConfig.selectionSet = `{ ${selectionsStr} }`;
      typeMergingTypeConfig.dataLoaderOptions = {
        cacheKeyFn: getCacheKeyFnFromKey(selectionsStr),
      };
      typeMergingTypeConfig.argsFromKeys = getArgsFromKeysForFederation;
      typeMergingTypeConfig.fieldName = `_entities`;
      typeMergingTypeConfig.key = getKeyForFederation;
      const fields = [];
      if (node.fields) {
        for (const fieldNode of node.fields) {
          let removed = false;
          if (fieldNode.directives) {
            const fieldName = fieldNode.name.value;
            for (const directive of fieldNode.directives) {
              const directiveArgs = directive.arguments || [];
              switch (directive.name.value) {
                case 'requires': {
                  const typeMergingFieldsConfig = (typeMergingTypeConfig.fields =
                    typeMergingTypeConfig.fields || {});
                  typeMergingFieldsConfig[fieldName] = typeMergingFieldsConfig[fieldName] || {};
                  if (
                    directiveArgs.some(
                      arg =>
                        arg.name.value === 'resolvable' &&
                        arg.value.kind === Kind.BOOLEAN &&
                        arg.value.value === false,
                    )
                  ) {
                    continue;
                  }
                  const selectionValueNode = directiveArgs.find(
                    arg => arg.name.value === 'fields',
                  )?.value;
                  if (selectionValueNode?.kind === Kind.STRING) {
                    typeMergingFieldsConfig[fieldName].selectionSet =
                      `{ ${selectionValueNode.value} }`;
                    typeMergingFieldsConfig[fieldName].computed = true;
                  }
                  break;
                }
                case 'external':
                case 'inaccessible': {
                  removed = !typeMergingTypeConfig.selectionSet?.includes(` ${fieldName} `);
                  break;
                }
                case 'override': {
                  const typeMergingFieldsConfig = (typeMergingTypeConfig.fields =
                    typeMergingTypeConfig.fields || {});
                  typeMergingFieldsConfig[fieldName] = typeMergingFieldsConfig[fieldName] || {};
                  typeMergingFieldsConfig[fieldName].canonical = true;
                  break;
                }
              }
            }
          }
          if (!removed) {
            fields.push(fieldNode);
          }
        }
        (node.fields as FieldDefinitionNode[]) = fields;
      }
    }
    return {
      ...node,
      kind: Kind.OBJECT_TYPE_DEFINITION,
    };
  };
  const parsedSDL = visit(typeDefs, {
    ObjectTypeExtension: visitor,
    ObjectTypeDefinition: visitor,
  });
  let extraSdl = SubgraphBaseSDL;
  if (entityTypes.length > 0) {
    extraSdl += `\nunion _Entity = ${entityTypes.join(' | ')}`;
    extraSdl += `\nextend type Query { _entities(representations: [_Any!]!): [_Entity]! }`;
  }
  subschemaConfig.schema = buildASTSchema(concatAST([parse(extraSdl), parsedSDL]), {
    assumeValidSDL: true,
    assumeValid: true,
  });
  // subschemaConfig.batch = true;
  return subschemaConfig;
}

export async function getSubschemaForFederationWithExecutor(executor: Executor) {
  const sdlQueryResult = (await executor({
    document: parse(SubgraphSDLQuery),
  })) as ExecutionResult;

  if (sdlQueryResult.errors?.length) {
    const error = sdlQueryResult.errors[0];
    throw createGraphQLError(error.message, error);
  }

  if (!sdlQueryResult.data?._service?.sdl) {
    throw new Error(`Unexpected result: ${inspect(sdlQueryResult)}`);
  }

  const typeDefs = parse(sdlQueryResult.data._service.sdl);

  const subschemaConfig = getSubschemaForFederationWithTypeDefs(typeDefs);

  return {
    ...subschemaConfig,
    executor,
  };
}

export async function getSubschemaForFederationWithSchema(schema: GraphQLSchema) {
  const executor = createDefaultExecutor(schema);
  return getSubschemaForFederationWithExecutor(executor);
}

export async function getStitchedSchemaWithUrls(configs: HTTPExecutorOptions[]) {
  const subschemas = await Promise.all(
    configs.map(config => getSubschemaForFederationWithURL(config)),
  );
  const schema = stitchSchemas({
    subschemas,
  });
  return filterInternalFieldsAndTypes(schema);
}

export const federationSubschemaTransformer: SubschemaConfigTransform =
  function federationSubschemaTransformer(subschemaConfig: SubschemaConfig): SubschemaConfig {
    const typeDefs = getDocumentNodeFromSchema(subschemaConfig.schema);
    const newSubschema = getSubschemaForFederationWithTypeDefs(typeDefs);
    return {
      ...subschemaConfig,
      ...newSubschema,
      merge: {
        ...newSubschema.merge,
        ...subschemaConfig.merge,
      },
    };
  };

export type GetStitchedSchemaFromManagedFederationOpts = {
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
  fetch?: typeof fetch;
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

/**
 * Fetches the supergraph SDL from a managed federation GraphOS up link.
 * @param options
 * @returns An object with the supergraph SDL when possible. It also includes metadata to handle polling and retry logic.
 *          If `lastSeenId` is provided and the supergraph has not changed, `supergraphSdl` is not present.
 */
export async function getStitchedSchemaFromManagedFederation(
  options: GetStitchedSchemaFromManagedFederationOpts,
) {
  const {
    upLink = 'https://uplink.api.apollographql.com/',
    fetch = global.fetch,
    ...variables
  } = options;

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
              supergraphSDL
              minDelaySeconds
            }
          }
        }
      `,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch supergraph SDL from managed federation up link '${upLink}': [${response.status} ${response.statusText}] ${await response.text()}`,
    );
  }

  const responseBody = await response.text();
  let result: ExecutionResult;
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

  const { routerConfig } = result.data;

  if (routerConfig.__typename === 'FetchError') {
    return {
      error: { code: routerConfig.code, message: routerConfig.message },
      minDelaySeconds: routerConfig.minDelaySeconds,
    } as FetchError;
  }

  if (routerConfig.__typename === 'Unchanged') {
    return { id: routerConfig.id, minDelaySeconds: routerConfig.minDelaySeconds } as Unchanged;
  }

  return {
    supergraphSdl: routerConfig.supergraphSDL,
    id: routerConfig.id,
    minDelaySeconds: routerConfig.minDelaySeconds,
  } as RouterConfig;
}
