import { GraphQLResolveInfo } from '@graphql-tools/graphql';

/**
 * Get the key under which the result of this resolver will be placed in the response JSON. Basically, just
 * resolves aliases.
 * @param info The info argument to the resolver.
 */
export function getResponseKeyFromInfo(info: GraphQLResolveInfo) {
  return info.fieldNodes[0].alias != null ? info.fieldNodes[0].alias.value : info.fieldName;
}
