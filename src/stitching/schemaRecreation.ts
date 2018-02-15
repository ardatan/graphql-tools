import {
  GraphQLArgument,
  GraphQLArgumentConfig,
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLField,
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLFieldConfigMap,
  GraphQLFieldMap,
  GraphQLFloat,
  GraphQLID,
  GraphQLInputField,
  GraphQLInputFieldConfig,
  GraphQLInputFieldConfigMap,
  GraphQLInputFieldMap,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLString,
  GraphQLType,
  GraphQLUnionType,
  Kind,
  ValueNode,
  getNamedType,
  isNamedType,
} from 'graphql';
import { ResolveType } from '../Interfaces';
import resolveFromParentTypename from './resolveFromParentTypename';
import defaultMergedResolver from './defaultMergedResolver';

export function recreateType(
  type: GraphQLNamedType,
  resolveType: ResolveType<any>,
): GraphQLNamedType {
  if (type instanceof GraphQLObjectType) {
    const fields = type.getFields();
    const interfaces = type.getInterfaces();

    return new GraphQLObjectType({
      name: type.name,
      description: type.description,
      astNode: type.astNode,
      fields: () => fieldMapToFieldConfigMap(fields, resolveType),
      interfaces: () => interfaces.map(iface => resolveType(iface)),
    });
  } else if (type instanceof GraphQLInterfaceType) {
    const fields = type.getFields();

    return new GraphQLInterfaceType({
      name: type.name,
      description: type.description,
      astNode: type.astNode,
      fields: () => fieldMapToFieldConfigMap(fields, resolveType),
      resolveType: (parent, context, info) =>
        resolveFromParentTypename(parent, info.schema),
    });
  } else if (type instanceof GraphQLUnionType) {
    return new GraphQLUnionType({
      name: type.name,
      description: type.description,
      astNode: type.astNode,

      types: () => type.getTypes().map(unionMember => resolveType(unionMember)),
      resolveType: (parent, context, info) =>
        resolveFromParentTypename(parent, info.schema),
    });
  } else if (type instanceof GraphQLInputObjectType) {
    return new GraphQLInputObjectType({
      name: type.name,
      description: type.description,
      astNode: type.astNode,

      fields: () =>
        inputFieldMapToFieldConfigMap(type.getFields(), resolveType),
    });
  } else if (type instanceof GraphQLEnumType) {
    const values = type.getValues();
    const newValues = {};
    values.forEach(value => {
      newValues[value.name] = { value: value.name };
    });
    return new GraphQLEnumType({
      name: type.name,
      description: type.description,
      astNode: type.astNode,
      values: newValues,
    });
  } else if (type instanceof GraphQLScalarType) {
    if (
      type === GraphQLID ||
      type === GraphQLString ||
      type === GraphQLFloat ||
      type === GraphQLBoolean ||
      type === GraphQLInt
    ) {
      return type;
    } else {
      return new GraphQLScalarType({
        name: type.name,
        description: type.description,
        astNode: type.astNode,
        serialize(value: any) {
          return value;
        },
        parseValue(value: any) {
          return value;
        },
        parseLiteral(ast: ValueNode) {
          return parseLiteral(ast);
        },
      });
    }
  } else {
    throw new Error(`Invalid type ${type}`);
  }
}

function parseLiteral(ast: ValueNode): any {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN: {
      return ast.value;
    }
    case Kind.INT:
    case Kind.FLOAT: {
      return parseFloat(ast.value);
    }
    case Kind.OBJECT: {
      const value = Object.create(null);
      ast.fields.forEach(field => {
        value[field.name.value] = parseLiteral(field.value);
      });

      return value;
    }
    case Kind.LIST: {
      return ast.values.map(parseLiteral);
    }
    default:
      return null;
  }
}

export function fieldMapToFieldConfigMap(
  fields: GraphQLFieldMap<any, any>,
  resolveType: ResolveType<any>,
): GraphQLFieldConfigMap<any, any> {
  const result: GraphQLFieldConfigMap<any, any> = {};
  Object.keys(fields).forEach(name => {
    const field = fields[name];
    const type = resolveType(field.type);
    if (type !== null) {
      result[name] = fieldToFieldConfig(fields[name], resolveType);
    }
  });
  return result;
}

export function createResolveType(
  getType: (name: string, type: GraphQLType) => GraphQLType | null,
): ResolveType<any> {
  const resolveType = <T extends GraphQLType>(type: T): T => {
    if (type instanceof GraphQLList) {
      const innerType = resolveType(type.ofType);
      if (innerType === null) {
        return null;
      } else {
        return new GraphQLList(innerType) as T;
      }
    } else if (type instanceof GraphQLNonNull) {
      const innerType = resolveType(type.ofType);
      if (innerType === null) {
        return null;
      } else {
        return new GraphQLNonNull(innerType) as T;
      }
    } else if (isNamedType(type)) {
      return getType(getNamedType(type).name, type) as T;
    } else {
      return type;
    }
  };
  return resolveType;
}

function fieldToFieldConfig(
  field: GraphQLField<any, any>,
  resolveType: ResolveType<any>,
): GraphQLFieldConfig<any, any> {
  return {
    type: resolveType(field.type),
    args: argsToFieldConfigArgumentMap(field.args, resolveType),
    resolve: defaultMergedResolver,
    description: field.description,
    deprecationReason: field.deprecationReason,
    astNode: field.astNode,
  };
}

function argsToFieldConfigArgumentMap(
  args: Array<GraphQLArgument>,
  resolveType: ResolveType<any>,
): GraphQLFieldConfigArgumentMap {
  const result: GraphQLFieldConfigArgumentMap = {};
  args.forEach(arg => {
    const [name, def] = argumentToArgumentConfig(arg, resolveType);
    result[name] = def;
  });
  return result;
}

function argumentToArgumentConfig(
  argument: GraphQLArgument,
  resolveType: ResolveType<any>,
): [string, GraphQLArgumentConfig] {
  return [
    argument.name,
    {
      type: resolveType(argument.type),
      defaultValue: argument.defaultValue,
      description: argument.description,
    },
  ];
}

function inputFieldMapToFieldConfigMap(
  fields: GraphQLInputFieldMap,
  resolveType: ResolveType<any>,
): GraphQLInputFieldConfigMap {
  const result: GraphQLInputFieldConfigMap = {};
  Object.keys(fields).forEach(name => {
    const field = fields[name];
    const type = resolveType(field.type);
    if (type !== null) {
      result[name] = inputFieldToFieldConfig(fields[name], resolveType);
    }
  });
  return result;
}

function inputFieldToFieldConfig(
  field: GraphQLInputField,
  resolveType: ResolveType<any>,
): GraphQLInputFieldConfig {
  return {
    type: resolveType(field.type),
    defaultValue: field.defaultValue,
    description: field.description,
    astNode: field.astNode,
  };
}
