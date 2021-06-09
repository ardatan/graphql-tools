import { GraphQLFieldResolver } from 'graphql';

import { mergeDeep, SchemaDirectiveVisitor, pruneSchema } from '@graphql-tools/utils';
import { addResolversToSchema } from './addResolversToSchema';

import { attachDirectiveResolvers } from './attachDirectiveResolvers';
import { assertResolversPresent } from './assertResolversPresent';
import { addSchemaLevelResolver } from './addSchemaLevelResolver';
import { buildSchemaFromTypeDefinitions } from './buildSchemaFromTypeDefinitions';
import { addErrorLoggingToSchema } from './addErrorLoggingToSchema';
import { addCatchUndefinedToSchema } from './addCatchUndefinedToSchema';
import { ExecutableSchemaTransformation, IExecutableSchemaDefinition } from './types';

/**
 * Builds a schema from the provided type definitions and resolvers.
 *
 * The type definitions are written using Schema Definition Language (SDL). They
 * can be provided as a string, a `DocumentNode`, a function, or an array of any
 * of these. If a function is provided, it will be passed no arguments and
 * should return an array of strings or `DocumentNode`s.
 *
 * Note: You can use `graphql-tag` to not only parse a string into a
 * `DocumentNode` but also to provide additional syntax highlighting in your
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
  schemaTransforms: userProvidedSchemaTransforms,
  parseOptions = {},
  inheritResolversFromInterfaces = false,
  pruningOptions,
  updateResolversInPlace = false,
  noExtensionExtraction = false,
  assumeValidSchema = false,
}: IExecutableSchemaDefinition<TContext>) {
  // Validate and clean up arguments
  if (typeof resolverValidationOptions !== 'object') {
    throw new Error('Expected `resolverValidationOptions` to be an object');
  }

  if (!typeDefs) {
    throw new Error('Must provide typeDefs');
  }

  // Arguments are now validated and cleaned up
  const schemaTransforms: ExecutableSchemaTransformation[] = [
    schema => {
      // We allow passing in an array of resolver maps, in which case we merge them
      const resolverMap: any = Array.isArray(resolvers) ? resolvers.reduce(mergeDeep, {}) : resolvers;

      const schemaWithResolvers = addResolversToSchema({
        schema,
        resolvers: resolverMap,
        resolverValidationOptions,
        inheritResolversFromInterfaces,
        updateResolversInPlace,
      });

      if (
        Object.keys(resolverValidationOptions).length > 0 &&
        Object.values(resolverValidationOptions).some(o => o !== 'ignore')
      ) {
        assertResolversPresent(schemaWithResolvers, resolverValidationOptions);
      }

      return schemaWithResolvers;
    },
  ];

  if (!allowUndefinedInResolve) {
    schemaTransforms.push(addCatchUndefinedToSchema);
  }

  if (logger != null) {
    schemaTransforms.push(schema => addErrorLoggingToSchema(schema, logger));
  }

  if (typeof resolvers['__schema'] === 'function') {
    // TODO a bit of a hack now, better rewrite generateSchema to attach it there.
    // not doing that now, because I'd have to rewrite a lot of tests.
    schemaTransforms.push(schema =>
      addSchemaLevelResolver(schema, resolvers['__schema'] as GraphQLFieldResolver<any, any>)
    );
  }

  if (userProvidedSchemaTransforms) {
    schemaTransforms.push(schema =>
      userProvidedSchemaTransforms.reduce((s, schemaTransform) => schemaTransform(s), schema)
    );
  }

  // directive resolvers are implemented using SchemaDirectiveVisitor.visitSchemaDirectives
  // schema visiting modifies the schema in place
  if (directiveResolvers != null) {
    schemaTransforms.push(schema => attachDirectiveResolvers(schema, directiveResolvers));
  }

  if (schemaDirectives != null) {
    schemaTransforms.push(schema => {
      SchemaDirectiveVisitor.visitSchemaDirectives(schema, schemaDirectives);
      return schema;
    });
  }

  if (pruningOptions) {
    schemaTransforms.push(pruneSchema);
  }

  const schemaFromTypeDefs = buildSchemaFromTypeDefinitions(
    typeDefs,
    parseOptions,
    noExtensionExtraction,
    assumeValidSchema
  );

  return schemaTransforms.reduce((schema, schemaTransform) => schemaTransform(schema), schemaFromTypeDefs);
}
