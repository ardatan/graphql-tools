import {
  ArgumentNode,
  GraphQLField,
  GraphQLSchema,
  Kind,
  OperationDefinitionNode,
  SelectionNode,
  VariableDefinitionNode,
} from 'graphql';

import {
  getDefinedRootType,
  ExecutionRequest,
  serializeInputValue,
  updateArgument,
  createVariableNameGenerator,
} from '@graphql-tools/utils';

import { Transform, DelegationContext } from '../types';
import { getDocumentMetadata } from '../getDocumentMetadata';

export default class FinalizeGatewayRequest implements Transform {
  private readonly args: Record<string, any>;

  constructor(args: Record<string, any>) {
    this.args = args;
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext,
    _transformationContext: Record<string, any>
  ): ExecutionRequest {
    const { document, variables } = originalRequest;

    const { operations, fragments } = getDocumentMetadata(document);
    const { targetSchema } = delegationContext;
    const { newOperations, newVariableValues } = addVariablesToRootFields(targetSchema, operations, this.args);

    const newDocument = {
      kind: Kind.DOCUMENT,
      definitions: [...newOperations, ...fragments],
    };

    return {
      ...originalRequest,
      document: newDocument,
      variables: Object.assign({}, variables, newVariableValues),
    };
  }
}

function addVariablesToRootFields(
  targetSchema: GraphQLSchema,
  operations: Array<OperationDefinitionNode>,
  args: Record<string, any>
): {
  newOperations: Array<OperationDefinitionNode>;
  newVariableValues: Record<string, any>;
} {
  const newVariableValues = Object.create(null);

  const newOperations = operations.map((operation: OperationDefinitionNode) => {
    const variableDefinitionMap: Record<string, VariableDefinitionNode> = (operation.variableDefinitions ?? []).reduce(
      (prev, def) => ({
        ...prev,
        [def.variable.name.value]: def,
      }),
      {}
    );

    const type = getDefinedRootType(targetSchema, operation.operation);

    const newSelectionSet: Array<SelectionNode> = [];

    for (const selection of operation.selectionSet.selections) {
      if (selection.kind === Kind.FIELD) {
        const argumentNodes = selection.arguments ?? [];
        const argumentNodeMap: Record<string, ArgumentNode> = argumentNodes.reduce(
          (prev, argument) => ({
            ...prev,
            [argument.name.value]: argument,
          }),
          {}
        );

        const targetField = type.getFields()[selection.name.value];

        // excludes __typename
        if (targetField != null) {
          updateArguments(targetField, argumentNodeMap, variableDefinitionMap, newVariableValues, args);
        }

        newSelectionSet.push({
          ...selection,
          arguments: Object.values(argumentNodeMap),
        });
      } else {
        newSelectionSet.push(selection);
      }
    }

    return {
      ...operation,
      variableDefinitions: Object.values(variableDefinitionMap),
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections: newSelectionSet,
      },
    };
  });

  return {
    newOperations,
    newVariableValues,
  };
}

function updateArguments(
  targetField: GraphQLField<any, any>,
  argumentNodeMap: Record<string, ArgumentNode>,
  variableDefinitionMap: Record<string, VariableDefinitionNode>,
  variableValues: Record<string, any>,
  newArgs: Record<string, any>
): void {
  const generateVariableName = createVariableNameGenerator(variableDefinitionMap);

  for (const argument of targetField.args) {
    const argName = argument.name;
    const argType = argument.type;

    if (argName in newArgs) {
      updateArgument(
        argumentNodeMap,
        variableDefinitionMap,
        variableValues,
        argName,
        generateVariableName(argName),
        argType,
        serializeInputValue(argType, newArgs[argName])
      );
    }
  }
}
