// graphql <v14.2 does not support toConfig

import {
  GraphQLSchema,
  GraphQLFieldMap,
  GraphQLArgument,
  GraphQLFieldConfigArgumentMap,
  GraphQLObjectType,
  GraphQLObjectTypeConfig,
  GraphQLFieldConfigMap,
  GraphQLInputFieldConfigMap,
  GraphQLInterfaceType,
  GraphQLInterfaceTypeConfig,
  GraphQLUnionType,
  GraphQLUnionTypeConfig,
  GraphQLEnumType,
  GraphQLEnumTypeConfig,
  GraphQLScalarType,
  GraphQLScalarTypeConfig,
  GraphQLInputObjectType,
  GraphQLInputObjectTypeConfig,
  GraphQLDirective,
  GraphQLDirectiveConfig,
  GraphQLSchemaConfig,
  GraphQLNamedType,
  GraphQLField,
  GraphQLInputField,
  GraphQLInputFieldConfig,
  GraphQLInputFieldMap,
  GraphQLArgumentConfig,
  GraphQLFieldConfig,
  isObjectType,
  isInterfaceType,
  isUnionType,
  isEnumType,
  isScalarType,
  isInputObjectType,
  isSchema,
  isDirective,
  isNamedType,
} from 'graphql';

import { graphqlVersion } from '../utils/graphqlVersion';
import { hasOwnProperty } from '../esUtils/hasOwnProperty';
import keyValMap from '../esUtils/keyValMap';

export function schemaToConfig(schema: GraphQLSchema): GraphQLSchemaConfig {
  if (schema.toConfig != null) {
    return schema.toConfig();
  }

  const newTypes: Array<GraphQLNamedType> = [];

  const types = schema.getTypeMap();
  Object.keys(types).forEach((typeName) => {
    newTypes.push(types[typeName]);
  });

  const schemaConfig = {
    query: schema.getQueryType(),
    mutation: schema.getMutationType(),
    subscription: schema.getSubscriptionType(),
    types: newTypes,
    directives: schema.getDirectives().slice(),
    extensions: schema.extensions,
    astNode: schema.astNode,
    extensionASTNodes:
      schema.extensionASTNodes != null ? schema.extensionASTNodes : [],
    assumeValid:
      (schema as { __validationErrors?: boolean }).__validationErrors !==
      undefined,
  };

  if (graphqlVersion() >= 15) {
    (schemaConfig as {
      description?: string;
    }).description = (schema as {
      description?: string;
    }).description;
  }

  return schemaConfig;
}

export function toConfig(graphqlObject: GraphQLSchema): GraphQLSchemaConfig;
export function toConfig(
  graphqlObject: GraphQLObjectTypeConfig<any, any> & {
    interfaces: Array<GraphQLInterfaceType>;
    fields: GraphQLFieldConfigMap<any, any>;
  },
): GraphQLObjectTypeConfig<any, any>;
export function toConfig(
  graphqlObject: GraphQLInterfaceType & {
    interfaces: Array<GraphQLInterfaceType>;
    fields: GraphQLFieldConfigMap<any, any>;
  },
): GraphQLInterfaceTypeConfig<any, any>;
export function toConfig(
  graphqlObject: GraphQLUnionType,
): GraphQLUnionTypeConfig<any, any> & {
  types: Array<GraphQLObjectType>;
};
export function toConfig(graphqlObject: GraphQLEnumType): GraphQLEnumTypeConfig;
export function toConfig(
  graphqlObject: GraphQLScalarType,
): GraphQLScalarTypeConfig<any, any>;
export function toConfig(
  graphqlObject: GraphQLInputObjectType,
): GraphQLInputObjectTypeConfig & {
  fields: GraphQLInputFieldConfigMap;
};
export function toConfig(
  graphqlObject: GraphQLDirective,
): GraphQLDirectiveConfig;
export function toConfig(
  graphqlObject: GraphQLInputField,
): GraphQLInputFieldConfig;
export function toConfig(
  graphqlObject: GraphQLField<any, any>,
): GraphQLFieldConfig<any, any>;
export function toConfig(graphqlObject: any): any;
export function toConfig(graphqlObject: any) {
  if (isSchema(graphqlObject)) {
    return schemaToConfig(graphqlObject);
  } else if (isDirective(graphqlObject)) {
    return directiveToConfig(graphqlObject);
  } else if (isNamedType(graphqlObject)) {
    return typeToConfig(graphqlObject);
  }

  // Input and output fields do not have predicates defined, but using duck typing,
  // type is defined for input and output fields
  if (graphqlObject.type != null) {
    if (
      graphqlObject.args != null ||
      graphqlObject.resolve != null ||
      graphqlObject.subscribe != null
    ) {
      return fieldToConfig(graphqlObject);
    } else if (graphqlObject.defaultValue !== undefined) {
      return inputFieldToConfig(graphqlObject);
    }

    // Not all input and output fields can be checked by above in older versions
    // of graphql, but almost all properties on the field and config are identical.
    // In particular, just name and isDeprecated should be removed.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name, isDeprecated, ...rest } = graphqlObject;
    return {
      ...rest,
    };
  }

  throw new Error(`Unknown graphql object ${graphqlObject as string}`);
}

export function typeToConfig(
  type: GraphQLObjectType,
): GraphQLObjectTypeConfig<any, any>;
export function typeToConfig(
  type: GraphQLInterfaceType,
): GraphQLInterfaceTypeConfig<any, any>;
export function typeToConfig(
  type: GraphQLUnionType,
): GraphQLUnionTypeConfig<any, any>;
export function typeToConfig(type: GraphQLEnumType): GraphQLEnumTypeConfig;
export function typeToConfig(
  type: GraphQLScalarType,
): GraphQLScalarTypeConfig<any, any>;
export function typeToConfig(
  type: GraphQLInputObjectType,
): GraphQLInputObjectTypeConfig;
export function typeToConfig(type: any): any;
export function typeToConfig(type: any) {
  if (isObjectType(type)) {
    return objectTypeToConfig(type);
  } else if (isInterfaceType(type)) {
    return interfaceTypeToConfig(type);
  } else if (isUnionType(type)) {
    return unionTypeToConfig(type);
  } else if (isEnumType(type)) {
    return enumTypeToConfig(type);
  } else if (isScalarType(type)) {
    return scalarTypeToConfig(type);
  } else if (isInputObjectType(type)) {
    return inputObjectTypeToConfig(type);
  }

  throw new Error(`Unknown type ${type as string}`);
}

export function objectTypeToConfig(
  type: GraphQLObjectType,
): GraphQLObjectTypeConfig<any, any> {
  if (type.toConfig != null) {
    return type.toConfig();
  }

  const typeConfig = {
    name: type.name,
    description: type.description,
    interfaces: type.getInterfaces(),
    fields: fieldMapToConfig(type.getFields()),
    isTypeOf: type.isTypeOf,
    extensions: type.extensions,
    astNode: type.astNode,
    extensionASTNodes:
      type.extensionASTNodes != null ? type.extensionASTNodes : [],
  };

  return typeConfig;
}

export function interfaceTypeToConfig(
  type: GraphQLInterfaceType,
): GraphQLInterfaceTypeConfig<any, any> {
  if (type.toConfig != null) {
    return type.toConfig();
  }

  const typeConfig: GraphQLInterfaceTypeConfig<any, any> = {
    name: type.name,
    description: type.description,
    fields: fieldMapToConfig(type.getFields()),
    resolveType: type.resolveType,
    extensions: type.extensions,
    astNode: type.astNode,
    extensionASTNodes:
      type.extensionASTNodes != null ? type.extensionASTNodes : [],
  };

  if (graphqlVersion() >= 15) {
    ((typeConfig as unknown) as GraphQLObjectTypeConfig<
      any,
      any
    >).interfaces = ((type as unknown) as GraphQLObjectType).getInterfaces();
  }

  return typeConfig;
}

export function unionTypeToConfig(
  type: GraphQLUnionType,
): GraphQLUnionTypeConfig<any, any> {
  if (type.toConfig != null) {
    return type.toConfig();
  }

  const typeConfig = {
    name: type.name,
    description: type.description,
    types: type.getTypes(),
    resolveType: type.resolveType,
    extensions: type.extensions,
    astNode: type.astNode,
    extensionASTNodes:
      type.extensionASTNodes != null ? type.extensionASTNodes : [],
  };

  return typeConfig;
}

export function enumTypeToConfig(type: GraphQLEnumType): GraphQLEnumTypeConfig {
  if (type.toConfig != null) {
    return type.toConfig();
  }

  const newValues = keyValMap(
    type.getValues(),
    (value) => value.name,
    (value) => ({
      description: value.description,
      value: value.value,
      deprecationReason: value.deprecationReason,
      extensions: value.extensions,
      astNode: value.astNode,
    }),
  );

  const typeConfig = {
    name: type.name,
    description: type.description,
    values: newValues,
    extensions: type.extensions,
    astNode: type.astNode,
    extensionASTNodes:
      type.extensionASTNodes != null ? type.extensionASTNodes : [],
  };

  return typeConfig;
}

export function scalarTypeToConfig(
  type: GraphQLScalarType,
): GraphQLScalarTypeConfig<any, any> {
  if (type.toConfig != null) {
    return type.toConfig();
  }

  const typeConfig = {
    name: type.name,
    description: type.description,
    serialize:
      graphqlVersion() >= 14 || hasOwnProperty(type, 'serialize')
        ? type.serialize
        : ((type as unknown) as {
            _scalarConfig: GraphQLScalarTypeConfig<any, any>;
          })._scalarConfig.serialize,
    parseValue:
      graphqlVersion() >= 14 || hasOwnProperty(type, 'parseValue')
        ? type.parseValue
        : ((type as unknown) as {
            _scalarConfig: GraphQLScalarTypeConfig<any, any>;
          })._scalarConfig.parseValue,
    parseLiteral:
      graphqlVersion() >= 14 || hasOwnProperty(type, 'parseLiteral')
        ? type.parseLiteral
        : ((type as unknown) as {
            _scalarConfig: GraphQLScalarTypeConfig<any, any>;
          })._scalarConfig.parseLiteral,
    extensions: type.extensions,
    astNode: type.astNode,
    extensionASTNodes:
      type.extensionASTNodes != null ? type.extensionASTNodes : [],
  };

  return typeConfig;
}

export function inputObjectTypeToConfig(
  type: GraphQLInputObjectType,
): GraphQLInputObjectTypeConfig {
  if (type.toConfig != null) {
    return type.toConfig();
  }

  const typeConfig = {
    name: type.name,
    description: type.description,
    fields: inputFieldMapToConfig(type.getFields()),
    extensions: type.extensions,
    astNode: type.astNode,
    extensionASTNodes:
      type.extensionASTNodes != null ? type.extensionASTNodes : [],
  };

  return typeConfig;
}

export function inputFieldMapToConfig(
  fields: GraphQLInputFieldMap,
): GraphQLInputFieldConfigMap {
  return keyValMap(
    Object.keys(fields),
    (fieldName) => fieldName,
    (fieldName) => toConfig(fields[fieldName]),
  );
}

export function inputFieldToConfig(
  field: GraphQLInputField,
): GraphQLInputFieldConfig {
  return {
    description: field.description,
    type: field.type,
    defaultValue: field.defaultValue,
    extensions: field.extensions,
    astNode: field.astNode,
  };
}

export function directiveToConfig(
  directive: GraphQLDirective,
): GraphQLDirectiveConfig {
  if (directive.toConfig != null) {
    return directive.toConfig();
  }

  const directiveConfig = {
    name: directive.name,
    description: directive.description,
    locations: directive.locations,
    args: argumentMapToConfig(directive.args),
    isRepeatable: directive.isRepeatable,
    extensions: directive.extensions,
    astNode: directive.astNode,
  };

  return directiveConfig;
}

export function fieldMapToConfig(
  fields: GraphQLFieldMap<any, any>,
): GraphQLFieldConfigMap<any, any> {
  return keyValMap(
    Object.keys(fields),
    (fieldName) => fieldName,
    (fieldName) => toConfig(fields[fieldName]),
  );
}

export function fieldToConfig(
  field: GraphQLField<any, any>,
): GraphQLFieldConfig<any, any> {
  return {
    description: field.description,
    type: field.type,
    args: argumentMapToConfig(field.args),
    resolve: field.resolve,
    subscribe: field.subscribe,
    deprecationReason: field.deprecationReason,
    extensions: field.extensions,
    astNode: field.astNode,
  };
}

export function argumentMapToConfig(
  args: ReadonlyArray<GraphQLArgument>,
): GraphQLFieldConfigArgumentMap {
  const newArguments = {};
  args.forEach((arg) => {
    newArguments[arg.name] = argumentToConfig(arg);
  });

  return newArguments;
}

export function argumentToConfig(arg: GraphQLArgument): GraphQLArgumentConfig {
  return {
    description: arg.description,
    type: arg.type,
    defaultValue: arg.defaultValue,
    extensions: arg.extensions,
    astNode: arg.astNode,
  };
}
