import {
  ArgumentNode,
  FieldNode,
  FragmentDefinitionNode,
  Kind,
  OperationDefinitionNode,
  SelectionNode,
  GraphQLSchema,
  GraphQLObjectType,
  OperationTypeNode,
  typeFromAST,
  NamedTypeNode,
  GraphQLInputType,
  GraphQLField,
  GraphQLArgument,
  VariableDefinitionNode,
  GraphQLList,
  GraphQLNonNull,
  TypeNode,
  GraphQLType,
} from 'graphql';

import {
  ICreateRequestFromInfo,
  Operation,
  Request,
  SubschemaConfig,
  isSubschemaConfig,
} from '../Interfaces';

import { serializeInputValue } from '../utils';

export function getDelegatingOperation(
  parentType: GraphQLObjectType,
  schema: GraphQLSchema
): OperationTypeNode {
  if (parentType === schema.getMutationType()) {
    return 'mutation';
  } else if (parentType === schema.getSubscriptionType()) {
    return 'subscription';
  } else {
    return 'query';
  }
}

export function createRequestFromInfo({
  info,
  schema,
  operation = getDelegatingOperation(info.parentType, info.schema),
  fieldName = info.fieldName,
  additionalArgs,
  fieldNodes = info.fieldNodes,
}: ICreateRequestFromInfo): Request {
  return createRequest(
    info.schema,
    info.fragments,
    info.operation.variableDefinitions,
    info.variableValues,
    schema,
    operation,
    fieldName,
    additionalArgs,
    fieldNodes,
  );
}

export function createRequest(
  sourceSchema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  variableDefinitions: ReadonlyArray<VariableDefinitionNode>,
  variableValues: Record<string, any>,
  targetSchemaOrSchemaConfig: GraphQLSchema | SubschemaConfig,
  targetOperation: Operation,
  targetField: string,
  additionalArgs: Record<string, any>,
  fieldNodes: ReadonlyArray<FieldNode>,
): Request {
  let selections: Array<SelectionNode> = [];
  const originalSelections: ReadonlyArray<SelectionNode> = fieldNodes;
  originalSelections.forEach((field: FieldNode) => {
    const fieldSelections = field.selectionSet
      ? field.selectionSet.selections
      : [];
    selections = selections.concat(fieldSelections);
  });

  let selectionSet = undefined;
  if (selections.length > 0) {
    selectionSet = {
      kind: Kind.SELECTION_SET,
      selections: selections,
    };
  }

  let variables = {};
  for (const variableDefinition of variableDefinitions) {
    const varName = variableDefinition.variable.name.value;
    const varType = typeFromAST(sourceSchema, (variableDefinition.type as NamedTypeNode)) as GraphQLInputType;
    variables[varName] = serializeInputValue(varType, variableValues[varName]);
  }

  let args = fieldNodes[0].arguments;
  if (additionalArgs) {
    const {
      arguments: updatedArguments,
      variableDefinitions: updatedVariableDefinitions,
      variableValues: updatedVariableValues
    } = updateArguments(
      targetSchemaOrSchemaConfig,
      targetOperation,
      targetField,
      args,
      variableDefinitions,
      variables,
      additionalArgs,
      );
    args = updatedArguments;
    variableDefinitions = updatedVariableDefinitions;
    variables = updatedVariableValues;
  }

  const fieldNode: FieldNode = {
    kind: Kind.FIELD,
    alias: null,
    arguments: args,
    selectionSet,
    name: {
      kind: Kind.NAME,
      value: targetField || fieldNodes[0].name.value,
    },
  };

  const operationDefinition: OperationDefinitionNode = {
    kind: Kind.OPERATION_DEFINITION,
    operation: targetOperation,
    variableDefinitions,
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections: [fieldNode],
    },
  };

  const fragmentDefinitions: Array<FragmentDefinitionNode> = Object.keys(fragments).map(
    fragmentName => fragments[fragmentName],
  );

  const document = {
    kind: Kind.DOCUMENT,
    definitions: [operationDefinition, ...fragmentDefinitions],
  };

  return {
    document,
    variables,
  };
}

function updateArguments(
  subschemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig,
  operation: OperationTypeNode,
  fieldName: string,
  argumentNodes: ReadonlyArray<ArgumentNode> = [],
  variableDefinitions: ReadonlyArray<VariableDefinitionNode> = [],
  variableValues: Record<string, any> = {},
  newArgsMap: Record<string, any> = {},
): {
  arguments: Array<ArgumentNode>,
  variableDefinitions: Array<VariableDefinitionNode>,
  variableValues: Record<string, any>
} {
  const schema = isSubschemaConfig(subschemaOrSubschemaConfig) ?
    subschemaOrSubschemaConfig.schema : subschemaOrSubschemaConfig;

  let type: GraphQLObjectType;
  if (operation === 'subscription') {
    type = schema.getSubscriptionType();
  } else if (operation === 'mutation') {
    type = schema.getMutationType();
  } else {
    type = schema.getQueryType();
  }

  let varNames = variableDefinitions.reduce((acc, def) => {
    acc[def.variable.name.value] = true;
    return acc;
  }, {});
  let numGeneratedVariables = 0;

  const updatedArgs: Record<string, ArgumentNode> = {};
  argumentNodes.forEach((argument: ArgumentNode) => {
    updatedArgs[argument.name.value] = argument;
  });
  const newVariableDefinitions: Array<VariableDefinitionNode> = [];

  const field: GraphQLField<any, any> = type.getFields()[fieldName];
  field.args.forEach((argument: GraphQLArgument) => {
    if (newArgsMap[argument.name]) {
      const argName = argument.name;
      let varName;
      do {
        varName = `_v${numGeneratedVariables++}_${argName}`;
      } while (varNames[varName]);

      updatedArgs[argument.name] = {
        kind: Kind.ARGUMENT,
        name: {
          kind: Kind.NAME,
          value: argName,
        },
        value: {
          kind: Kind.VARIABLE,
          name: {
            kind: Kind.NAME,
            value: varName,
          },
        },
      };
      varNames[varName] = true;
      newVariableDefinitions.push({
        kind: Kind.VARIABLE_DEFINITION,
        variable: {
          kind: Kind.VARIABLE,
          name: {
            kind: Kind.NAME,
            value: varName,
          },
        },
        type: astFromType(argument.type),
      });
      variableValues[varName] = serializeInputValue(
        argument.type,
        newArgsMap[argName],
      );
    }
  });

  return {
    arguments: Object.keys(updatedArgs).map(argName => updatedArgs[argName]),
    variableDefinitions: newVariableDefinitions,
    variableValues,
  };
}

function astFromType(type: GraphQLType): TypeNode {
  if (type instanceof GraphQLNonNull) {
    const innerType = astFromType(type.ofType);
    if (innerType.kind === Kind.NON_NULL_TYPE) {
      throw new Error(`Invalid type node ${JSON.stringify(type)}. Inner type of non-null type cannot be a non-null type.`);
    }
    return {
      kind: Kind.NON_NULL_TYPE,
      type: innerType,
    };
  } else if (type instanceof GraphQLList) {
    return {
      kind: Kind.LIST_TYPE,
      type: astFromType(type.ofType),
    };
  } else {
    return {
      kind: Kind.NAMED_TYPE,
      name: {
        kind: Kind.NAME,
        value: type.name,
      },
    };
  }
}
