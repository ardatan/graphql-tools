import {
  DefinitionNode,
  DocumentNode,
  GraphQLSchema,
  parse,
  Source,
  Kind,
  isSchema,
  OperationTypeDefinitionNode,
  OperationTypeNode,
  isDefinitionNode,
} from 'graphql';
import { CompareFn, defaultStringComparator, isSourceTypes, isStringTypes } from './utils';
import { MergedResultMap, mergeGraphQLNodes, schemaDefSymbol } from './merge-nodes';
import { resetComments, printWithComments } from './comments';
import { getDocumentNodeFromSchema } from '@graphql-tools/utils';
import { DEFAULT_OPERATION_TYPE_NAME_MAP } from './schema-def';

type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

export interface Config {
  /**
   * Produces `schema { query: ..., mutation: ..., subscription: ... }`
   *
   * Default: true
   */
  useSchemaDefinition?: boolean;
  /**
   * Creates schema definition, even when no types are available
   * Produces: `schema { query: Query }`
   *
   * Default: false
   */
  forceSchemaDefinition?: boolean;
  /**
   * Throws an error on a merge conflict
   *
   * Default: false
   */
  throwOnConflict?: boolean;
  /**
   * Descriptions are defined as preceding string literals, however an older
   * experimental version of the SDL supported preceding comments as
   * descriptions. Set to true to enable this deprecated behavior.
   * This option is provided to ease adoption and will be removed in v16.
   *
   * Default: false
   */
  commentDescriptions?: boolean;
  /**
   * Puts the next directive first.
   *
   * Default: false
   *
   * @example:
   * Given:
   * ```graphql
   *  type User { a: String @foo }
   *  type User { a: String @bar }
   * ```
   *
   * Results:
   * ```
   *  type User { a: @bar @foo }
   * ```
   */
  reverseDirectives?: boolean;
  exclusions?: string[];
  sort?: boolean | CompareFn<string>;
  convertExtensions?: boolean;
  consistentEnumMerge?: boolean;
  ignoreFieldConflicts?: boolean;
}

/**
 * Merges multiple type definitions into a single `DocumentNode`
 * @param types The type definitions to be merged
 */
export function mergeTypeDefs(types: Array<string | Source | DocumentNode | GraphQLSchema>): DocumentNode;
export function mergeTypeDefs(
  types: Array<string | Source | DocumentNode | GraphQLSchema>,
  config?: Partial<Config> & { commentDescriptions: true }
): string;
export function mergeTypeDefs(
  types: Array<string | Source | DocumentNode | GraphQLSchema>,
  config?: Omit<Partial<Config>, 'commentDescriptions'>
): DocumentNode;
export function mergeTypeDefs(
  types: Array<string | Source | DocumentNode | GraphQLSchema>,
  config?: Partial<Config>
): DocumentNode | string {
  resetComments();

  const doc = {
    kind: Kind.DOCUMENT,
    definitions: mergeGraphQLTypes(types, {
      useSchemaDefinition: true,
      forceSchemaDefinition: false,
      throwOnConflict: false,
      commentDescriptions: false,
      ...config,
    }),
  };

  let result: any;

  if (config && config.commentDescriptions) {
    result = printWithComments(doc);
  } else {
    result = doc;
  }

  resetComments();

  return result;
}

function visitTypeSources(
  types: Array<string | Source | DocumentNode | GraphQLSchema | DefinitionNode>,
  allNodes: DefinitionNode[] = []
) {
  for (const type of types) {
    if (type) {
      if (Array.isArray(type)) {
        visitTypeSources(type, allNodes);
      } else if (isSchema(type)) {
        const documentNode = getDocumentNodeFromSchema(type);
        visitTypeSources(documentNode.definitions as DefinitionNode[], allNodes);
      } else if (isStringTypes(type) || isSourceTypes(type)) {
        const documentNode = parse(type);
        visitTypeSources(documentNode.definitions as DefinitionNode[], allNodes);
      } else if (isDefinitionNode(type)) {
        allNodes.push(type);
      } else {
        visitTypeSources(type.definitions as DefinitionNode[], allNodes);
      }
    }
  }
  return allNodes;
}

export function mergeGraphQLTypes(
  types: Array<string | Source | DocumentNode | GraphQLSchema>,
  config: Config
): DefinitionNode[] {
  resetComments();

  const allNodes = visitTypeSources(types);

  const mergedNodes: MergedResultMap = mergeGraphQLNodes(allNodes, config);

  if (config?.useSchemaDefinition) {
    // XXX: right now we don't handle multiple schema definitions
    const schemaDef = mergedNodes[schemaDefSymbol] || {
      kind: Kind.SCHEMA_DEFINITION,
      operationTypes: [],
    };
    const operationTypes = schemaDef.operationTypes as OperationTypeDefinitionNode[];
    for (const opTypeDefNodeType in DEFAULT_OPERATION_TYPE_NAME_MAP) {
      const opTypeDefNode = operationTypes.find(operationType => operationType.operation === opTypeDefNodeType);
      if (!opTypeDefNode) {
        const possibleRootTypeName = DEFAULT_OPERATION_TYPE_NAME_MAP[opTypeDefNodeType];
        const existingPossibleRootType = mergedNodes[possibleRootTypeName];
        if (existingPossibleRootType != null && existingPossibleRootType.name != null) {
          operationTypes.push({
            kind: Kind.OPERATION_TYPE_DEFINITION,
            type: {
              kind: Kind.NAMED_TYPE,
              name: existingPossibleRootType.name,
            },
            operation: opTypeDefNodeType as OperationTypeNode,
          });
        }
      }
    }

    if (schemaDef?.operationTypes?.length != null && schemaDef.operationTypes.length > 0) {
      mergedNodes[schemaDefSymbol] = schemaDef;
    }
  }

  if (config?.forceSchemaDefinition && !mergedNodes[schemaDefSymbol]?.operationTypes?.length) {
    mergedNodes[schemaDefSymbol] = {
      kind: Kind.SCHEMA_DEFINITION,
      operationTypes: [
        {
          kind: Kind.OPERATION_TYPE_DEFINITION,
          operation: 'query',
          type: {
            kind: Kind.NAMED_TYPE,
            name: {
              kind: Kind.NAME,
              value: 'Query',
            },
          },
        },
      ],
    };
  }

  const mergedNodeDefinitions = Object.values(mergedNodes);

  if (config?.sort) {
    const sortFn = typeof config.sort === 'function' ? config.sort : defaultStringComparator;
    mergedNodeDefinitions.sort((a, b) => sortFn(a.name?.value, b.name?.value));
  }

  return mergedNodeDefinitions;
}
