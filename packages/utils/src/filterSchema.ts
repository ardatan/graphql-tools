import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
  GraphQLType,
  GraphQLSchema,
} from 'graphql';

import { MapperKind, FieldFilter, RootFieldFilter } from './Interfaces';

import { mapSchema } from './mapSchema';

export function filterSchema({
  schema,
  rootFieldFilter = () => true,
  typeFilter = () => true,
  fieldFilter = () => true,
}: {
  schema: GraphQLSchema;
  rootFieldFilter?: RootFieldFilter;
  typeFilter?: (typeName: string, type: GraphQLType) => boolean;
  fieldFilter?: (typeName: string, fieldName: string) => boolean;
}): GraphQLSchema {
  const filteredSchema: GraphQLSchema = mapSchema(schema, {
    [MapperKind.QUERY]: (type: GraphQLObjectType) => filterRootFields(type, 'Query', rootFieldFilter),
    [MapperKind.MUTATION]: (type: GraphQLObjectType) => filterRootFields(type, 'Mutation', rootFieldFilter),
    [MapperKind.SUBSCRIPTION]: (type: GraphQLObjectType) => filterRootFields(type, 'Subscription', rootFieldFilter),
    [MapperKind.OBJECT_TYPE]: (type: GraphQLObjectType) =>
      typeFilter(type.name, type) ? filterObjectFields(type, fieldFilter) : null,
    [MapperKind.INTERFACE_TYPE]: (type: GraphQLInterfaceType) => (typeFilter(type.name, type) ? undefined : null),
    [MapperKind.UNION_TYPE]: (type: GraphQLUnionType) => (typeFilter(type.name, type) ? undefined : null),
    [MapperKind.INPUT_OBJECT_TYPE]: (type: GraphQLInputObjectType) => (typeFilter(type.name, type) ? undefined : null),
    [MapperKind.ENUM_TYPE]: (type: GraphQLEnumType) => (typeFilter(type.name, type) ? undefined : null),
    [MapperKind.SCALAR_TYPE]: (type: GraphQLScalarType) => (typeFilter(type.name, type) ? undefined : null),
  });

  return filteredSchema;
}

function filterRootFields(
  type: GraphQLObjectType,
  operation: 'Query' | 'Mutation' | 'Subscription',
  rootFieldFilter: RootFieldFilter
): GraphQLObjectType {
  const config = type.toConfig();
  Object.keys(config.fields).forEach(fieldName => {
    if (!rootFieldFilter(operation, fieldName, config.fields[fieldName])) {
      delete config.fields[fieldName];
    }
  });
  return new GraphQLObjectType(config);
}

function filterObjectFields(type: GraphQLObjectType, fieldFilter: FieldFilter): GraphQLObjectType {
  const config = type.toConfig();
  Object.keys(config.fields).forEach(fieldName => {
    if (!fieldFilter(type.name, fieldName, config.fields[fieldName])) {
      delete config.fields[fieldName];
    }
  });
  return new GraphQLObjectType(config);
}
