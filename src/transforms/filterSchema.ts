import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
  GraphQLType,
} from 'graphql';
import { GraphQLSchemaWithTransforms, VisitSchemaKind } from '../Interfaces';
import { visitSchema } from '../utils/visitSchema';
import { cloneSchema } from '../utils/clone';

export type RootFieldFilter = (
  operation: 'Query' | 'Mutation' | 'Subscription',
  rootFieldName: string
) => boolean;

export type FieldFilter = (
  typeName: string,
  rootFieldName: string
) => boolean;

export default function filterSchema({
  schema,
  rootFieldFilter = () => true,
  typeFilter = () => true,
  fieldFilter = () => true,
}: {
  schema: GraphQLSchemaWithTransforms;
  rootFieldFilter?: RootFieldFilter;
  typeFilter?: (typeName: string, type: GraphQLType) => boolean;
  fieldFilter?: (typeName: string, fieldName: string) => boolean;
}): GraphQLSchemaWithTransforms {
  const filteredSchema: GraphQLSchemaWithTransforms = visitSchema(cloneSchema(schema), {
    [VisitSchemaKind.QUERY]: (type: GraphQLObjectType) => {
      return filterRootFields(type, 'Query', rootFieldFilter);
    },
    [VisitSchemaKind.MUTATION]: (type: GraphQLObjectType) => {
      return filterRootFields(type, 'Mutation', rootFieldFilter);
    },
    [VisitSchemaKind.SUBSCRIPTION]: (type: GraphQLObjectType) => {
      return filterRootFields(type, 'Subscription', rootFieldFilter);
    },
    [VisitSchemaKind.OBJECT_TYPE]: (type: GraphQLObjectType) => {
      return (typeFilter(type.name, type)) ?
        filterObjectFields(type, fieldFilter) :
        null;
    },
    [VisitSchemaKind.INTERFACE_TYPE]: (type: GraphQLInterfaceType) => {
      return typeFilter(type.name, type) ? undefined : null;
    },
    [VisitSchemaKind.UNION_TYPE]: (type: GraphQLUnionType) => {
      return typeFilter(type.name, type) ? undefined : null;
    },
    [VisitSchemaKind.INPUT_OBJECT_TYPE]: (type: GraphQLInputObjectType) => {
      return typeFilter(type.name, type) ? undefined : null;
    },
    [VisitSchemaKind.ENUM_TYPE]: (type: GraphQLEnumType) => {
      return typeFilter(type.name, type) ? undefined : null;
    },
    [VisitSchemaKind.SCALAR_TYPE]: (type: GraphQLScalarType) => {
      return typeFilter(type.name, type) ? undefined : null;
    },
  });

  filteredSchema.transforms = schema.transforms;

  return filteredSchema;
}

function filterRootFields(
  type: GraphQLObjectType,
  operation: 'Query' | 'Mutation' | 'Subscription',
  rootFieldFilter: RootFieldFilter,
): GraphQLObjectType {
  const config = type.toConfig();
  Object.keys(config.fields).forEach(fieldName => {
    if (!rootFieldFilter(operation, fieldName)) {
      delete config.fields[fieldName];
    }
  });
  return new GraphQLObjectType(config);
}

function filterObjectFields(
  type: GraphQLObjectType,
  fieldFilter: FieldFilter,
): GraphQLObjectType {
  const config = type.toConfig();
  Object.keys(config.fields).forEach(fieldName => {
    if (!fieldFilter(type.name, fieldName)) {
      delete config.fields[fieldName];
    }
  });
  return new GraphQLObjectType(config);
}
