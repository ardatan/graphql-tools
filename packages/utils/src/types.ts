import { GraphQLEnumType, GraphQLInputObjectType, GraphQLNamedType, GraphQLScalarType, visit } from 'graphql';

export interface SchemaPrintOptions {
  /**
   * Descriptions are defined as preceding string literals, however an older
   * experimental version of the SDL supported preceding comments as
   * descriptions. Set to true to enable this deprecated behavior.
   * This option is provided to ease adoption and will be removed in v16.
   *
   * Default: false
   */
  commentDescriptions?: boolean;
  assumeValid?: boolean;
}

export interface GetDocumentNodeFromSchemaOptions {
  pathToDirectivesInExtensions?: Array<string>;
}

export type PrintSchemaWithDirectivesOptions = SchemaPrintOptions & GetDocumentNodeFromSchemaOptions;

export type Maybe<T> = null | undefined | T;

export type Constructor<T> = new (...args: any[]) => T;

export type PruneSchemaFilter = (type: GraphQLNamedType) => boolean;

/**
 * Options for removing unused types from the schema
 */
export interface PruneSchemaOptions {
  /**
   * Return true to skip pruning this type. This check will run first before any other options.
   * This can be helpful for schemas that support type extensions like Apollo Federation.
   */
  skipPruning?: PruneSchemaFilter;

  /**
   * Set to `true` to skip pruning object types or interfaces with no no fields
   */
  skipEmptyCompositeTypePruning?: boolean;
  /**
   * Set to `true` to skip pruning interfaces that are not implemented by any
   * other types
   */
  skipUnimplementedInterfacesPruning?: boolean;
  /**
   * Set to `true` to skip pruning empty unions
   */
  skipEmptyUnionPruning?: boolean;
  /**
   * Set to `true` to skip pruning unused types
   */
  skipUnusedTypesPruning?: boolean;
}

export type InputLeafValueTransformer = (type: GraphQLEnumType | GraphQLScalarType, originalValue: any) => any;
export type InputObjectValueTransformer = (
  type: GraphQLInputObjectType,
  originalValue: Record<string, any>
) => Record<string, any>;

// GraphQL v14 doesn't have it. Remove this once we drop support for v14
export type ASTVisitorKeyMap = Partial<Parameters<typeof visit>[2]>;
