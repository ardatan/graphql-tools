import { GraphQLFieldResolver } from 'graphql';

import { mergeDeep, SchemaDirectiveVisitor, pruneSchema } from '@graphql-tools/utils';
import { addResolversToSchema } from './addResolversToSchema';

import { attachDirectiveResolvers } from './attachDirectiveResolvers';
import { assertResolversPresent } from './assertResolversPresent';
import { addSchemaLevelResolver } from './addSchemaLevelResolver';
import { buildSchemaFromTypeDefinitions } from './buildSchemaFromTypeDefinitions';
import { addErrorLoggingToSchema } from './addErrorLoggingToSchema';
import { addCatchUndefinedToSchema } from './addCatchUndefinedToSchema';
import { IExecutableSchemaDefinition } from './types';

/**
 * Builds a schema from the provided type definitions and resolvers.
 *
 * The type definitions are written using Schema Definition Language (SDL). They
 * can be provided as a string, a `DocumentNode`, a function, or an array of any
 * of these. If a function is provided, it will be passed no arguments and
 * should return an array of strings or `DocumentNode`s.
 *
 * Note: You can use `graphql-tag` to not only parse a string into a
 * `DocumentNode` but also to provide additinal syntax hightlighting in your
 * editor (with the appropriate editor plugin).
 *
 * ```js
 * const typeDefs = gql`
 *   type Query {
 *     posts: [Post]
 *     author(id: Int!): Author
 *   }
 * `;
 * ```
 *
 * The `resolvers` object should be a map of type names to nested object, which
 * themselves map the type's fields to their appropriate resolvers.
 * See the [Resolvers](/docs/resolvers) section of the documentation for more details.
 *
 * ```js
 * const resolvers = {
 *   Query: {
 *     posts: (obj, args, ctx, info) => getAllPosts(),
 *     author: (obj, args, ctx, info) => getAuthorById(args.id)
 *   }
 * };
 * ```
 *
 * Once you've defined both the `typeDefs` and `resolvers`, you can create your
 * schema:
 *
 * ```js
 * const schema = makeExecutableSchema({
 *   typeDefs,
 *   resolvers,
 * })
 * ```
 */
export function makeExecutableSchema<TContext = any>({
  typeDefs,
  resolvers = {},
  logger,
  allowUndefinedInResolve = true,
  resolverValidationOptions = {},
  directiveResolvers,
  schemaDirectives,
  schemaTransforms = [],
  parseOptions = {},
  inheritResolversFromInterfaces = false,
  pruningOptions,
}: IExecutableSchemaDefinition<TContext>) {
  // Validate and clean up arguments
  if (typeof resolverValidationOptions !== 'object') {
    throw new Error('Expected `resolverValidationOptions` to be an object');
  }

  if (!typeDefs) {
    throw new Error('Must provide typeDefs');
  }

  // We allow passing in an array of resolver maps, in which case we merge them
  const resolverMap: any = Array.isArray(resolvers) ? resolvers.reduce(mergeDeep, {}) : resolvers;

  // Arguments are now validated and cleaned up

  let schema = buildSchemaFromTypeDefinitions(typeDefs, parseOptions);

  schema = addResolversToSchema({
    schema,
    resolvers: resolverMap,
    resolverValidationOptions,
    inheritResolversFromInterfaces,
  });

  assertResolversPresent(schema, resolverValidationOptions);

  if (!allowUndefinedInResolve) {
    schema = addCatchUndefinedToSchema(schema);
  }

  if (logger != null) {
    schema = addErrorLoggingToSchema(schema, logger);
  }

  if (typeof resolvers['__schema'] === 'function') {
    // TODO a bit of a hack now, better rewrite generateSchema to attach it there.
    // not doing that now, because I'd have to rewrite a lot of tests.
    schema = addSchemaLevelResolver(schema, resolvers['__schema'] as GraphQLFieldResolver<any, any>);
  }

  schemaTransforms.forEach(schemaTransform => {
    schema = schemaTransform(schema);
  });

  // directive resolvers are implemented using SchemaDirectiveVisitor.visitSchemaDirectives
  // schema visiting modifies the schema in place
  if (directiveResolvers != null) {
    schema = attachDirectiveResolvers(schema, directiveResolvers);
  }

  if (schemaDirectives != null) {
    SchemaDirectiveVisitor.visitSchemaDirectives(schema, schemaDirectives);
  }

  return pruningOptions ? pruneSchema(schema, pruningOptions) : schema;
}
