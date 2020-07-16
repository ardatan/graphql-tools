import { DefinitionNode, DocumentNode, GraphQLSchema, parse, Source, Kind, isSchema } from 'graphql';
import { isSourceTypes, isStringTypes, isSchemaDefinition } from './utils';
import { MergedResultMap, mergeGraphQLNodes } from './merge-nodes';
import { resetComments, printWithComments } from './comments';
import { createSchemaDefinition, printSchemaWithDirectives } from '@graphql-tools/utils';

type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
type CompareFn<T> = (a: T, b: T) => number;

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

export function mergeGraphQLTypes(
  types: Array<string | Source | DocumentNode | GraphQLSchema>,
  config: Config
): DefinitionNode[] {
  resetComments();

  const allNodes: ReadonlyArray<DefinitionNode> = types
    .map<DocumentNode>(type => {
      if (Array.isArray(type)) {
        type = mergeTypeDefs(type);
      }
      if (isSchema(type)) {
        return parse(printSchemaWithDirectives(type));
      } else if (isStringTypes(type) || isSourceTypes(type)) {
        return parse(type);
      }

      return type;
    })
    .map(ast => ast.definitions)
    .reduce((defs, newDef = []) => [...defs, ...newDef], []);

  // XXX: right now we don't handle multiple schema definitions
  let schemaDef: {
    query: string | null;
    mutation: string | null;
    subscription: string | null;
  } = allNodes.filter(isSchemaDefinition).reduce<any>(
    (def, node) => {
      node.operationTypes
        .filter(op => op.type.name.value)
        .forEach(op => {
          def[op.operation] = op.type.name.value;
        });

      return def;
    },
    {
      query: null,
      mutation: null,
      subscription: null,
    }
  );

  const mergedNodes: MergedResultMap = mergeGraphQLNodes(allNodes, config);
  const allTypes = Object.keys(mergedNodes);

  if (config && config.sort) {
    allTypes.sort(typeof config.sort === 'function' ? config.sort : undefined);
  }

  if (config && config.useSchemaDefinition) {
    const queryType = schemaDef.query ? schemaDef.query : allTypes.find(t => t === 'Query');
    const mutationType = schemaDef.mutation ? schemaDef.mutation : allTypes.find(t => t === 'Mutation');
    const subscriptionType = schemaDef.subscription ? schemaDef.subscription : allTypes.find(t => t === 'Subscription');
    schemaDef = {
      query: queryType,
      mutation: mutationType,
      subscription: subscriptionType,
    };
  }

  const schemaDefinition = createSchemaDefinition(schemaDef, {
    force: config.forceSchemaDefinition,
  });

  if (!schemaDefinition) {
    return Object.values(mergedNodes);
  }

  return [...Object.values(mergedNodes), parse(schemaDefinition).definitions[0]];
}
