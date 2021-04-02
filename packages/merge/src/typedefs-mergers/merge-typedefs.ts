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
import { operationTypeDefinitionNodeTypeRootTypeMap } from './schema-def';

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
  allNodes: DefinitionNode[]
) {
  for (const type of types) {
    if (type) {
      if (Array.isArray(type)) {
        visitTypeSources(types, allNodes);
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
}

export function mergeGraphQLTypes(
  types: Array<string | Source | DocumentNode | GraphQLSchema>,
  config: Config
): DefinitionNode[] {
  resetComments();

  const allNodes: DefinitionNode[] = [];
  visitTypeSources(types, allNodes);

  const mergedNodes: MergedResultMap = mergeGraphQLNodes(allNodes, config);

  // XXX: right now we don't handle multiple schema definitions
  let schemaDef = mergedNodes[schemaDefSymbol] || {
    kind: Kind.SCHEMA_DEFINITION,
    operationTypes: [],
  };

  if (config?.useSchemaDefinition) {
    const operationTypes = schemaDef.operationTypes as OperationTypeDefinitionNode[];
    for (const opTypeDefNodeType in operationTypeDefinitionNodeTypeRootTypeMap) {
      const opTypeDefNode = operationTypes.find(operationType => operationType.operation === opTypeDefNodeType);
      if (!opTypeDefNode) {
        const existingPossibleRootType = mergedNodes[operationTypeDefinitionNodeTypeRootTypeMap[opTypeDefNodeType]];
        if (existingPossibleRootType) {
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
  }

  if (config?.forceSchemaDefinition && !schemaDef?.operationTypes?.length) {
    schemaDef = {
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

  if (schemaDef.operationTypes?.length) {
    mergedNodeDefinitions.push(schemaDef);
  }

  if (config?.sort) {
    const sortFn = typeof config.sort === 'function' ? config.sort : defaultStringComparator;
    mergedNodeDefinitions.sort((a, b) => sortFn(a.name?.value, b.name?.value));
  }

  return mergedNodeDefinitions;
}
