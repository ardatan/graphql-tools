import {
  DefinitionNode,
  DirectiveDefinitionNode,
  DocumentNode,
  isDefinitionNode,
  isSchema,
  Kind,
  OperationTypeDefinitionNode,
  OperationTypeNode,
  parse,
  ParseOptions,
} from 'graphql';
import {
  getDocumentNodeFromSchema,
  GetDocumentNodeFromSchemaOptions,
  isDocumentNode,
  printWithComments,
  resetComments,
  TypeSource,
} from '@graphql-tools/utils';
import { extractLinks, resolveImportName } from '../links.js';
import { OnFieldTypeConflict } from './fields.js';
import { mergeGraphQLNodes, schemaDefSymbol } from './merge-nodes.js';
import { DEFAULT_OPERATION_TYPE_NAME_MAP } from './schema-def.js';
import { CompareFn, defaultStringComparator, isSourceTypes, isStringTypes } from './utils.js';

type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

export interface Config extends ParseOptions, GetDocumentNodeFromSchemaOptions {
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
  /**
   * Allow directives that are not defined in the schema, but are imported
   * through federated @links, to be repeated.
   */
  repeatableLinkImports?: Set<string>;
  /**
   * Called if types of the same fields are different
   *
   * Default: false
   *
   * @example:
   * Given:
   * ```graphql
   *  type User { a: String }
   *  type User { a: Int }
   * ```
   *
   * Instead of throwing `already defined with a different type` error,
   * `onFieldTypeConflict` function is called.
   */
  onFieldTypeConflict?: OnFieldTypeConflict;
  reverseArguments?: boolean;
}

/**
 * Merges multiple type definitions into a single `DocumentNode`
 * @param types The type definitions to be merged
 */
export function mergeTypeDefs(typeSource: TypeSource): DocumentNode;
export function mergeTypeDefs(
  typeSource: TypeSource,
  config?: Partial<Config> & { commentDescriptions: true },
): string;
export function mergeTypeDefs(
  typeSource: TypeSource,
  config?: Omit<Partial<Config>, 'commentDescriptions'>,
): DocumentNode;
export function mergeTypeDefs(
  typeSource: TypeSource,
  config?: Partial<Config>,
): DocumentNode | string {
  resetComments();

  const doc: DocumentNode = {
    kind: Kind.DOCUMENT,
    definitions: mergeGraphQLTypes(typeSource, {
      useSchemaDefinition: true,
      forceSchemaDefinition: false,
      throwOnConflict: false,
      commentDescriptions: false,
      ...config,
    }),
  };

  let result: any;

  if (config?.commentDescriptions) {
    result = printWithComments(doc);
  } else {
    result = doc;
  }

  resetComments();

  return result;
}

function visitTypeSources(
  typeSource: TypeSource,
  options: ParseOptions & GetDocumentNodeFromSchemaOptions,
  allDirectives: DirectiveDefinitionNode[] = [],
  allNodes: DefinitionNode[] = [],
  visitedTypeSources = new Set<TypeSource>(),
  repeatableLinkImports: Set<string> = new Set(),
) {
  const addRepeatable = (name: string) => {
    repeatableLinkImports.add(name);
  };

  if (typeSource && !visitedTypeSources.has(typeSource)) {
    visitedTypeSources.add(typeSource);
    if (typeof typeSource === 'function') {
      visitTypeSources(
        typeSource(),
        options,
        allDirectives,
        allNodes,
        visitedTypeSources,
        repeatableLinkImports,
      );
    } else if (Array.isArray(typeSource)) {
      for (const type of typeSource) {
        visitTypeSources(
          type,
          options,
          allDirectives,
          allNodes,
          visitedTypeSources,
          repeatableLinkImports,
        );
      }
    } else if (isSchema(typeSource)) {
      const documentNode = getDocumentNodeFromSchema(typeSource, options);
      visitTypeSources(
        documentNode.definitions as DefinitionNode[],
        options,
        allDirectives,
        allNodes,
        visitedTypeSources,
        repeatableLinkImports,
      );
    } else if (isStringTypes(typeSource) || isSourceTypes(typeSource)) {
      const documentNode = parse(typeSource, options);
      visitTypeSources(
        documentNode.definitions as DefinitionNode[],
        options,
        allDirectives,
        allNodes,
        visitedTypeSources,
        repeatableLinkImports,
      );
    } else if (typeof typeSource === 'object' && isDefinitionNode(typeSource)) {
      const links = extractLinks({
        definitions: [typeSource],
        kind: Kind.DOCUMENT,
      });

      const federationUrl = 'https://specs.apollo.dev/federation';
      const linkUrl = 'https://specs.apollo.dev/link';

      /**
       * Official Federated imports are special because they can be referenced without specifyin the import.
       * To handle this case, we must prepare a list of all the possible valid usages to check against.
       * Note that this versioning is not technically correct, since some definitions are after v2.0.
       * But this is enough information to be comfortable not blocking the imports at this phase. It's
       * the job of the composer to validate the versions.
       * */
      const federationLink = links.find(l => l.url.identity === federationUrl);
      if (federationLink) {
        addRepeatable(resolveImportName(federationLink, '@composeDirective'));
        addRepeatable(resolveImportName(federationLink, '@key'));
      }
      const linkLink = links.find(l => l.url.identity === linkUrl);
      if (linkLink) {
        addRepeatable(resolveImportName(linkLink, '@link'));
      }

      if (typeSource.kind === Kind.DIRECTIVE_DEFINITION) {
        allDirectives.push(typeSource);
      } else {
        allNodes.push(typeSource);
      }
    } else if (isDocumentNode(typeSource)) {
      visitTypeSources(
        typeSource.definitions as DefinitionNode[],
        options,
        allDirectives,
        allNodes,
        visitedTypeSources,
        repeatableLinkImports,
      );
    } else {
      throw new Error(
        `typeDefs must contain only strings, documents, schemas, or functions, got ${typeof typeSource}`,
      );
    }
  }
  return { allDirectives, allNodes, repeatableLinkImports };
}

export function mergeGraphQLTypes(typeSource: TypeSource, config: Config): DefinitionNode[] {
  resetComments();

  const { allDirectives, allNodes, repeatableLinkImports } = visitTypeSources(typeSource, config);

  const mergedDirectives = mergeGraphQLNodes(allDirectives, config) as Record<
    string,
    DirectiveDefinitionNode
  >;

  config.repeatableLinkImports = repeatableLinkImports;

  const mergedNodes = mergeGraphQLNodes(allNodes, config, mergedDirectives);

  if (config?.useSchemaDefinition) {
    // XXX: right now we don't handle multiple schema definitions
    const schemaDef = mergedNodes[schemaDefSymbol] || {
      kind: Kind.SCHEMA_DEFINITION,
      operationTypes: [],
    };
    const operationTypes = schemaDef.operationTypes as OperationTypeDefinitionNode[];
    for (const opTypeDefNodeType in DEFAULT_OPERATION_TYPE_NAME_MAP) {
      const opTypeDefNode = operationTypes.find(
        operationType => operationType.operation === opTypeDefNodeType,
      );
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
          operation: 'query' as OperationTypeNode,
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
    mergedNodeDefinitions.sort((a: any, b: any) => sortFn(a.name?.value, b.name?.value));
  }

  return mergedNodeDefinitions;
}
