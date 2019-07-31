import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
} from 'graphql';
import { GraphQLSchemaWithTransforms } from '../Interfaces';
import { visitSchema, VisitSchemaKind } from './visitSchema';
import { fieldToFieldConfig, createResolveType } from '../stitching/schemaRecreation';
import isEmptyObject from '../isEmptyObject';

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
  typeFilter?: (typeName: string) => boolean;
  fieldFilter?: (typeName: string, fieldName: string) => boolean;
}): GraphQLSchemaWithTransforms {
  const filteredSchema: GraphQLSchemaWithTransforms = visitSchema(schema, {
    [VisitSchemaKind.QUERY]: (type: GraphQLObjectType) => {
      return rootFieldFilter ? filterRootFields(type, 'Query', rootFieldFilter) : undefined;
    },
    [VisitSchemaKind.MUTATION]: (type: GraphQLObjectType) => {
      return rootFieldFilter ? filterRootFields(type, 'Mutation', rootFieldFilter) : undefined;
    },
    [VisitSchemaKind.SUBSCRIPTION]: (type: GraphQLObjectType) => {
      return rootFieldFilter ? filterRootFields(type, 'Subscription', rootFieldFilter) : undefined;
    },
    [VisitSchemaKind.OBJECT_TYPE]: (type: GraphQLObjectType) => {
      return (!typeFilter || typeFilter(type.name)) ?
        (filterObjectFields ?
          filterObjectFields(type, fieldFilter) :
          undefined) :
        null;
    },
    [VisitSchemaKind.INTERFACE_TYPE]: (type: GraphQLInterfaceType) => {
      return (!typeFilter || typeFilter(type.name)) ? undefined : null;
    },
    [VisitSchemaKind.UNION_TYPE]: (type: GraphQLUnionType) => {
      return (!typeFilter || typeFilter(type.name)) ? undefined : null;
    },
    [VisitSchemaKind.INPUT_OBJECT_TYPE]: (type: GraphQLInputObjectType) => {
      return (!typeFilter || typeFilter(type.name)) ? undefined : null;
    },
    [VisitSchemaKind.ENUM_TYPE]: (type: GraphQLEnumType) => {
      return (!typeFilter || typeFilter(type.name)) ? undefined : null;
    },
    [VisitSchemaKind.SCALAR_TYPE]: (type: GraphQLScalarType) => {
      return (!typeFilter || typeFilter(type.name)) ? undefined : null;
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
  const resolveType = createResolveType((_, t) => t);
  const fields = type.getFields();
  const newFields = {};
  Object.keys(fields).forEach(fieldName => {
    if (rootFieldFilter(operation, fieldName)) {
      newFields[fieldName] = fieldToFieldConfig(fields[fieldName], resolveType, true);
    }
  });
  if (isEmptyObject(newFields)) {
    return null;
  } else {
    return new GraphQLObjectType({
      name: type.name,
      description: type.description,
      astNode: type.astNode,
      fields: newFields,
    });
  }
}

function filterObjectFields(
  type: GraphQLObjectType,
  fieldFilter: FieldFilter,
): GraphQLObjectType {
  const resolveType = createResolveType((_, t) => t);
  const fields = type.getFields();
  const interfaces = type.getInterfaces();
  const newFields = {};
  Object.keys(fields).forEach(fieldName => {
    if (fieldFilter(type.name, fieldName)) {
      newFields[fieldName] = fieldToFieldConfig(fields[fieldName], resolveType, true);
    }
  });
  if (isEmptyObject(newFields)) {
    return null;
  } else {
    return new GraphQLObjectType({
      name: type.name,
      description: type.description,
      astNode: type.astNode,
      isTypeOf: type.isTypeOf,
      fields: newFields,
      interfaces: () => interfaces.map(iface => resolveType(iface)),
    });
  }
}
