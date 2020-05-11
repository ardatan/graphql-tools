import {
  GraphQLDirective,
  GraphQLObjectType,
  GraphQLNamedType,
  GraphQLSchema,
  GraphQLType,
  isInterfaceType,
  isEnumType,
  isObjectType,
  isScalarType,
  isUnionType,
  isInputObjectType,
  GraphQLFieldConfig,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLInputFieldConfig,
  GraphQLObjectTypeConfig,
  GraphQLInterfaceTypeConfig,
  GraphQLInputObjectTypeConfig,
  isLeafType,
  isListType,
  isNonNullType,
  isNamedType,
  GraphQLList,
  GraphQLNonNull,
} from 'graphql';

import {
  SchemaMapper,
  MapperKind,
  TypeMap,
  NamedTypeMapper,
  DirectiveMapper,
  GenericFieldMapper,
  IDefaultValueIteratorFn,
} from './Interfaces';

import { rewireTypes } from './rewire';
import { serializeInputValue, parseInputValue } from './transformInputValue';

export function mapSchema(schema: GraphQLSchema, schemaMapper: SchemaMapper = {}): GraphQLSchema {
  const originalTypeMap = schema.getTypeMap();

  let newTypeMap = mapDefaultValues(originalTypeMap, schema, serializeInputValue);
  newTypeMap = mapTypes(newTypeMap, schema, schemaMapper, type => isLeafType(type));
  newTypeMap = mapDefaultValues(newTypeMap, schema, parseInputValue);

  newTypeMap = mapTypes(newTypeMap, schema, schemaMapper, type => !isLeafType(type));
  newTypeMap = mapFields(newTypeMap, schema, schemaMapper);

  const originalDirectives = schema.getDirectives();
  const newDirectives = mapDirectives(originalDirectives, schema, schemaMapper);

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

function mapTypes(
  originalTypeMap: TypeMap,
  schema: GraphQLSchema,
  schemaMapper: SchemaMapper,
  testFn: (originalType: GraphQLNamedType) => boolean = () => true
): TypeMap {
  const newTypeMap = {};

  Object.keys(originalTypeMap).forEach(typeName => {
    if (!typeName.startsWith('__')) {
      const originalType = originalTypeMap[typeName];
      if (originalType != null && testFn(originalType)) {
        const typeMapper = getTypeMapper(schema, schemaMapper, typeName);

        if (typeMapper != null) {
          const maybeNewType = typeMapper(originalType, schema);
          newTypeMap[typeName] = maybeNewType !== undefined ? maybeNewType : originalType;
        } else {
          newTypeMap[typeName] = originalType;
        }
      } else {
        newTypeMap[typeName] = originalType;
      }
    }
  });

  return newTypeMap;
}

function mapDefaultValues(typeMap: TypeMap, schema: GraphQLSchema, fn: IDefaultValueIteratorFn): TypeMap {
  return mapFields(typeMap, schema, {
    [MapperKind.OBJECT_FIELD]: fieldConfig => {
      const originalArgumentConfigMap = fieldConfig.args;

      if (originalArgumentConfigMap == null) {
        return fieldConfig;
      }

      const argNames = Object.keys(originalArgumentConfigMap);
      if (!argNames.length) {
        return fieldConfig;
      }

      const newArgumentConfigMap = {};
      Object.keys(originalArgumentConfigMap).forEach(argName => {
        const originalArgument = originalArgumentConfigMap[argName];
        if (originalArgument === undefined) {
          newArgumentConfigMap[argName] = originalArgument;
        } else {
          const maybeNewType = getNewType(typeMap, originalArgument.type);
          if (maybeNewType == null) {
            newArgumentConfigMap[argName] = originalArgument;
          } else {
            newArgumentConfigMap[argName] = {
              ...originalArgument,
              defaultValue: fn(maybeNewType, originalArgument.defaultValue),
            };
          }
        }
      });

      return {
        ...fieldConfig,
        args: newArgumentConfigMap,
      };
    },
    [MapperKind.INPUT_OBJECT_FIELD]: inputFieldConfig => {
      if (inputFieldConfig.defaultValue === undefined) {
        return inputFieldConfig;
      } else {
        const maybeNewType = getNewType(typeMap, inputFieldConfig.type);
        if (maybeNewType == null) {
          return inputFieldConfig;
        } else {
          return {
            ...inputFieldConfig,
            defaultValue: fn(maybeNewType, inputFieldConfig.defaultValue),
          };
        }
      }
    },
  });
}

function getNewType<T extends GraphQLType>(newTypeMap: TypeMap, type: T): T | null {
  if (isListType(type)) {
    const newType = getNewType(newTypeMap, type.ofType);
    return newType != null ? (new GraphQLList(newType) as T) : null;
  } else if (isNonNullType(type)) {
    const newType = getNewType(newTypeMap, type.ofType);
    return newType != null ? (new GraphQLNonNull(newType) as T) : null;
  } else if (isNamedType(type)) {
    const newType = newTypeMap[type.name];
    return newType != null ? (newType as T) : null;
  }

  return null;
}
function mapFields(originalTypeMap: TypeMap, schema: GraphQLSchema, schemaMapper: SchemaMapper): TypeMap {
  const newTypeMap = {};

  Object.keys(originalTypeMap).forEach(typeName => {
    if (!typeName.startsWith('__')) {
      const originalType = originalTypeMap[typeName];

      if (!isObjectType(originalType) && !isInterfaceType(originalType) && !isInputObjectType(originalType)) {
        newTypeMap[typeName] = originalType;
        return;
      }

      const fieldMapper = getFieldMapper(schema, schemaMapper, typeName);
      if (fieldMapper == null) {
        newTypeMap[typeName] = originalType;
        return;
      }

      const config = originalType.toConfig();

      const originalFieldConfigMap = config.fields;
      const newFieldConfigMap = {};
      Object.keys(originalFieldConfigMap).forEach(fieldName => {
        const originalFieldConfig = originalFieldConfigMap[fieldName];
        const mappedField = fieldMapper(originalFieldConfig, fieldName, typeName, schema);
        if (mappedField === undefined) {
          newFieldConfigMap[fieldName] = originalFieldConfig;
        } else if (Array.isArray(mappedField)) {
          const [newFieldName, newFieldConfig] = mappedField;
          newFieldConfigMap[newFieldName] = newFieldConfig;
        } else if (mappedField !== null) {
          newFieldConfigMap[fieldName] = mappedField;
        }
      });

      if (isObjectType(originalType)) {
        newTypeMap[typeName] = new GraphQLObjectType({
          ...((config as unknown) as GraphQLObjectTypeConfig<any, any>),
          fields: newFieldConfigMap,
        });
      } else if (isInterfaceType(originalType)) {
        newTypeMap[typeName] = new GraphQLInterfaceType({
          ...((config as unknown) as GraphQLInterfaceTypeConfig<any, any>),
          fields: newFieldConfigMap,
        });
      } else {
        newTypeMap[typeName] = new GraphQLInputObjectType({
          ...((config as unknown) as GraphQLInputObjectTypeConfig),
          fields: newFieldConfigMap,
        });
      }
    }
  });

  return newTypeMap;
}

function mapDirectives(
  originalDirectives: ReadonlyArray<GraphQLDirective>,
  schema: GraphQLSchema,
  schemaMapper: SchemaMapper
): Array<GraphQLDirective> {
  const newDirectives: Array<GraphQLDirective> = [];

  originalDirectives.forEach(directive => {
    const directiveMapper = getDirectiveMapper(schemaMapper);
    if (directiveMapper != null) {
      const maybeNewDirective = directiveMapper(directive, schema);
      newDirectives.push(maybeNewDirective !== undefined ? maybeNewDirective : directive);
    } else {
      newDirectives.push(directive);
    }
  });

  return newDirectives;
}

function getTypeSpecifiers(schema: GraphQLSchema, typeName: string): Array<MapperKind> {
  const type = schema.getType(typeName);
  const specifiers = [MapperKind.TYPE];

  if (isObjectType(type)) {
    specifiers.push(MapperKind.COMPOSITE_TYPE, MapperKind.OBJECT_TYPE);
    const query = schema.getQueryType();
    const mutation = schema.getMutationType();
    const subscription = schema.getSubscriptionType();
    if (query != null && typeName === query.name) {
      specifiers.push(MapperKind.ROOT_OBJECT, MapperKind.QUERY);
    } else if (mutation != null && typeName === mutation.name) {
      specifiers.push(MapperKind.ROOT_OBJECT, MapperKind.MUTATION);
    } else if (subscription != null && typeName === subscription.name) {
      specifiers.push(MapperKind.ROOT_OBJECT, MapperKind.SUBSCRIPTION);
    }
  } else if (isInputObjectType(type)) {
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

function getTypeMapper(schema: GraphQLSchema, schemaMapper: SchemaMapper, typeName: string): NamedTypeMapper | null {
  const specifiers = getTypeSpecifiers(schema, typeName);
  let typeMapper: NamedTypeMapper | undefined;
  const stack = [...specifiers];
  while (!typeMapper && stack.length > 0) {
    const next = stack.pop();
    typeMapper = schemaMapper[next] as NamedTypeMapper;
  }

  return typeMapper != null ? typeMapper : null;
}

function getFieldSpecifiers(schema: GraphQLSchema, typeName: string): Array<MapperKind> {
  const type = schema.getType(typeName);
  const specifiers = [MapperKind.FIELD];

  if (isObjectType(type)) {
    specifiers.push(MapperKind.COMPOSITE_FIELD, MapperKind.OBJECT_FIELD);
    const query = schema.getQueryType();
    const mutation = schema.getMutationType();
    const subscription = schema.getSubscriptionType();
    if (query != null && typeName === query.name) {
      specifiers.push(MapperKind.ROOT_FIELD, MapperKind.QUERY_ROOT_FIELD);
    } else if (mutation != null && typeName === mutation.name) {
      specifiers.push(MapperKind.ROOT_FIELD, MapperKind.MUTATION_ROOT_FIELD);
    } else if (subscription != null && typeName === subscription.name) {
      specifiers.push(MapperKind.ROOT_FIELD, MapperKind.SUBSCRIPTION_ROOT_FIELD);
    }
  } else if (isInterfaceType(type)) {
    specifiers.push(MapperKind.COMPOSITE_FIELD, MapperKind.INTERFACE_FIELD);
  } else if (isInputObjectType(type)) {
    specifiers.push(MapperKind.INPUT_OBJECT_FIELD);
  }

  return specifiers;
}

function getFieldMapper<F extends GraphQLFieldConfig<any, any> | GraphQLInputFieldConfig>(
  schema: GraphQLSchema,
  schemaMapper: SchemaMapper,
  typeName: string
): GenericFieldMapper<F> | null {
  const specifiers = getFieldSpecifiers(schema, typeName);
  let fieldMapper: GenericFieldMapper<F> | undefined;
  const stack = [...specifiers];
  while (!fieldMapper && stack.length > 0) {
    const next = stack.pop();
    fieldMapper = schemaMapper[next] as GenericFieldMapper<F>;
  }

  return fieldMapper != null ? fieldMapper : null;
}

function getDirectiveMapper(schemaMapper: SchemaMapper): DirectiveMapper | null {
  const directiveMapper = schemaMapper[MapperKind.DIRECTIVE];
  return directiveMapper != null ? directiveMapper : null;
}
