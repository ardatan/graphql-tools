import {
  ArgumentNode,
  DocumentNode,
  FragmentDefinitionNode,
  GraphQLArgument,
  GraphQLField,
  GraphQLObjectType,
  GraphQLSchema,
  Kind,
  OperationDefinitionNode,
  SelectionNode,
  SelectionSetNode,
  VariableDefinitionNode,
} from 'graphql';

import { Transform, DelegationContext } from '@graphql-tools/delegate';

import {
  ExecutionRequest,
  serializeInputValue,
  updateArgument,
  createVariableNameGenerator,
} from '@graphql-tools/utils';

interface AddArgumentsAsVariablesTransformationContext extends Record<string, any> {}

export default class AddArgumentsAsVariables<TContext = Record<string, any>>
  implements Transform<AddArgumentsAsVariablesTransformationContext, TContext>
{
  private readonly args: Record<string, any>;

  constructor(args: Record<string, any>) {
    this.args = Object.entries(args).reduce(
      (prev, [key, val]) => ({
        ...prev,
        [key]: val,
      }),
      {}
    );
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext<TContext>,
    _transformationContext: AddArgumentsAsVariablesTransformationContext
  ): ExecutionRequest {
    const { document, variables } = addVariablesToRootField(delegationContext.targetSchema, originalRequest, this.args);

    return {
      ...originalRequest,
      document,
      variables,
    };
  }
}

function addVariablesToRootField(
  targetSchema: GraphQLSchema,
  originalRequest: ExecutionRequest,
  args: Record<string, any>
): {
  document: DocumentNode;
  variables: Record<string, any>;
} {
  const document = originalRequest.document;
  const variableValues = originalRequest.variables ?? {};

  const operations: Array<OperationDefinitionNode> = document.definitions.filter(
    def => def.kind === Kind.OPERATION_DEFINITION
  ) as Array<OperationDefinitionNode>;
  const fragments: Array<FragmentDefinitionNode> = document.definitions.filter(
    def => def.kind === Kind.FRAGMENT_DEFINITION
  ) as Array<FragmentDefinitionNode>;

  const newOperations = operations.map((operation: OperationDefinitionNode) => {
    const variableDefinitionMap: Record<string, VariableDefinitionNode> = (operation.variableDefinitions ?? []).reduce(
      (prev, def) => ({
        ...prev,
        [def.variable.name.value]: def,
      }),
      {}
    );

    let type: GraphQLObjectType | null | undefined;
    if (operation.operation === 'subscription') {
      type = targetSchema.getSubscriptionType();
    } else if (operation.operation === 'mutation') {
      type = targetSchema.getMutationType();
    } else {
      type = targetSchema.getQueryType();
    }
    const newSelectionSet: Array<SelectionNode> = [];

    operation.selectionSet.selections.forEach((selection: SelectionNode) => {
      if (selection.kind === Kind.FIELD) {
        const argumentNodes = selection.arguments ?? [];
        const argumentNodeMap: Record<string, ArgumentNode> = argumentNodes.reduce(
          (prev, argument) => ({
            ...prev,
            [argument.name.value]: argument,
          }),
          {}
        );

        const targetField = type?.getFields()[selection.name.value];

        // excludes __typename
        if (targetField != null) {
          updateArguments(targetField, argumentNodeMap, variableDefinitionMap, variableValues, args);
        }

        newSelectionSet.push({
          ...selection,
          arguments: Object.keys(argumentNodeMap).map(argName => argumentNodeMap[argName]),
        });
      } else {
        newSelectionSet.push(selection);
      }
    });

    return {
      ...operation,
      variableDefinitions: Object.keys(variableDefinitionMap).map(varName => variableDefinitionMap[varName]),
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections: newSelectionSet,
      } as SelectionSetNode,
    };
  });

  return {
    document: {
      ...document,
      definitions: [...newOperations, ...fragments],
    },
    variables: variableValues,
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

  targetField.args.forEach((argument: GraphQLArgument) => {
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
  });
}
