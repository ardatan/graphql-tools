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
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLType,
  GraphQLUnionType,
  isDirective,
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

import { toConfig } from '../polyfills/toConfig';
import { isSpecifiedScalarType } from '../polyfills/isSpecifiedScalarType';
import { graphqlVersion } from '../utils/graphqlVersion';
import {
  SchemaMapper,
  MapperKind,
  NamedTypeMapper,
  DirectiveMapper,
} from '../Interfaces';

export function mapSchema(
  schema: GraphQLSchema,
  schemaMapper: SchemaMapper = {},
): GraphQLSchema {
  const originalTypeMap = schema.getTypeMap();
  const newTypeMap = Object.create(null);
  Object.keys(originalTypeMap).forEach((typeName) => {
    if (!typeName.startsWith('__')) {
      const typeMapper = getMapper(
        schema,
        schemaMapper,
        originalTypeMap[typeName],
      );

      if (typeMapper != null) {
        const newType = typeMapper(originalTypeMap[typeName], schema);
        newTypeMap[typeName] =
          newType !== undefined ? newType : originalTypeMap[typeName];
      } else {
        newTypeMap[typeName] = originalTypeMap[typeName];
      }
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
  const newDirectives: Array<GraphQLDirective> = [];
  originalDirectives.forEach((directive) => {
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
    types: Object.keys(typeMap).map((typeName) => typeMap[typeName]),
    directives,
  });
}

function getTypeSpecifiers(
  type: GraphQLType,
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
  schema: GraphQLSchema,
  schemaMapper: SchemaMapper,
  typeOrDirective: GraphQLNamedType,
): NamedTypeMapper | null;
function getMapper(
  schema: GraphQLSchema,
  schemaMapper: SchemaMapper,
  typeOrDirective: GraphQLDirective,
): DirectiveMapper | null;
function getMapper(
  schema: GraphQLSchema,
  schemaMapper: SchemaMapper,
  typeOrDirective: any,
): any {
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

export function rewireTypes(
  originalTypeMap: Record<string, GraphQLNamedType | null>,
  directives: ReadonlyArray<GraphQLDirective>,
): {
  typeMap: Record<string, GraphQLNamedType>;
  directives: Array<GraphQLDirective>;
} {
  const newTypeMap: Record<string, GraphQLNamedType> = Object.create(null);

  Object.keys(originalTypeMap).forEach((typeName) => {
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

  Object.keys(newTypeMap).forEach((typeName) => {
    newTypeMap[typeName] = rewireNamedType(newTypeMap[typeName]);
  });

  const newDirectives = directives.map((directive) =>
    rewireDirective(directive),
  );

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
    Object.keys(args).forEach((argName) => {
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
      const config = toConfig(type);
      const newConfig = {
        ...config,
        fields: () => rewireFields(config.fields),
        interfaces: () => rewireNamedTypes(config.interfaces),
      };
      return new GraphQLObjectType(newConfig);
    } else if (isInterfaceType(type)) {
      const config = toConfig(type);
      const newConfig = {
        ...config,
        fields: () => rewireFields(config.fields),
      };
      if (graphqlVersion() >= 15) {
        newConfig.interfaces = () => rewireNamedTypes(config.interfaces);
      }
      return new GraphQLInterfaceType(newConfig);
    } else if (isUnionType(type)) {
      const config = toConfig(type);
      const newConfig = {
        ...config,
        types: () => rewireNamedTypes(config.types),
      };
      return new GraphQLUnionType(newConfig);
    } else if (isInputObjectType(type)) {
      const config = toConfig(type);
      const newConfig = {
        ...config,
        fields: () => rewireInputFields(config.fields),
      };
      return new GraphQLInputObjectType(newConfig);
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
    Object.keys(fields).forEach((fieldName) => {
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
    Object.keys(fields).forEach((fieldName) => {
      const field = fields[fieldName];
      const rewiredFieldType = rewireType(field.type);
      if (rewiredFieldType != null) {
        field.type = rewiredFieldType;
        rewiredFields[fieldName] = field;
      }
    });
    return rewiredFields;
  }

  function rewireNamedTypes<T extends GraphQLNamedType>(
    namedTypes: Array<T>,
  ): Array<T> {
    const rewiredTypes: Array<T> = [];
    namedTypes.forEach((namedType) => {
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
      const originalType = originalTypeMap[type.name];
      return originalType != null ? (newTypeMap[originalType.name] as T) : null;
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
  Object.keys(typeMap).forEach((typeName) => {
    const namedType = typeMap[typeName];

    if (
      isObjectType(namedType) ||
      (graphqlVersion() >= 15 && isInterfaceType(namedType))
    ) {
      namedType.getInterfaces().forEach((iface) => {
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
    } else {
      newTypeMap[typeName] = type;
    }
  }

  // every prune requires another round of healing
  return prunedTypeMap
    ? rewireTypes(newTypeMap, directives)
    : { typeMap, directives };
}
