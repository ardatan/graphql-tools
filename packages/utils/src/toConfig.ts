import {
  GraphQLArgument,
  GraphQLFieldConfigArgumentMap,
  GraphQLField,
  GraphQLInputField,
  GraphQLInputFieldConfig,
  GraphQLArgumentConfig,
  GraphQLFieldConfig,
} from 'graphql';

export function inputFieldToFieldConfig(field: GraphQLInputField): GraphQLInputFieldConfig {
  return {
    description: field.description,
    type: field.type,
    defaultValue: field.defaultValue,
    extensions: field.extensions,
    astNode: field.astNode,
  };
}

export function fieldToFieldConfig(field: GraphQLField<any, any>): GraphQLFieldConfig<any, any> {
  return {
    description: field.description,
    type: field.type,
    args: argsToFieldConfigArgumentMap(field.args),
    resolve: field.resolve,
    subscribe: field.subscribe,
    deprecationReason: field.deprecationReason,
    extensions: field.extensions,
    astNode: field.astNode,
  };
}

export function argsToFieldConfigArgumentMap(args: ReadonlyArray<GraphQLArgument>): GraphQLFieldConfigArgumentMap {
  const newArguments = {};
  args.forEach(arg => {
    newArguments[arg.name] = argumentToArgumentConfig(arg);
  });

  return newArguments;
}

export function argumentToArgumentConfig(arg: GraphQLArgument): GraphQLArgumentConfig {
  return {
    description: arg.description,
    type: arg.type,
    defaultValue: arg.defaultValue,
    extensions: arg.extensions,
    astNode: arg.astNode,
  };
}
