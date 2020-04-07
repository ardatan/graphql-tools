import { GraphQLType, isAbstractType, isObjectType } from 'graphql';

import defaultMergedResolver from './defaultMergedResolver';
import resolveFromParentTypename from './resolveFromParentTypename';

export function makeMergedType(type: GraphQLType): void {
  if (isObjectType(type)) {
    type.isTypeOf = undefined;

    const fieldMap = type.getFields();
    Object.keys(fieldMap).forEach((fieldName) => {
      fieldMap[fieldName].resolve = defaultMergedResolver;
      fieldMap[fieldName].subscribe = null;
    });
  } else if (isAbstractType(type)) {
    type.resolveType = (parent) => resolveFromParentTypename(parent);
  }
}
