import {
  GraphQLArgument,
  GraphQLArgumentConfig,
  GraphQLEnumType,
  GraphQLField,
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLFieldConfigMap,
  GraphQLFieldMap,
  GraphQLInputField,
  GraphQLInputFieldConfig,
  GraphQLInputType,
  GraphQLInputFieldConfigMap,
  GraphQLInputFieldMap,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLType,
  GraphQLUnionType,
  GraphQLDirective,
  Kind,
  ValueNode,
  getNamedType,
  isNamedType,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  GraphQLBoolean,
  GraphQLID,
} from 'graphql';
import isSpecifiedScalarType from '../utils/isSpecifiedScalarType';
import { ResolveType } from '../Interfaces';
import resolveFromParentTypename from './resolveFromParentTypename';
import defaultMergedResolver from './defaultMergedResolver';
import { isStub } from './typeFromAST';
import {
  serializeInputValue,
  parseInputValue,
  parseInputValueLiteral
} from '../utils/transformInputValue';

export function recreateType(
  type: GraphQLNamedType,
  resolveType: ResolveType<any>,
  keepResolvers: boolean,
): GraphQLNamedType {
  if (type instanceof GraphQLObjectType) {
    const fields = type.getFields();
    const interfaces = type.getInterfaces();

    return new GraphQLObjectType({
      name: type.name,
      description: type.description,
      astNode: type.astNode,
      isTypeOf: keepResolvers ? type.isTypeOf : undefined,
      fields: () =>
        fieldMapToFieldConfigMap(fields, resolveType, keepResolvers),
      interfaces: () => interfaces.map(iface => resolveType(iface)),
    });
  } else if (type instanceof GraphQLInterfaceType) {
    const fields = type.getFields();

    return new GraphQLInterfaceType({
      name: type.name,
      description: type.description,
      astNode: type.astNode,
      fields: () =>
        fieldMapToFieldConfigMap(fields, resolveType, keepResolvers),
      resolveType: keepResolvers
        ? type.resolveType
        : (parent, context, info) =>
            resolveFromParentTypename(parent, info.schema),
    });
  } else if (type instanceof GraphQLUnionType) {
    return new GraphQLUnionType({
      name: type.name,
      description: type.description,
      astNode: type.astNode,

      types: () => type.getTypes().map(unionMember => resolveType(unionMember)),
      resolveType: keepResolvers
        ? type.resolveType
        : (parent, context, info) =>
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
      newValues[value.name] = {
        value: value.value,
        deprecationReason: value.deprecationReason,
        description: value.description,
        astNode: value.astNode,
      };
    });
    return new GraphQLEnumType({
      name: type.name,
      description: type.description,
      astNode: type.astNode,
      values: newValues,
    });
  } else if (type instanceof GraphQLScalarType) {
    if (isSpecifiedScalarType(type)) {
      return type;
    } else {
      return new GraphQLScalarType({
        name: type.name,
        description: type.description,
        astNode: type.astNode,
        serialize: type.serialize ? type.serialize : (value: any) => value,
        parseValue: type.parseValue ? type.parseValue : (value: any) => value,
        parseLiteral: type.parseLiteral ? type.parseLiteral : (ast: any) => parseLiteral(ast),
      });
    }
  } else {
    throw new Error(`Invalid type ${type}`);
  }
}

export function recreateDirective(
  directive: GraphQLDirective,
  resolveType: ResolveType<any>,
): GraphQLDirective {
  return new GraphQLDirective({
    name: directive.name,
    description: directive.description,
    locations: directive.locations,
    args: argsToFieldConfigArgumentMap(directive.args, resolveType),
    astNode: directive.astNode,
  });
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
  keepResolvers: boolean,
): GraphQLFieldConfigMap<any, any> {
  const result: GraphQLFieldConfigMap<any, any> = {};
  Object.keys(fields).forEach(name => {
    const field = fields[name];
    const type = resolveType(field.type);
    if (type !== null) {
      result[name] = fieldToFieldConfig(
        fields[name],
        resolveType,
        keepResolvers,
      );
    }
  });
  return result;
}

export function createResolveType(
  getType: (name: string, type: GraphQLType) => GraphQLType | null,
): ResolveType<any> {
  const resolveType = <T extends GraphQLType>(type: T): T | GraphQLType => {
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
      const typeName = getNamedType(type).name;
      switch (typeName) {
        case GraphQLInt.name:
          return GraphQLInt;
        case GraphQLFloat.name:
          return GraphQLFloat;
        case GraphQLString.name:
          return GraphQLString;
        case GraphQLBoolean.name:
          return GraphQLBoolean;
        case GraphQLID.name:
          return GraphQLID;
        default:
          return getType(typeName, type);
      }
    } else {
      return type;
    }
  };
  return resolveType;
}

export function fieldToFieldConfig(
  field: GraphQLField<any, any>,
  resolveType: ResolveType<any>,
  keepResolvers: boolean,
): GraphQLFieldConfig<any, any> {
  return {
    type: resolveType(field.type),
    args: argsToFieldConfigArgumentMap(field.args, resolveType),
    resolve: keepResolvers ? field.resolve : defaultMergedResolver,
    subscribe: keepResolvers ? field.subscribe : null,
    description: field.description,
    deprecationReason: field.deprecationReason,
    astNode: field.astNode,
  };
}

export function argsToFieldConfigArgumentMap(
  args: Array<GraphQLArgument>,
  resolveType: ResolveType<any>,
): GraphQLFieldConfigArgumentMap {
  const result: GraphQLFieldConfigArgumentMap = {};
  args.forEach(arg => {
    const newArg = argumentToArgumentConfig(arg, resolveType);
    if (newArg) {
      result[newArg[0]] = newArg[1];
    }
  });
  return result;
}

export function argumentToArgumentConfig(
  argument: GraphQLArgument,
  resolveType: ResolveType<any>,
): [string, GraphQLArgumentConfig] | null {
  const type = resolveType(argument.type);
  if (type === null) {
    return null;
  } else {
    return [
      argument.name,
      {
        type,
        defaultValue: reparseDefaultValue(argument.defaultValue, argument.type, type),
        description: argument.description,
        astNode: argument.astNode,
      },
    ];
  }
}

export function inputFieldMapToFieldConfigMap(
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

export function inputFieldToFieldConfig(
  field: GraphQLInputField,
  resolveType: ResolveType<any>,
): GraphQLInputFieldConfig {
  const type = resolveType(field.type);
  return {
    type,
    defaultValue: reparseDefaultValue(field.defaultValue, field.type, type),
    description: field.description,
    astNode: field.astNode,
  };
}

function reparseDefaultValue(
  originalDefaultValue: any,
  originalType: GraphQLInputType,
  newType: GraphQLInputType,
) {
  if (
    originalType instanceof GraphQLInputObjectType &&
    isStub(getNamedType(originalType) as GraphQLInputObjectType)
  ) {
    return parseInputValueLiteral(newType, originalDefaultValue);
  }
  return parseInputValue(newType, serializeInputValue(originalType, originalDefaultValue));
}
