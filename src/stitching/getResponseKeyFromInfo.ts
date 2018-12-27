import { GraphQLResolveInfo } from 'graphql';

/**
 * Get the key under which the result of this resolver will be placed in the response JSON.
 * Resolves aliases and tries to get the original AST name for the field, in case it was renamed.
 * @param info The info argument to the resolver.
 */
export function getResponseKeyFromInfo(info: GraphQLResolveInfo) {
  let fieldName = info.fieldNodes[0].alias ? info.fieldNodes[0].alias.value : info.fieldName;
  const field = info.parentType.getFields()[fieldName];
  if (field && field.astNode) {
    fieldName = field.astNode.name.value;
  }
  return fieldName;
}
