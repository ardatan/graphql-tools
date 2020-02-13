import {
  GraphQLType,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLUnionType,
} from 'graphql';

import defaultMergedResolver from './defaultMergedResolver';
import resolveFromParentTypename from './resolveFromParentTypename';

export function makeMergedType(type: GraphQLType): void {
  if (type instanceof GraphQLObjectType) {
    type.isTypeOf = undefined;

    const fieldMap = type.getFields();
    Object.keys(fieldMap).forEach(fieldName => {
      fieldMap[fieldName].resolve = defaultMergedResolver;
      fieldMap[fieldName].subscribe = null;
    });
  } else if (
    type instanceof GraphQLInterfaceType ||
    type instanceof GraphQLUnionType
  ) {
    type.resolveType = parent => resolveFromParentTypename(parent);
  }
}
