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

export function schemaToConfig(schema: GraphQLSchema): GraphQLSchemaConfig {
  if (schema.toConfig != null) {
    return schema.toConfig();
  }

  const newTypes: Array<GraphQLNamedType> = [];

  const types = schema.getTypeMap();
  Object.keys(types).forEach(typeName => {
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

export function toConfig(
  schemaOrTypeOrDirective: GraphQLSchema,
): GraphQLSchemaConfig;
export function toConfig(
  schemaOrTypeOrDirective: GraphQLObjectTypeConfig<any, any> & {
    interfaces: Array<GraphQLInterfaceType>;
    fields: GraphQLFieldConfigMap<any, any>;
  },
): GraphQLObjectTypeConfig<any, any>;
export function toConfig(
  schemaOrTypeOrDirective: GraphQLInterfaceType,
): GraphQLInterfaceTypeConfig<any, any> & {
  fields: GraphQLFieldConfigMap<any, any>;
};
export function toConfig(
  schemaOrTypeOrDirective: GraphQLUnionType,
): GraphQLUnionTypeConfig<any, any> & {
  types: Array<GraphQLObjectType>;
};
export function toConfig(
  schemaOrTypeOrDirective: GraphQLEnumType,
): GraphQLEnumTypeConfig;
export function toConfig(
  schemaOrTypeOrDirective: GraphQLScalarType,
): GraphQLScalarTypeConfig<any, any>;
export function toConfig(
  schemaOrTypeOrDirective: GraphQLInputObjectType,
): GraphQLInputObjectTypeConfig & {
  fields: GraphQLInputFieldConfigMap;
};
export function toConfig(
  schemaOrTypeOrDirective: GraphQLDirective,
): GraphQLDirectiveConfig;
export function toConfig(schemaOrTypeOrDirective: any): any;
export function toConfig(schemaOrTypeOrDirective: any) {
  if (isSchema(schemaOrTypeOrDirective)) {
    return schemaToConfig(schemaOrTypeOrDirective);
  } else if (isDirective(schemaOrTypeOrDirective)) {
    return directiveToConfig(schemaOrTypeOrDirective);
  } else if (isNamedType(schemaOrTypeOrDirective)) {
    return typeToConfig(schemaOrTypeOrDirective);
  }

  throw new Error(`Unknown object ${schemaOrTypeOrDirective as string}`);
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
    fields: fieldsToFieldsConfig(type.getFields()),
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

  const typeConfig = {
    name: type.name,
    description: type.description,
    fields: fieldsToFieldsConfig(type.getFields()),
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

  const newValues = {};

  type.getValues().forEach(value => {
    newValues[value.name] = {
      description: value.description,
      value: value.value,
      deprecationReason: value.deprecationReason,
      extensions: value.extensions,
      astNode: value.astNode,
    };
  });

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

const hasOwn = Object.prototype.hasOwnProperty;

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
      graphqlVersion() >= 14 || hasOwn.call(type, 'serialize')
        ? type.serialize
        : ((type as unknown) as {
            _scalarConfig: GraphQLScalarTypeConfig<any, any>;
          })._scalarConfig.serialize,
    parseValue:
      graphqlVersion() >= 14 || hasOwn.call(type, 'parseValue')
        ? type.parseValue
        : ((type as unknown) as {
            _scalarConfig: GraphQLScalarTypeConfig<any, any>;
          })._scalarConfig.parseValue,
    parseLiteral:
      graphqlVersion() >= 14 || hasOwn.call(type, 'parseLiteral')
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

  const newFields = {};
  const fields = type.getFields();

  Object.keys(fields).forEach(fieldName => {
    const field = fields[fieldName];

    newFields[fieldName] = {
      description: field.description,
      type: field.type,
      defaultValue: field.defaultValue,
      extensions: field.extensions,
      astNode: field.astNode,
    };
  });

  const typeConfig = {
    name: type.name,
    description: type.description,
    fields: newFields,
    extensions: type.extensions,
    astNode: type.astNode,
    extensionASTNodes:
      type.extensionASTNodes != null ? type.extensionASTNodes : [],
  };

  return typeConfig;
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
    args: argsToArgsConfig(directive.args),
    isRepeatable: ((directive as unknown) as { isRepeatable: boolean })
      .isRepeatable,
    extensions: directive.extensions,
    astNode: directive.astNode,
  };

  return directiveConfig;
}

function fieldsToFieldsConfig(
  fields: GraphQLFieldMap<any, any>,
): GraphQLFieldConfigMap<any, any> {
  const newFields = {};

  Object.keys(fields).forEach(fieldName => {
    const field = fields[fieldName];

    newFields[fieldName] = {
      description: field.description,
      type: field.type,
      args: argsToArgsConfig(field.args),
      resolve: field.resolve,
      subscribe: field.subscribe,
      deprecationReason: field.deprecationReason,
      extensions: field.extensions,
      astNode: field.astNode,
    };
  });

  return newFields;
}

function argsToArgsConfig(
  args: ReadonlyArray<GraphQLArgument>,
): GraphQLFieldConfigArgumentMap {
  const newArguments = {};

  args.forEach(arg => {
    newArguments[arg.name] = {
      description: arg.description,
      type: arg.type,
      defaultValue: arg.defaultValue,
      extensions: arg.extensions,
      astNode: arg.astNode,
    };
  });

  return newArguments;
}
