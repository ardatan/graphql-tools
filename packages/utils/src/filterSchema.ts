import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
  GraphQLSchema,
} from 'graphql';

import { MapperKind, FieldFilter, InputFieldFilter, RootFieldFilter, TypeFilter, ArgumentFilter } from './Interfaces';

import { mapSchema } from './mapSchema';

import { Constructor } from './types';

export function filterSchema({
  schema,
  rootFieldFilter = () => true,
  typeFilter = () => true,
  fieldFilter = undefined,
  objectFieldFilter = undefined,
  interfaceFieldFilter = undefined,
  inputObjectFieldFilter = undefined,
  argFilter = undefined,
}: {
  schema: GraphQLSchema;
  rootFieldFilter?: RootFieldFilter;
  typeFilter?: TypeFilter;
  fieldFilter?: FieldFilter;
  objectFieldFilter?: FieldFilter;
  interfaceFieldFilter?: FieldFilter;
  inputObjectFieldFilter?: FieldFilter;
  argFilter?: ArgumentFilter;
}): GraphQLSchema {
  const filteredSchema: GraphQLSchema = mapSchema(schema, {
    [MapperKind.QUERY]: (type: GraphQLObjectType) => filterRootFields(type, 'Query', rootFieldFilter),
    [MapperKind.MUTATION]: (type: GraphQLObjectType) => filterRootFields(type, 'Mutation', rootFieldFilter),
    [MapperKind.SUBSCRIPTION]: (type: GraphQLObjectType) => filterRootFields(type, 'Subscription', rootFieldFilter),
    [MapperKind.OBJECT_TYPE]: (type: GraphQLObjectType) =>
      typeFilter(type.name, type)
        ? filterElementFields<GraphQLObjectType>(GraphQLObjectType, type, objectFieldFilter || fieldFilter, argFilter)
        : null,
    [MapperKind.INTERFACE_TYPE]: (type: GraphQLInterfaceType) =>
      typeFilter(type.name, type)
        ? filterElementFields<GraphQLInterfaceType>(
            GraphQLInterfaceType,
            type,
            interfaceFieldFilter || fieldFilter,
            argFilter
          )
        : null,
    [MapperKind.INPUT_OBJECT_TYPE]: (type: GraphQLInputObjectType) =>
      typeFilter(type.name, type)
        ? filterElementFields<GraphQLInputObjectType>(
            GraphQLInputObjectType,
            type,
            inputObjectFieldFilter || fieldFilter
          )
        : null,
    [MapperKind.UNION_TYPE]: (type: GraphQLUnionType) => (typeFilter(type.name, type) ? undefined : null),
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

function filterElementFields<ElementType>(
  ElementConstructor: Constructor<ElementType>,
  type: GraphQLObjectType | GraphQLInterfaceType | GraphQLInputObjectType,
  fieldFilter?: FieldFilter | InputFieldFilter,
  argFilter?: ArgumentFilter
): ElementType | undefined {
  if (!fieldFilter && !argFilter) {
    return undefined;
  } else if (!fieldFilter && argFilter) {
    fieldFilter = () => true;
  }

  const config = type.toConfig();
  Object.keys(config.fields).forEach(fieldName => {
    if (!fieldFilter(type.name, fieldName, config.fields[fieldName])) {
      delete config.fields[fieldName];
    }
  });

  // for (const [fieldName, field] of Object.entries(config.fields)) {
  //   if (!fieldFilter(type.name, fieldName, config.fields[fieldName])) {
  //     delete config.fields[fieldName];

  //   } else if (argFilter && 'args' in field) {
  //     for (const argName of Object.keys(field.args)) {
  //       if (!argFilter(type.name, fieldName, argName, field.args[argName])) {
  //         delete field.args[argName];
  //       }
  //     }
  //   }
  // }
  return new ElementConstructor(config);
}
