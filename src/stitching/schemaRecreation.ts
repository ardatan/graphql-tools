import {
  GraphQLArgument,
  GraphQLArgumentConfig,
  GraphQLCompositeType,
  GraphQLField,
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLFieldConfigMap,
  GraphQLFieldMap,
  GraphQLInputField,
  GraphQLInputFieldConfig,
  GraphQLInputFieldConfigMap,
  GraphQLInputFieldMap,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLUnionType,
} from 'graphql';
import TypeRegistry from './TypeRegistry';
import resolveFromParentTypename from './resolveFromParentTypename';
import defaultMergedResolver from './defaultMergedResolver';

export function recreateCompositeType(
  schema: GraphQLSchema,
  type: GraphQLCompositeType | GraphQLInputObjectType,
  registry: TypeRegistry,
): GraphQLCompositeType | GraphQLInputObjectType {
  if (type instanceof GraphQLObjectType) {
    const fields = type.getFields();
    const interfaces = type.getInterfaces();

    return new GraphQLObjectType({
      name: type.name,
      description: type.description,
      isTypeOf: type.isTypeOf,
      astNode: type.astNode,
      fields: () => fieldMapToFieldConfigMap(fields, registry),
      interfaces: () => interfaces.map(iface => registry.resolveType(iface)),
    });
  } else if (type instanceof GraphQLInterfaceType) {
    const fields = type.getFields();

    return new GraphQLInterfaceType({
      name: type.name,
      description: type.description,
      astNode: type.astNode,
      fields: () => fieldMapToFieldConfigMap(fields, registry),
      resolveType: (parent, context, info) =>
        resolveFromParentTypename(parent, info.schema),
    });
  } else if (type instanceof GraphQLUnionType) {
    return new GraphQLUnionType({
      name: type.name,
      description: type.description,
      astNode: type.astNode,
      types: () =>
        type.getTypes().map(unionMember => registry.resolveType(unionMember)),
      resolveType: (parent, context, info) =>
        resolveFromParentTypename(parent, info.schema),
    });
  } else if (type instanceof GraphQLInputObjectType) {
    return new GraphQLInputObjectType({
      name: type.name,
      description: type.description,
      astNode: type.astNode,
      fields: () => inputFieldMapToFieldConfigMap(type.getFields(), registry),
    });
  } else {
    throw new Error(`Invalid type ${type}`);
  }
}

export function fieldMapToFieldConfigMap(
  fields: GraphQLFieldMap<any, any>,
  registry: TypeRegistry,
): GraphQLFieldConfigMap<any, any> {
  const result: GraphQLFieldConfigMap<any, any> = {};
  Object.keys(fields).forEach(name => {
    result[name] = fieldToFieldConfig(fields[name], registry);
  });
  return result;
}

function fieldToFieldConfig(
  field: GraphQLField<any, any>,
  registry: TypeRegistry,
): GraphQLFieldConfig<any, any> {
  return {
    type: registry.resolveType(field.type),
    args: argsToFieldConfigArgumentMap(field.args, registry),
    resolve: defaultMergedResolver,
    description: field.description,
    deprecationReason: field.deprecationReason,
    astNode: field.astNode
  };
}

function argsToFieldConfigArgumentMap(
  args: Array<GraphQLArgument>,
  registry: TypeRegistry,
): GraphQLFieldConfigArgumentMap {
  const result: GraphQLFieldConfigArgumentMap = {};
  args.forEach(arg => {
    const [name, def] = argumentToArgumentConfig(arg, registry);
    result[name] = def;
  });
  return result;
}

function argumentToArgumentConfig(
  argument: GraphQLArgument,
  registry: TypeRegistry,
): [string, GraphQLArgumentConfig] {
  return [
    argument.name,
    {
      type: registry.resolveType(argument.type),
      defaultValue: argument.defaultValue,
      description: argument.description,
    },
  ];
}

function inputFieldMapToFieldConfigMap(
  fields: GraphQLInputFieldMap,
  registry: TypeRegistry,
): GraphQLInputFieldConfigMap {
  const result: GraphQLInputFieldConfigMap = {};
  Object.keys(fields).forEach(name => {
    result[name] = inputFieldToFieldConfig(fields[name], registry);
  });
  return result;
}

function inputFieldToFieldConfig(
  field: GraphQLInputField,
  registry: TypeRegistry,
): GraphQLInputFieldConfig {
  return {
    type: registry.resolveType(field.type),
    defaultValue: field.defaultValue,
    description: field.description,
    astNode: field.astNode
  };
}
