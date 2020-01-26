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
  argumentNodes: ReadonlyArray<ArgumentNode>,
  variableDefinitions: ReadonlyArray<VariableDefinitionNode>,
  variableValues: Record<string, any>,
  newArgsMap: Record<string, any>,
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

  const newArgs: Record<string, ArgumentNode> = {};
  if (argumentNodes) {
    argumentNodes.forEach((argument: ArgumentNode) => {
      newArgs[argument.name.value] = argument;
    });
  }

  let varNames = variableDefinitions.reduce((acc, def) => {
    acc[def.variable.name.value] = true;
    return acc;
  }, {});

  const variables = {};
  let numGeneratedVariables = 0;

  const field: GraphQLField<any, any> = type.getFields()[fieldName];
  field.args.forEach((argument: GraphQLArgument) => {
    if (newArgsMap[argument.name]) {
      const argName = argument.name;
      let varName;
      do {
        varName = `_v${numGeneratedVariables++}_${argName}`;
      } while (varNames[varName]);

      newArgs[argument.name] = {
        kind: Kind.ARGUMENT,
        name: {
          kind: Kind.NAME,
          value: argument.name,
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
      variables[varName] = {
        kind: Kind.VARIABLE_DEFINITION,
        variable: {
          kind: Kind.VARIABLE,
          name: {
            kind: Kind.NAME,
            value: varName,
          },
        },
        type: typeToAst(argument.type),
      };
      variableValues[varName] = serializeInputValue(
        argument.type,
        newArgsMap[argument.name],
      );
    }
  });

  return {
    arguments: Object.keys(newArgs).map(argName => newArgs[argName]),
    variableDefinitions: variableDefinitions.concat(
      Object.keys(variables).map(varName => variables[varName]),
    ),
    variableValues,
  };
}

function typeToAst(type: GraphQLInputType): TypeNode {
  if (type instanceof GraphQLNonNull) {
    const innerType = typeToAst(type.ofType);
    if (
      innerType.kind === Kind.LIST_TYPE ||
      innerType.kind === Kind.NAMED_TYPE
    ) {
      return {
        kind: Kind.NON_NULL_TYPE,
        type: innerType,
      };
    } else {
      throw new Error('Incorrent inner non-null type');
    }
  } else if (type instanceof GraphQLList) {
    return {
      kind: Kind.LIST_TYPE,
      type: typeToAst(type.ofType),
    };
  } else {
    return {
      kind: Kind.NAMED_TYPE,
      name: {
        kind: Kind.NAME,
        value: type.toString(),
      },
    };
  }
}
