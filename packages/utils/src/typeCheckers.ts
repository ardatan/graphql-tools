import type {
  GraphQLAbstractType,
  GraphQLCompositeType,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLInterfaceType,
  GraphQLLeafType,
  GraphQLList,
  GraphQLNamedInputType,
  GraphQLNamedOutputType,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLNullableType,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLType,
  GraphQLUnionType,
} from 'graphql';
import type { Maybe } from './types.js';

export function isAbstractType(type: any): type is GraphQLAbstractType {
  return isUnionType(type) || isInterfaceType(type);
}

export function isInterfaceType(type: any): type is GraphQLInterfaceType {
  return type?.[Symbol.toStringTag] === 'GraphQLInterfaceType';
}

export function isUnionType(type: any): type is GraphQLUnionType {
  return type?.[Symbol.toStringTag] === 'GraphQLUnionType';
}

export function isObjectType(type: any): type is GraphQLObjectType {
  return type?.[Symbol.toStringTag] === 'GraphQLObjectType';
}

export function isLeafType(type: any): type is GraphQLLeafType {
  return isEnumType(type) || isScalarType(type);
}

export function isEnumType(type: any): type is GraphQLEnumType {
  return type?.[Symbol.toStringTag] === 'GraphQLEnumType';
}

export function isScalarType(type: any): type is GraphQLScalarType {
  return type?.[Symbol.toStringTag] === 'GraphQLScalarType';
}

export function isInputObjectType(type: any): type is GraphQLInputObjectType {
  return type?.[Symbol.toStringTag] === 'GraphQLInputObjectType';
}

export function isNullableType(type: any): type is GraphQLNullableType {
  return type?.[Symbol.toStringTag] !== 'GraphQLNonNull';
}

export function isNonNullType<T extends GraphQLType>(
  type: T | GraphQLNonNull<T>,
): type is GraphQLNonNull<T> {
  return type?.[Symbol.toStringTag] === 'GraphQLNonNull';
}

export function isCompositeType(type: any): type is GraphQLCompositeType {
  return isObjectType(type) || isInterfaceType(type) || isUnionType(type);
}

export function isListType<T extends GraphQLType>(
  type: T | GraphQLList<T>,
): type is GraphQLList<T> {
  return type?.[Symbol.toStringTag] === 'GraphQLList';
}

export function isNamedType(
  type: any,
): type is
  | GraphQLObjectType
  | GraphQLInterfaceType
  | GraphQLUnionType
  | GraphQLScalarType
  | GraphQLInputObjectType {
  return type?.name != null;
}

export function isOutputType(type: any): type is GraphQLOutputType {
  const namedType = getNamedType(type);
  return (
    isScalarType(namedType) ||
    isObjectType(namedType) ||
    isInterfaceType(namedType) ||
    isUnionType(namedType) ||
    isEnumType(namedType)
  );
}
export function getNamedType(type: undefined | null): void;
export function getNamedType(type: GraphQLInputType): GraphQLNamedInputType;
export function getNamedType(type: GraphQLOutputType): GraphQLNamedOutputType;
export function getNamedType(type: GraphQLType): GraphQLNamedType;
export function getNamedType(type: Maybe<GraphQLType>): GraphQLNamedType | undefined;
export function getNamedType<T extends GraphQLNamedType>(
  type: T | GraphQLList<T> | GraphQLNonNull<T>,
): GraphQLNamedType {
  if (type != null) {
    if (isNonNullType(type)) {
      return getNamedType(type.ofType);
    }
    if (isListType(type)) {
      return getNamedType(type.ofType);
    }
  }
  return type;
}

export function isInputType(type: any): type is GraphQLInputType {
  const namedType = getNamedType(type);
  return isScalarType(namedType) || isEnumType(namedType) || isInputObjectType(namedType);
}

export function isSpecifiedScalarType(type: any) {
  const typeName = type?.name;
  return (
    typeName === 'String' ||
    typeName === 'Int' ||
    typeName === 'Float' ||
    typeName === 'Boolean' ||
    typeName === 'ID'
  );
}

export function isDirective(type: any): type is GraphQLDirective {
  return type?.[Symbol.toStringTag] === 'GraphQLDirective';
}

export function isIntrospectionType(type: any) {
  return type?.name?.startsWith('__');
}

export function isSpecifiedDirective(type: any) {
  return (
    type?.name === 'skip' ||
    type?.name === 'include' ||
    type?.name === 'deprecated' ||
    type?.name === 'specifiedBy' ||
    type?.name === 'defer' ||
    type?.name === 'stream' ||
    type?.name === 'oneOf'
  );
}

export function isSchema(type: any): type is GraphQLSchema {
  return type?.[Symbol.toStringTag] === 'GraphQLSchema';
}

export function getNullableType<T extends GraphQLNullableType>(type: GraphQLNonNull<T> | T): T {
  if (isNonNullType(type)) {
    return type.ofType;
  }
  return type;
}
