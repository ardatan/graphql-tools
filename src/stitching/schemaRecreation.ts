import {
  GraphQLArgument,
  GraphQLArgumentConfig,
  GraphQLField,
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLInputField,
  GraphQLInputFieldConfig,
  GraphQLInputFieldConfigMap,
  GraphQLInputFieldMap,
} from 'graphql';

export function fieldToFieldConfig(
  field: GraphQLField<any, any>,
): GraphQLFieldConfig<any, any> {
  return {
    type: field.type,
    args: argsToFieldConfigArgumentMap(field.args),
    resolve: field.resolve,
    subscribe: field.subscribe,
    description: field.description,
    deprecationReason: field.deprecationReason,
    astNode: field.astNode,
  };
}

export function argsToFieldConfigArgumentMap(
  args: Array<GraphQLArgument>,
): GraphQLFieldConfigArgumentMap {
  const result: GraphQLFieldConfigArgumentMap = {};
  args.forEach(arg => {
    const newArg = argumentToArgumentConfig(arg);
    if (newArg) {
      result[newArg[0]] = newArg[1];
    }
  });
  return result;
}

export function argumentToArgumentConfig(
  argument: GraphQLArgument,
): [string, GraphQLArgumentConfig] | null {
  return [
    argument.name,
    {
      type: argument.type,
      defaultValue: argument.defaultValue,
      description: argument.description,
      astNode: argument.astNode,
    },
  ];
}

export function inputFieldMapToFieldConfigMap(
  fields: GraphQLInputFieldMap,
): GraphQLInputFieldConfigMap {
  const result: GraphQLInputFieldConfigMap = {};
  Object.keys(fields).forEach(name => {
    result[name] = inputFieldToFieldConfig(fields[name]);
  });
  return result;
}

export function inputFieldToFieldConfig(
  field: GraphQLInputField,
): GraphQLInputFieldConfig {
  return {
    type: field.type,
    defaultValue: field.defaultValue,
    description: field.description,
    astNode: field.astNode,
  };
}
