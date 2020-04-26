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
  GraphQLEnumValueConfigMap,
  ObjectTypeExtensionNode,
  InterfaceTypeExtensionNode,
  UnionTypeExtensionNode,
  EnumTypeExtensionNode,
  InputObjectTypeExtensionNode,
  GraphQLScalarSerializer,
  GraphQLScalarValueParser,
  GraphQLScalarLiteralParser,
  ScalarTypeExtensionNode,
} from 'graphql';

export function schemaToConfig(schema: GraphQLSchema): GraphQLSchemaConfig {
  if ((schema as any).toConfig != null) {
    return (schema as any).toConfig();
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
    extensions: (schema as any).extensions,
    astNode: schema.astNode,
    extensionASTNodes:
      schema.extensionASTNodes != null ? schema.extensionASTNodes : [],
    assumeValid:
      (schema as { __validationErrors?: boolean }).__validationErrors !==
      undefined,
  };

  if (
    ('description' in schema) as {
      description?: string;
    }
  ) {
    (schemaConfig as {
      description?: string;
    }).description = (schema as {
      description?: string;
    }).description;
  }

  return schemaConfig;
}

type GraphQLObject =
  | GraphQLSchema
  | GraphQLDirective
  | GraphQLNamedType
  | GraphQLInputField
  | GraphQLField<any, any>;
type GraphQLConfig<T> = T extends GraphQLSchema
  ? GraphQLSchemaConfig
  : T extends GraphQLDirective
  ? GraphQLDirectiveConfig
  : T extends GraphQLObjectType
  ? GraphQLObjectTypeConfig<any, any> & {
      interfaces: Array<GraphQLInterfaceType>;
      fields: GraphQLFieldConfigMap<any, any>;
      extensions?: Record<string, any>;
      extensionASTNodes: Array<ObjectTypeExtensionNode>;
    }
  : T extends GraphQLInterfaceType
  ? GraphQLInterfaceTypeConfig<any, any> & {
      interfaces: Array<GraphQLInterfaceType>;
      fields: GraphQLFieldConfigMap<any, any>;
      extensions?: Record<string, any>;
      extensionASTNodes: Array<InterfaceTypeExtensionNode>;
    }
  : T extends GraphQLUnionType
  ? GraphQLUnionTypeConfig<any, any> & {
      types: Array<GraphQLObjectType>;
      extensions?: Record<string, any>;
      extensionASTNodes: Array<UnionTypeExtensionNode>;
    }
  : T extends GraphQLEnumType
  ? GraphQLEnumTypeConfig & {
      extensions?: Record<string, any>;
      extensionASTNodes: Array<EnumTypeExtensionNode>;
    }
  : T extends GraphQLScalarType
  ? GraphQLScalarTypeConfig<any, any> & {
      serialize: GraphQLScalarSerializer<any>;
      parseValue: GraphQLScalarValueParser<any>;
      parseLiteral: GraphQLScalarLiteralParser<any>;
      extensions?: Record<string, any>;
      extensionASTNodes: Array<ScalarTypeExtensionNode>;
    }
  : T extends GraphQLInputObjectType
  ? GraphQLInputObjectTypeConfig & {
      fields: GraphQLInputFieldConfigMap;
      extensions?: Record<string, any>;
      extensionASTNodes: Array<InputObjectTypeExtensionNode>;
    }
  : T extends GraphQLField<any, any>
  ? GraphQLFieldConfig<any, any> & {}
  : T extends GraphQLInputField
  ? GraphQLInputFieldConfig
  : never;

export function toConfig(
  graphqlObject: GraphQLSchema,
): GraphQLConfig<GraphQLSchema>;
export function toConfig(
  graphqlObject: GraphQLDirective,
): GraphQLConfig<GraphQLDirective>;
export function toConfig(
  graphqlObject: GraphQLObjectType,
): GraphQLConfig<GraphQLObjectType>;
export function toConfig(
  graphqlObject: GraphQLInterfaceType,
): GraphQLConfig<GraphQLInterfaceType>;
export function toConfig(
  graphqlObject: GraphQLUnionType,
): GraphQLConfig<GraphQLUnionType>;
export function toConfig(
  graphqlObject: GraphQLEnumType,
): GraphQLConfig<GraphQLEnumType>;
export function toConfig(
  graphqlObject: GraphQLScalarType,
): GraphQLConfig<GraphQLScalarType>;
export function toConfig(
  graphqlObject: GraphQLInputObjectType,
): GraphQLConfig<GraphQLInputObjectType>;
export function toConfig(
  graphqlObject: GraphQLField<any, any>,
): GraphQLConfig<GraphQLField<any, any>>;
export function toConfig(
  graphqlObject: GraphQLInputField,
): GraphQLConfig<GraphQLInputField>;
export function toConfig<T extends GraphQLObject>(
  graphqlObject: T,
): GraphQLConfig<T>;
export function toConfig<T extends GraphQLObject>(
  graphqlObject: T,
): GraphQLConfig<T> {
  if (isSchema(graphqlObject)) {
    return schemaToConfig(graphqlObject) as GraphQLConfig<T>;
  } else if (isDirective(graphqlObject)) {
    return directiveToConfig(graphqlObject) as GraphQLConfig<T>;
  } else if (isNamedType(graphqlObject)) {
    return typeToConfig(graphqlObject) as GraphQLConfig<T>;
  }

  // Input and output fields do not have predicates defined, but using duck typing,
  // type is defined for input and output fields
  if (
    (graphqlObject as GraphQLField<any, any> | GraphQLInputField).type != null
  ) {
    if (
      (graphqlObject as GraphQLField<any, any>).args != null ||
      (graphqlObject as GraphQLField<any, any>).resolve != null ||
      (graphqlObject as GraphQLField<any, any>).subscribe != null
    ) {
      return fieldToConfig(
        graphqlObject as GraphQLField<any, any>,
      ) as GraphQLConfig<T>;
    } else if (
      (graphqlObject as GraphQLInputField).defaultValue !== undefined
    ) {
      return inputFieldToConfig(
        graphqlObject as GraphQLInputField,
      ) as GraphQLConfig<T>;
    }

    // Not all input and output fields can be checked by above in older versions
    // of graphql, but almost all properties on the field and config are identical.
    // In particular, just name and isDeprecated should be removed.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name, isDeprecated, ...rest } = graphqlObject as {
      name: string;
      isDeprecated: boolean;
    };
    const config = {
      ...rest,
    };
    return (config as unknown) as GraphQLConfig<T>;
  }

  throw new Error(
    `Unknown graphql object ${(graphqlObject as unknown) as string}`,
  );
}

export function typeToConfig(
  type: GraphQLObjectType,
): GraphQLConfig<GraphQLObjectType>;
export function typeToConfig(
  type: GraphQLInterfaceType,
): GraphQLConfig<GraphQLInterfaceType>;
export function typeToConfig(
  type: GraphQLUnionType,
): GraphQLConfig<GraphQLUnionType>;
export function typeToConfig(
  type: GraphQLEnumType,
): GraphQLConfig<GraphQLEnumType>;
export function typeToConfig(
  type: GraphQLScalarType,
): GraphQLConfig<GraphQLScalarType>;
export function typeToConfig(
  type: GraphQLInputObjectType,
): GraphQLConfig<GraphQLInputObjectType>;
export function typeToConfig<T extends GraphQLNamedType>(
  type: T,
): GraphQLConfig<T>;
export function typeToConfig<T extends GraphQLNamedType>(
  type: T,
): GraphQLConfig<T> {
  if (isObjectType(type)) {
    return objectTypeToConfig(type) as GraphQLConfig<T>;
  } else if (isInterfaceType(type)) {
    return interfaceTypeToConfig(type) as GraphQLConfig<T>;
  } else if (isUnionType(type)) {
    return unionTypeToConfig(type) as GraphQLConfig<T>;
  } else if (isEnumType(type)) {
    return enumTypeToConfig(type) as GraphQLConfig<T>;
  } else if (isScalarType(type)) {
    return scalarTypeToConfig(type) as GraphQLConfig<T>;
  } else if (isInputObjectType(type)) {
    return inputObjectTypeToConfig(type) as GraphQLConfig<T>;
  }

  throw new Error(`Unknown type ${(type as unknown) as string}`);
}

export function objectTypeToConfig(
  type: GraphQLObjectType,
): GraphQLObjectTypeConfig<any, any> {
  if ((type as any).toConfig != null) {
    return (type as any).toConfig();
  }

  const typeConfig = {
    name: type.name,
    description: type.description,
    interfaces: type.getInterfaces(),
    fields: fieldMapToConfig(type.getFields()),
    isTypeOf: type.isTypeOf,
    extensions: (type as any).extensions,
    astNode: type.astNode,
    extensionASTNodes:
      type.extensionASTNodes != null ? type.extensionASTNodes : [],
  };

  return typeConfig;
}

export function interfaceTypeToConfig(
  type: GraphQLInterfaceType,
): GraphQLInterfaceTypeConfig<any, any> {
  if ((type as any).toConfig != null) {
    return (type as any).toConfig();
  }

  const typeConfig = {
    name: type.name,
    description: type.description,
    fields: fieldMapToConfig(type.getFields()),
    resolveType: type.resolveType,
    extensions: (type as any).extensions,
    astNode: type.astNode,
    extensionASTNodes:
      type.extensionASTNodes != null ? type.extensionASTNodes : [],
  };

  if ((('getInterfaces' in type) as unknown) as GraphQLObjectType) {
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
  if ((type as any).toConfig != null) {
    return (type as any).toConfig();
  }

  const typeConfig = {
    name: type.name,
    description: type.description,
    types: type.getTypes(),
    resolveType: type.resolveType,
    extensions: (type as any).extensions,
    astNode: type.astNode,
    extensionASTNodes:
      type.extensionASTNodes != null ? type.extensionASTNodes : [],
  };

  return typeConfig;
}

export function enumTypeToConfig(type: GraphQLEnumType): GraphQLEnumTypeConfig {
  if ((type as any).toConfig != null) {
    return (type as any).toConfig();
  }

  const newValues = type.getValues().reduce<GraphQLEnumValueConfigMap>(
    (prev, value) => ({
      ...prev,
      [value.name]: {
        description: value.description,
        value: value.value,
        deprecationReason: value.deprecationReason,
        extensions: (value as any).extensions,
        astNode: value.astNode,
      },
    }),
    {},
  );

  const typeConfig = {
    name: type.name,
    description: type.description,
    values: newValues,
    extensions: (type as any).extensions,
    astNode: type.astNode,
    extensionASTNodes:
      type.extensionASTNodes != null ? type.extensionASTNodes : [],
  };

  return typeConfig;
}

export function scalarTypeToConfig(
  type: GraphQLScalarType,
): GraphQLScalarTypeConfig<any, any> {
  if ((type as any).toConfig != null) {
    return (type as any).toConfig();
  }

  const typeConfig = {
    name: type.name,
    description: type.description,
    serialize: type.serialize,
    parseValue: type.parseValue,
    parseLiteral: type.parseLiteral,
    extensions: (type as any).extensions,
    astNode: type.astNode,
    extensionASTNodes:
      type.extensionASTNodes != null ? type.extensionASTNodes : [],
  };

  return typeConfig;
}

export function inputObjectTypeToConfig(
  type: GraphQLInputObjectType,
): GraphQLInputObjectTypeConfig {
  if ((type as any).toConfig != null) {
    return (type as any).toConfig();
  }

  const typeConfig = {
    name: type.name,
    description: type.description,
    fields: inputFieldMapToConfig(type.getFields()),
    extensions: (type as any).extensions,
    astNode: type.astNode,
    extensionASTNodes:
      type.extensionASTNodes != null ? type.extensionASTNodes : [],
  };

  return typeConfig;
}

export function inputFieldMapToConfig(
  fields: GraphQLInputFieldMap,
): GraphQLInputFieldConfigMap {
  return Object.keys(fields).reduce(
    (prev, fieldName) => ({
      ...prev,
      [fieldName]: toConfig(fields[fieldName]),
    }),
    {},
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
  } as any;
}

export function directiveToConfig(
  directive: GraphQLDirective,
): GraphQLDirectiveConfig {
  if ((directive as any).toConfig != null) {
    return (directive as any).toConfig();
  }

  return {
    name: directive.name,
    description: directive.description,
    locations: directive.locations,
    args: argumentMapToConfig(directive.args),
    isRepeatable: (directive as any).isRepeatable,
    extensions: directive.extensions,
    astNode: directive.astNode,
  } as any;
}

export function fieldMapToConfig(
  fields: GraphQLFieldMap<any, any>,
): GraphQLFieldConfigMap<any, any> {
  return Object.keys(fields).reduce(
    (prev, fieldName) => ({
      ...prev,
      [fieldName]: toConfig(fields[fieldName]),
    }),
    {},
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
    extensions: (field as any).extensions,
    astNode: field.astNode,
  } as any;
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
    extensions: (arg as any).extensions,
    astNode: arg.astNode,
  } as any;
}
