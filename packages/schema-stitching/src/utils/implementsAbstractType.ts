import { GraphQLType, GraphQLSchema, doTypesOverlap, isCompositeType } from 'graphql';

export default function implementsAbstractType(schema: GraphQLSchema, typeA: GraphQLType, typeB: GraphQLType) {
  if (typeA === typeB) {
    return true;
  } else if (isCompositeType(typeA) && isCompositeType(typeB)) {
    return doTypesOverlap(schema, typeA, typeB);
  }

  return false;
}
