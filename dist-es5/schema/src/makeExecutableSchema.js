import { __assign } from "tslib";
import { buildASTSchema, buildSchema, isSchema } from 'graphql';
import { asArray, pruneSchema } from '@graphql-tools/utils';
import { addResolversToSchema } from './addResolversToSchema';
import { assertResolversPresent } from './assertResolversPresent';
import { applyExtensions, mergeExtensions, mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge';
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
export function makeExecutableSchema(_a) {
    var typeDefs = _a.typeDefs, _b = _a.resolvers, resolvers = _b === void 0 ? {} : _b, _c = _a.resolverValidationOptions, resolverValidationOptions = _c === void 0 ? {} : _c, _d = _a.parseOptions, parseOptions = _d === void 0 ? {} : _d, _e = _a.inheritResolversFromInterfaces, inheritResolversFromInterfaces = _e === void 0 ? false : _e, pruningOptions = _a.pruningOptions, _f = _a.updateResolversInPlace, updateResolversInPlace = _f === void 0 ? false : _f, schemaExtensions = _a.schemaExtensions;
    // Validate and clean up arguments
    if (typeof resolverValidationOptions !== 'object') {
        throw new Error('Expected `resolverValidationOptions` to be an object');
    }
    if (!typeDefs) {
        throw new Error('Must provide typeDefs');
    }
    var schema;
    if (isSchema(typeDefs)) {
        schema = typeDefs;
    }
    else if (parseOptions === null || parseOptions === void 0 ? void 0 : parseOptions.commentDescriptions) {
        var mergedTypeDefs = mergeTypeDefs(typeDefs, __assign(__assign({}, parseOptions), { commentDescriptions: true }));
        schema = buildSchema(mergedTypeDefs, parseOptions);
    }
    else {
        var mergedTypeDefs = mergeTypeDefs(typeDefs, parseOptions);
        schema = buildASTSchema(mergedTypeDefs, parseOptions);
    }
    if (pruningOptions) {
        schema = pruneSchema(schema);
    }
    // We allow passing in an array of resolver maps, in which case we merge them
    schema = addResolversToSchema({
        schema: schema,
        resolvers: mergeResolvers(resolvers),
        resolverValidationOptions: resolverValidationOptions,
        inheritResolversFromInterfaces: inheritResolversFromInterfaces,
        updateResolversInPlace: updateResolversInPlace,
    });
    if (Object.keys(resolverValidationOptions).length > 0) {
        assertResolversPresent(schema, resolverValidationOptions);
    }
    if (schemaExtensions) {
        schemaExtensions = mergeExtensions(asArray(schemaExtensions));
        applyExtensions(schema, schemaExtensions);
    }
    return schema;
}
