import { GraphQLInterfaceType, GraphQLUnionType, GraphQLSchema } from 'graphql';

import { SchemaError } from '.';

// If we have any union or interface types throw if no there is no resolveType or isTypeOf resolvers
function checkForResolveTypeResolver(
  schema: GraphQLSchema,
  requireResolversForResolveType?: boolean,
) {
  Object.keys(schema.getTypeMap())
    .map(typeName => schema.getType(typeName))
    .forEach((type: GraphQLUnionType | GraphQLInterfaceType) => {
      if (
        !(
          type instanceof GraphQLUnionType ||
          type instanceof GraphQLInterfaceType
        )
      ) {
        return;
      }
      if (!type.resolveType) {
        if (requireResolversForResolveType === false) {
          return;
        }
        if (requireResolversForResolveType === true) {
          throw new SchemaError(
            `Type "${type.name}" is missing a "resolveType" resolver`,
          );
        }
        // tslint:disable-next-line:max-line-length
        console.warn(
          `Type "${
            type.name
          }" is missing a "resolveType" resolver. Pass false into `  +
          `"resolverValidationOptions.requireResolversForResolveType" to disable this warning.`,
        );
      }
    });
}
export default checkForResolveTypeResolver;
