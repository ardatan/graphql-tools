import { BuildSchemaOptions, GraphQLFieldResolver, GraphQLSchema } from 'graphql';
import { OnFieldTypeConflict } from '@graphql-tools/merge';
import {
  GraphQLParseOptions,
  IResolvers,
  IResolverValidationOptions,
  SchemaExtensions,
  TypeSource,
} from '@graphql-tools/utils';

export interface GraphQLSchemaWithContext<TContext> extends GraphQLSchema {
  __context?: TContext;
}

/**
 * Configuration object for creating an executable schema
 */
export interface IExecutableSchemaDefinition<TContext = any>
  extends BuildSchemaOptions, GraphQLParseOptions {
  /**
   * The type definitions used to create the schema
   */
  typeDefs: TypeSource;
  /**
   * Object describing the field resolvers for the provided type definitions
   */
  resolvers?: IResolvers<any, TContext> | Array<IResolvers<any, TContext>>;
  /**
   * Additional options for validating the provided resolvers
   */
  resolverValidationOptions?: IResolverValidationOptions;
  /**
   * GraphQL object types that implement interfaces will inherit any missing
   * resolvers from their interface types defined in the `resolvers` object
   */
  inheritResolversFromInterfaces?: boolean;
  /**
   * Do not create a schema again and use the one from `buildASTSchema`
   */
  updateResolversInPlace?: boolean;
  /**
   * Schema extensions
   */
  schemaExtensions?: SchemaExtensions | Array<SchemaExtensions>;
  /**
   * Default field resolver
   */
  defaultFieldResolver?: GraphQLFieldResolver<any, TContext>;
  /**
   * Called when two fields share a name and field conflicts are not ignored,
   * even if their types already match. Return the field node that should win.
   * `makeExecutableSchema` and `mergeSchemas` forward this to `mergeTypeDefs`.
   *
   * @example
   * Given:
   * ```graphql
   * type Post { content: String! }
   * type Post { content: String }
   * ```
   *
   * `onFieldTypeConflict: (_existing, incoming) => incoming` keeps `content: String`.
   * Fields that exist on only one schema are still kept.
   */
  onFieldTypeConflict?: OnFieldTypeConflict;
  /**
   * Reverse argument merge order when combining field arguments.
   * Use with `onFieldTypeConflict: (existing) => existing` to keep earlier
   * argument types while still adding new arguments from the incoming field.
   */
  reverseArguments?: boolean;
}
