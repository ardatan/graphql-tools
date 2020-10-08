import { GraphQLSchema } from 'graphql';

import { MapperKind, mapSchema } from '@graphql-tools/utils';

// If we have any union or interface types throw if no there is no resolveType resolver
export function checkForResolveTypeResolver(schema: GraphQLSchema, requireResolversForResolveType?: boolean) {
  mapSchema(schema, {
    [MapperKind.ABSTRACT_TYPE]: type => {
      if (!type.resolveType && requireResolversForResolveType) {
        throw new Error(
          `Type "${type.name}" is missing a "__resolveType" resolver. Pass false into ` +
            '"resolverValidationOptions.requireResolversForResolveType" to disable this error.'
        );
      }
      return undefined;
    },
  });
}
