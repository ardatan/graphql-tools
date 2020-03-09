import {
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLFieldConfigArgumentMap,
  GraphQLFieldConfigMap,
  GraphQLInputFieldConfigMap,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLObjectType,
  GraphQLObjectTypeConfig,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLType,
  GraphQLUnionType,
  isInterfaceType,
  isEnumType,
  isInputType,
  isInputObjectType,
  isListType,
  isNamedType,
  isNonNullType,
  isObjectType,
  isScalarType,
  isUnionType,
} from 'graphql';

import { toConfig, isSpecifiedScalarType } from '../polyfills';
import { graphqlVersion } from '../utils';

export enum MapperKind {
  TYPE = 'MapperKind.TYPE',
  SCALAR_TYPE = 'MapperKind.SCALAR_TYPE',
  ENUM_TYPE = 'MapperKind.ENUM_TYPE',
  COMPOSITE_TYPE = 'MapperKind.COMPOSITE_TYPE',
  OBJECT_TYPE = 'MapperKind.OBJECT_TYPE',
  INPUT_OBJECT_TYPE = 'MapperKind.INPUT_OBJECT_TYPE',
  ABSTRACT_TYPE = 'MapperKind.ABSTRACT_TYPE',
  UNION_TYPE = 'MapperKind.UNION_TYPE',
  INTERFACE_TYPE = 'MapperKind.INTERFACE_TYPE',
  ROOT_OBJECT = 'MapperKind.ROOT_OBJECT',
  QUERY = 'MapperKind.QUERY',
  MUTATION = 'MapperKind.MUTATION',
  SUBSCRIPTION = 'MapperKind.SUBSCRIPTION',
  DIRECTIVE = 'MapperKind.DIRECTIVE',
}

export interface SchemaMapper {
  [MapperKind.TYPE]?: NamedTypeMapper;
  [MapperKind.SCALAR_TYPE]?: ScalarTypeMapper;
  [MapperKind.ENUM_TYPE]?: EnumTypeMapper;
  [MapperKind.COMPOSITE_TYPE]?: CompositeTypeMapper;
  [MapperKind.OBJECT_TYPE]?: ObjectTypeMapper;
  [MapperKind.INPUT_OBJECT_TYPE]?: InputObjectTypeMapper;
  [MapperKind.ABSTRACT_TYPE]?: AbstractTypeMapper;
  [MapperKind.UNION_TYPE]?: UnionTypeMapper;
  [MapperKind.INTERFACE_TYPE]?: InterfaceTypeMapper;
  [MapperKind.ROOT_OBJECT]?: ObjectTypeMapper;
  [MapperKind.QUERY]?: ObjectTypeMapper;
  [MapperKind.MUTATION]?: ObjectTypeMapper;
  [MapperKind.SUBSCRIPTION]?: ObjectTypeMapper;
  [MapperKind.DIRECTIVE]?: DirectiveMapper;
}

export type NamedTypeMapper = (
  type: GraphQLNamedType,
  schema: GraphQLSchema,
) => GraphQLNamedType | null | undefined;

export type ScalarTypeMapper = (
  type: GraphQLScalarType,
  schema: GraphQLSchema,
) => GraphQLScalarType | null | undefined;

export type EnumTypeMapper = (
  type: GraphQLEnumType,
  schema: GraphQLSchema,
) => GraphQLEnumType | null | undefined;

export type CompositeTypeMapper = (
  type: GraphQLObjectType | GraphQLInterfaceType | GraphQLUnionType,
  schema: GraphQLSchema,
) =>
  | GraphQLObjectType
  | GraphQLInterfaceType
  | GraphQLUnionType
  | null
  | undefined;

export type ObjectTypeMapper = (
  type: GraphQLObjectType,
  schema: GraphQLSchema,
) => GraphQLObjectType | null | undefined;

export type InputObjectTypeMapper = (
  type: GraphQLInputObjectType,
  schema: GraphQLSchema,
) => GraphQLInputObjectType | null | undefined;

export type AbstractTypeMapper = (
  type: GraphQLInterfaceType | GraphQLUnionType,
  schema: GraphQLSchema,
) => GraphQLInterfaceType | GraphQLUnionType | null | undefined;

export type UnionTypeMapper = (
  type: GraphQLUnionType,
  schema: GraphQLSchema,
) => GraphQLUnionType | null | undefined;

export type InterfaceTypeMapper = (
  type: GraphQLInterfaceType,
  schema: GraphQLSchema,
) => GraphQLInterfaceType | null | undefined;

export type DirectiveMapper = (
  directive: GraphQLDirective,
  schema: GraphQLSchema,
) => GraphQLDirective | null | undefined;

export function mapSchema(
  schema: GraphQLSchema,
  schemaMapper: SchemaMapper,
): GraphQLSchema {
  const originalTypeMap = schema.getTypeMap();
  const newTypeMap = {};
  Object.keys(originalTypeMap).forEach(typeName => {
    if (!typeName.startsWith('__')) {
      const specifiers = getTypeSpecifiers(originalTypeMap[typeName], schema);
      const typeMapper = getMapper(schemaMapper, specifiers);

      newTypeMap[typeName] =
        typeMapper != null
          ? typeMapper(originalTypeMap[typeName], schema)
          : originalTypeMap[typeName];
    }
  });

  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType();
  const subscriptionType = schema.getSubscriptionType();

  const newQueryTypeName =
    queryType != null
      ? newTypeMap[queryType.name] != null
        ? newTypeMap[queryType.name].name
        : undefined
      : undefined;
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
  let newDirectives: Array<GraphQLDirective>;
  const directiveMapper = schemaMapper[MapperKind.DIRECTIVE];
  if (directiveMapper != null) {
    newDirectives = [];
    originalDirectives.forEach(directive => {
      const newDirective = directiveMapper(directive, schema);
      if (newDirective != null) {
        newDirectives.push(newDirective);
      }
    });
  } else {
    newDirectives = originalDirectives.slice();
  }

  const { typeMap, directives } = rewireTypes(newTypeMap, newDirectives);

  return new GraphQLSchema({
    ...toConfig(schema),
    query: newQueryTypeName
      ? (typeMap[newQueryTypeName] as GraphQLObjectType)
      : undefined,
    mutation: newMutationTypeName
      ? (typeMap[newMutationTypeName] as GraphQLObjectType)
      : undefined,
    subscription:
      newSubscriptionTypeName != null
        ? (typeMap[newSubscriptionTypeName] as GraphQLObjectType)
        : undefined,
    types: Object.keys(typeMap).map(typeName => typeMap[typeName]),
    directives,
  });
}

function getTypeSpecifiers(
  type: GraphQLType | GraphQLDirective,
  schema: GraphQLSchema,
): Array<MapperKind> {
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
    specifiers.push(
      MapperKind.COMPOSITE_TYPE,
      MapperKind.ABSTRACT_TYPE,
      MapperKind.INTERFACE_TYPE,
    );
  } else if (isUnionType(type)) {
    specifiers.push(
      MapperKind.COMPOSITE_TYPE,
      MapperKind.ABSTRACT_TYPE,
      MapperKind.UNION_TYPE,
    );
  } else if (isEnumType(type)) {
    specifiers.push(MapperKind.ENUM_TYPE);
  } else if (isScalarType(type)) {
    specifiers.push(MapperKind.SCALAR_TYPE);
  }

  return specifiers;
}

function getMapper(
  schemaMapper: SchemaMapper,
  specifiers: Array<MapperKind>,
): NamedTypeMapper | null {
  let typeMapper: NamedTypeMapper | undefined;
  const stack = [...specifiers];
  while (!typeMapper && stack.length > 0) {
    const next = stack.pop();
    typeMapper = schemaMapper[next] as NamedTypeMapper;
  }

  return typeMapper != null ? typeMapper : null;
}

export function rewireTypes(
  originalTypeMap: Record<string, GraphQLNamedType | null>,
  directives: ReadonlyArray<GraphQLDirective>,
): {
  typeMap: Record<string, GraphQLNamedType>;
  directives: Array<GraphQLDirective>;
} {
  const newTypeMap: Record<string, GraphQLNamedType> = Object.create(null);

  Object.keys(originalTypeMap).forEach(typeName => {
    const namedType = originalTypeMap[typeName];

    if (namedType == null || typeName.startsWith('__')) {
      return;
    }

    const newName = namedType.name;
    if (newName.startsWith('__')) {
      return;
    }

    if (newTypeMap[newName] != null) {
      throw new Error(`Duplicate schema type name ${newName}`);
    }

    newTypeMap[newName] = namedType;
  });

  const newDirectives = directives.map(directive => rewireDirective(directive));

  Object.keys(newTypeMap).forEach(typeName => {
    const namedType = newTypeMap[typeName];
    if (!typeName.startsWith('__')) {
      newTypeMap[typeName] = rewireNamedType(namedType);
    }
  });

  return pruneTypes(newTypeMap, newDirectives);

  function rewireDirective(directive: GraphQLDirective): GraphQLDirective {
    const directiveConfig = toConfig(directive);
    directiveConfig.args = rewireArgs(directiveConfig.args);
    return new GraphQLDirective(directiveConfig);
  }

  function rewireArgs(
    args: GraphQLFieldConfigArgumentMap,
  ): GraphQLFieldConfigArgumentMap {
    const rewiredArgs = {};
    Object.keys(args).forEach(argName => {
      const arg = args[argName];
      const rewiredArgType = rewireType(arg.type);
      if (rewiredArgType != null) {
        arg.type = rewiredArgType;
        rewiredArgs[argName] = arg;
      }
    });
    return rewiredArgs;
  }

  function rewireNamedType<T extends GraphQLNamedType>(type: T) {
    if (isObjectType(type)) {
      const objectConfig = toConfig(type);
      objectConfig.fields = rewireFields(
        objectConfig.fields as GraphQLFieldConfigMap<any, any>,
      );
      objectConfig.interfaces = rewireNamedTypes(
        objectConfig.interfaces as Array<GraphQLInterfaceType>,
      );
      return new GraphQLObjectType(objectConfig);
    } else if (isInterfaceType(type)) {
      const interfaceConfig = toConfig(type);
      interfaceConfig.fields = rewireFields(
        interfaceConfig.fields as GraphQLFieldConfigMap<any, any>,
      );
      if (graphqlVersion() >= 15) {
        ((interfaceConfig as unknown) as GraphQLObjectTypeConfig<
          any,
          any
        >).interfaces = rewireNamedTypes(
          ((interfaceConfig as unknown) as GraphQLObjectTypeConfig<any, any>)
            .interfaces as Array<GraphQLInterfaceType>,
        );
      }
      return new GraphQLInterfaceType(interfaceConfig);
    } else if (isUnionType(type)) {
      const unionConfig = toConfig(type);
      unionConfig.types = rewireNamedTypes(
        unionConfig.types as Array<GraphQLObjectType>,
      );
      return new GraphQLUnionType(unionConfig);
    } else if (isInputObjectType(type)) {
      const inputObjectConfig = toConfig(type);
      inputObjectConfig.fields = rewireInputFields(
        inputObjectConfig.fields as GraphQLInputFieldConfigMap,
      );
      return new GraphQLInputObjectType(inputObjectConfig);
    } else if (isEnumType(type)) {
      const enumConfig = toConfig(type);
      return new GraphQLEnumType(enumConfig);
    } else if (isScalarType(type)) {
      if (isSpecifiedScalarType(type)) {
        return type;
      }
      const scalarConfig = toConfig(type);
      return new GraphQLScalarType(scalarConfig);
    }

    throw new Error(`Unexpected schema type: ${(type as unknown) as string}`);
  }

  function rewireFields(
    fields: GraphQLFieldConfigMap<any, any>,
  ): GraphQLFieldConfigMap<any, any> {
    const rewiredFields = {};
    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName];
      const rewiredFieldType = rewireType(field.type);
      if (rewiredFieldType != null) {
        field.type = rewiredFieldType;
        field.args = rewireArgs(field.args);
        rewiredFields[fieldName] = field;
      }
    });
    return rewiredFields;
  }

  function rewireInputFields(
    fields: GraphQLInputFieldConfigMap,
  ): GraphQLInputFieldConfigMap {
    const rewiredFields = {};
    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName];
      const rewiredFieldType = rewireType(field.type);
      if (rewiredFieldType != null) {
        field.type = rewiredFieldType;
        rewiredFields[fieldName] = field;
      }
    });
    return rewiredFields;
  }

  function rewireNamedTypes<T extends GraphQLNamedType>(namedTypes: Array<T>) {
    const rewiredTypes: Array<T> = [];
    namedTypes.forEach(namedType => {
      const rewiredType = rewireType(namedType);
      if (rewiredType != null) {
        rewiredTypes.push(rewiredType);
      }
    });
    return rewiredTypes;
  }

  function rewireType<T extends GraphQLType>(type: T): T | null {
    if (isListType(type)) {
      const rewiredType = rewireType(type.ofType);
      return rewiredType != null ? (new GraphQLList(rewiredType) as T) : null;
    } else if (isNonNullType(type)) {
      const rewiredType = rewireType(type.ofType);
      return rewiredType != null
        ? (new GraphQLNonNull(rewiredType) as T)
        : null;
    } else if (isNamedType(type)) {
      return type;
    }

    return null;
  }
}

function pruneTypes(
  typeMap: Record<string, GraphQLNamedType>,
  directives: Array<GraphQLDirective>,
): {
  typeMap: Record<string, GraphQLNamedType>;
  directives: Array<GraphQLDirective>;
} {
  const newTypeMap = {};

  const implementedInterfaces = {};
  Object.keys(typeMap).forEach(typeName => {
    const namedType = typeMap[typeName];

    if (
      isObjectType(namedType) ||
      (graphqlVersion() >= 15 && isInterfaceType(namedType))
    ) {
      (namedType as GraphQLObjectType).getInterfaces().forEach(iface => {
        implementedInterfaces[iface.name] = true;
      });
    }
  });

  let prunedTypeMap = false;
  const typeNames = Object.keys(typeMap);
  for (let i = 0; i < typeNames.length; i++) {
    const typeName = typeNames[i];
    const type = typeMap[typeName];
    if (isObjectType(type) || isInputObjectType(type)) {
      // prune types with no fields
      if (Object.keys(type.getFields()).length) {
        newTypeMap[typeName] = type;
      } else {
        prunedTypeMap = true;
      }
    } else if (isUnionType(type)) {
      // prune unions without underlying types
      if (type.getTypes().length) {
        newTypeMap[typeName] = type;
      } else {
        prunedTypeMap = true;
      }
    } else if (isInterfaceType(type)) {
      // prune interfaces without fields or without implementations
      if (
        Object.keys(type.getFields()).length &&
        implementedInterfaces[type.name]
      ) {
        newTypeMap[typeName] = type;
      } else {
        prunedTypeMap = true;
      }
    }
  }

  // every prune requires another round of healing
  return prunedTypeMap
    ? rewireTypes(newTypeMap, directives)
    : { typeMap, directives };
}
