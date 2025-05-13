import { GraphQLNamedType, GraphQLObjectType } from 'graphql';
import { isObjectType } from './typeCheckers.js';
import { Maybe } from './types.js';

export function getObjectTypeFromTypeMap(
  typeMap: Record<string, GraphQLNamedType>,
  type: Maybe<GraphQLObjectType>,
): GraphQLObjectType | undefined {
  if (type) {
    const maybeObjectType = typeMap[type.name];
    if (isObjectType(maybeObjectType)) {
      return maybeObjectType;
    }
  }
}
