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
  TypeNode,
  GraphQLType,
  SelectionSetNode,
  isNonNullType,
  isListType,
} from 'graphql';

import {
  ICreateRequestFromInfo,
  Request,
  isSubschemaConfig,
  ICreateRequest,
} from '../Interfaces';
import { serializeInputValue } from '../utils/index';

export function getDelegatingOperation(
  parentType: GraphQLObjectType,
  schema: GraphQLSchema,
): OperationTypeNode {
  if (parentType === schema.getMutationType()) {
    return 'mutation';
  } else if (parentType === schema.getSubscriptionType()) {
    return 'subscription';
  }

  return 'query';
}

export function createRequestFromInfo({
  info,
  schema: subschemaOrSubschemaConfig,
  transformedSchema,
  operation = getDelegatingOperation(info.parentType, info.schema),
  fieldName = info.fieldName,
  args,
  selectionSet,
  fieldNodes,
}: ICreateRequestFromInfo): Request {
  const sourceParentType = info.parentType;
  const sourceFieldName = info.fieldName;

  const fieldArguments = sourceParentType.getFields()[sourceFieldName].args;
  const defaultArgs = {};
  fieldArguments.forEach((argument) => {
    if (argument.defaultValue != null) {
      defaultArgs[argument.name] = argument.defaultValue;
    }
  });

  let targetSchema;
  if (transformedSchema != null) {
    targetSchema = transformedSchema;
  } else {
    targetSchema = isSubschemaConfig(subschemaOrSubschemaConfig)
      ? subschemaOrSubschemaConfig.schema
      : subschemaOrSubschemaConfig;
  }

  return createRequest({
    sourceSchema: info.schema,
    sourceParentType,
    sourceFieldName,
    fragments: info.fragments,
    variableDefinitions: info.operation.variableDefinitions,
    variableValues: info.variableValues,
    targetSchema,
    targetOperation: operation,
    targetField: fieldName,
    args,
    selectionSet,
    fieldNodes:
      selectionSet != null
        ? undefined
        : fieldNodes != null
        ? fieldNodes
        : info.fieldNodes,
    defaultArgs,
  });
}

export function createRequest({
  sourceSchema,
  sourceParentType,
  sourceFieldName,
  fragments,
  variableDefinitions,
  variableValues,
  targetSchema,
  targetOperation,
  targetField,
  args,
  selectionSet,
  fieldNodes,
  defaultArgs,
}: ICreateRequest): Request {
  let argumentNodes: ReadonlyArray<ArgumentNode>;

  let newSelectionSet: SelectionSetNode = selectionSet;
  let newVariableDefinitions: ReadonlyArray<VariableDefinitionNode> = variableDefinitions;

  if (!selectionSet && fieldNodes != null) {
    const selections: Array<SelectionNode> = fieldNodes.reduce(
      (acc, fieldNode) =>
        fieldNode.selectionSet != null
          ? acc.concat(fieldNode.selectionSet.selections)
          : acc,
      [],
    );

    newSelectionSet = selections.length
      ? {
          kind: Kind.SELECTION_SET,
          selections,
        }
      : undefined;

    argumentNodes = fieldNodes[0].arguments;
  } else {
    argumentNodes = [];
  }

  let variables = {};
  for (const variableDefinition of variableDefinitions) {
    const varName = variableDefinition.variable.name.value;
    const varType = typeFromAST(
      sourceSchema,
      variableDefinition.type as NamedTypeNode,
    ) as GraphQLInputType;
    variables[varName] = serializeInputValue(varType, variableValues[varName]);
  }

  const {
    arguments: updatedArguments,
    variableDefinitions: updatedVariableDefinitions,
    variableValues: updatedVariableValues,
  } = updateArguments(
    sourceParentType,
    sourceFieldName,
    targetSchema,
    targetOperation,
    targetField,
    argumentNodes,
    variableDefinitions,
    variables,
    args,
    defaultArgs,
  );
  argumentNodes = updatedArguments;
  newVariableDefinitions = updatedVariableDefinitions;
  variables = updatedVariableValues;

  const rootfieldNode: FieldNode = {
    kind: Kind.FIELD,
    alias: null,
    arguments: argumentNodes,
    selectionSet: newSelectionSet,
    name: {
      kind: Kind.NAME,
      value: targetField || fieldNodes[0].name.value,
    },
  };

  const operationDefinition: OperationDefinitionNode = {
    kind: Kind.OPERATION_DEFINITION,
    operation: targetOperation,
    variableDefinitions: newVariableDefinitions,
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections: [rootfieldNode],
    },
  };

  const fragmentDefinitions: Array<FragmentDefinitionNode> = Object.keys(
    fragments,
  ).map((fragmentName) => fragments[fragmentName]);

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
  sourceParentType: GraphQLObjectType,
  sourceFieldName: string,
  targetSchema: GraphQLSchema,
  operation: OperationTypeNode,
  fieldName: string,
  argumentNodes: ReadonlyArray<ArgumentNode> = [],
  variableDefinitions: ReadonlyArray<VariableDefinitionNode> = [],
  variableValues: Record<string, any> = {},
  newArgs: Record<string, any> = {},
  defaultArgs: Record<string, any> = {},
): {
  arguments: Array<ArgumentNode>;
  variableDefinitions: Array<VariableDefinitionNode>;
  variableValues: Record<string, any>;
} {
  let type: GraphQLObjectType;
  if (operation === 'subscription') {
    type = targetSchema.getSubscriptionType();
  } else if (operation === 'mutation') {
    type = targetSchema.getMutationType();
  } else {
    type = targetSchema.getQueryType();
  }

  const updatedVariableDefinitions = {};
  const varNames = {};
  variableDefinitions.forEach((def) => {
    const varName = def.variable.name.value;
    updatedVariableDefinitions[varName] = def;
    varNames[varName] = true;
  });
  let numGeneratedVariables = 0;

  const updatedArgs: Record<string, ArgumentNode> = {};
  argumentNodes.forEach((argument: ArgumentNode) => {
    updatedArgs[argument.name.value] = argument;
  });

  const field: GraphQLField<any, any> = type.getFields()[fieldName];
  if (field != null) {
    field.args.forEach((argument: GraphQLArgument) => {
      const argName = argument.name;

      let newArg;
      let argType;
      if (newArgs[argName] != null) {
        newArg = newArgs[argName];
        argType = argument.type;
      } else if (updatedArgs[argName] == null && defaultArgs[argName] != null) {
        newArg = defaultArgs[argName];
        const sourcefield = sourceParentType.getFields()[sourceFieldName];
        argType = sourcefield.args.find((arg) => arg.name === argName).type;
      }

      if (newArg != null) {
        numGeneratedVariables++;
        updateArgument(
          argName,
          argType,
          numGeneratedVariables,
          varNames,
          updatedArgs,
          updatedVariableDefinitions,
          variableValues,
          newArg,
        );
      }
    });
  }

  return {
    arguments: Object.keys(updatedArgs).map((argName) => updatedArgs[argName]),
    variableDefinitions: Object.keys(updatedVariableDefinitions).map(
      (varName) => updatedVariableDefinitions[varName],
    ),
    variableValues,
  };
}

function updateArgument(
  argName: string,
  argType: GraphQLInputType,
  numGeneratedVariables: number,
  varNames: Record<string, boolean>,
  updatedArgs: Record<string, ArgumentNode>,
  updatedVariableDefinitions: Record<string, VariableDefinitionNode>,
  variableValues: Record<string, any>,
  newArg: any,
) {
  let varName;
  do {
    varName = `_v${numGeneratedVariables.toString()}_${argName}`;
  } while (varNames[varName]);

  updatedArgs[argName] = {
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
  updatedVariableDefinitions[varName] = {
    kind: Kind.VARIABLE_DEFINITION,
    variable: {
      kind: Kind.VARIABLE,
      name: {
        kind: Kind.NAME,
        value: varName,
      },
    },
    type: astFromType(argType),
  };
  variableValues[varName] = serializeInputValue(argType, newArg);
}

function astFromType(type: GraphQLType): TypeNode {
  if (isNonNullType(type)) {
    const innerType = astFromType(type.ofType);
    if (innerType.kind === Kind.NON_NULL_TYPE) {
      throw new Error(
        `Invalid type node ${JSON.stringify(
          type,
        )}. Inner type of non-null type cannot be a non-null type.`,
      );
    }
    return {
      kind: Kind.NON_NULL_TYPE,
      type: innerType,
    };
  } else if (isListType(type)) {
    return {
      kind: Kind.LIST_TYPE,
      type: astFromType(type.ofType),
    };
  }

  return {
    kind: Kind.NAMED_TYPE,
    name: {
      kind: Kind.NAME,
      value: type.name,
    },
  };
}
