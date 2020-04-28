import {
  GraphQLDirective,
  GraphQLObjectType,
  GraphQLNamedType,
  GraphQLSchema,
  GraphQLType,
  isDirective,
  isInterfaceType,
  isEnumType,
  isInputType,
  isNamedType,
  isObjectType,
  isScalarType,
  isUnionType,
} from 'graphql';

import { SchemaMapper, MapperKind, NamedTypeMapper, DirectiveMapper } from './Interfaces';

import { rewireTypes } from './rewire';

export function mapSchema(schema: GraphQLSchema, schemaMapper: SchemaMapper = {}): GraphQLSchema {
  const originalTypeMap = schema.getTypeMap();
  const newTypeMap = Object.create(null);
  Object.keys(originalTypeMap).forEach(typeName => {
    if (!typeName.startsWith('__')) {
      const typeMapper = getMapper(schema, schemaMapper, originalTypeMap[typeName]);

      if (typeMapper != null) {
        const newType = typeMapper(originalTypeMap[typeName], schema);
        newTypeMap[typeName] = newType !== undefined ? newType : originalTypeMap[typeName];
      } else {
        newTypeMap[typeName] = originalTypeMap[typeName];
      }
    }
  });

  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType();
  const subscriptionType = schema.getSubscriptionType();

  const newQueryTypeName =
    queryType != null ? (newTypeMap[queryType.name] != null ? newTypeMap[queryType.name].name : undefined) : undefined;
  const newMutationTypeName =
    mutationType != null
      ? newTypeMap[mutationType.name] != null
        ? newTypeMap[mutationType.name].name
        : undefined
      : undefined;
  const newSubscriptionTypeName =
    subscriptionType != null
      ? newTypeMap[subscriptionType.name] != null
        ? newTypeMap[subscriptionType.name].name
        : undefined
      : undefined;

  const originalDirectives = schema.getDirectives();
  const newDirectives: Array<GraphQLDirective> = [];
  originalDirectives.forEach(directive => {
    const directiveMapper = getMapper(schema, schemaMapper, directive);
    if (directiveMapper != null) {
      const newDirective = directiveMapper(directive, schema);
      if (newDirective != null) {
        newDirectives.push(newDirective);
      }
    } else {
      newDirectives.push(directive);
    }
  });

  const { typeMap, directives } = rewireTypes(newTypeMap, newDirectives);

  return new GraphQLSchema({
    ...schema.toConfig(),
    query: newQueryTypeName ? (typeMap[newQueryTypeName] as GraphQLObjectType) : undefined,
    mutation: newMutationTypeName ? (typeMap[newMutationTypeName] as GraphQLObjectType) : undefined,
    subscription: newSubscriptionTypeName != null ? (typeMap[newSubscriptionTypeName] as GraphQLObjectType) : undefined,
    types: Object.keys(typeMap).map(typeName => typeMap[typeName]),
    directives,
  });
}

function getTypeSpecifiers(type: GraphQLType, schema: GraphQLSchema): Array<MapperKind> {
  const specifiers = [MapperKind.TYPE];
  if (isObjectType(type)) {
    specifiers.push(MapperKind.COMPOSITE_TYPE, MapperKind.OBJECT_TYPE);
    const query = schema.getQueryType();
    const mutation = schema.getMutationType();
    const subscription = schema.getSubscriptionType();
    if (type === query) {
      specifiers.push(MapperKind.ROOT_OBJECT, MapperKind.QUERY);
    } else if (type === mutation) {
      specifiers.push(MapperKind.ROOT_OBJECT, MapperKind.MUTATION);
    } else if (type === subscription) {
      specifiers.push(MapperKind.ROOT_OBJECT, MapperKind.SUBSCRIPTION);
    }
  } else if (isInputType(type)) {
    specifiers.push(MapperKind.INPUT_OBJECT_TYPE);
  } else if (isInterfaceType(type)) {
    specifiers.push(MapperKind.COMPOSITE_TYPE, MapperKind.ABSTRACT_TYPE, MapperKind.INTERFACE_TYPE);
  } else if (isUnionType(type)) {
    specifiers.push(MapperKind.COMPOSITE_TYPE, MapperKind.ABSTRACT_TYPE, MapperKind.UNION_TYPE);
  } else if (isEnumType(type)) {
    specifiers.push(MapperKind.ENUM_TYPE);
  } else if (isScalarType(type)) {
    specifiers.push(MapperKind.SCALAR_TYPE);
  }

  return specifiers;
}

function getMapper(
  schema: GraphQLSchema,
  schemaMapper: SchemaMapper,
  typeOrDirective: GraphQLNamedType
): NamedTypeMapper | null;
function getMapper(
  schema: GraphQLSchema,
  schemaMapper: SchemaMapper,
  typeOrDirective: GraphQLDirective
): DirectiveMapper | null;
function getMapper(schema: GraphQLSchema, schemaMapper: SchemaMapper, typeOrDirective: any): any {
  if (isNamedType(typeOrDirective)) {
    const specifiers = getTypeSpecifiers(typeOrDirective, schema);
    let typeMapper: NamedTypeMapper | undefined;
    const stack = [...specifiers];
    while (!typeMapper && stack.length > 0) {
      const next = stack.pop();
      typeMapper = schemaMapper[next] as NamedTypeMapper;
    }

    return typeMapper != null ? typeMapper : null;
  } else if (isDirective(typeOrDirective)) {
    const directiveMapper = schemaMapper[MapperKind.DIRECTIVE];
    return directiveMapper != null ? directiveMapper : null;
  }
}
