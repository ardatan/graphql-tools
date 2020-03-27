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
  GraphQLArgument,
  VariableDefinitionNode,
  SelectionSetNode,
} from 'graphql';

import { ICreateRequestFromInfo, Request, ICreateRequest } from '../Interfaces';
import { serializeInputValue } from '../utils/index';
import { updateArgument } from '../utils/updateArgument';

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
  operation = getDelegatingOperation(info.parentType, info.schema),
  fieldName = info.fieldName,
  selectionSet,
  fieldNodes,
}: ICreateRequestFromInfo): Request {
  return createRequest({
    sourceSchema: info.schema,
    sourceParentType: info.parentType,
    sourceFieldName: info.fieldName,
    fragments: info.fragments,
    variableDefinitions: info.operation.variableDefinitions,
    variableValues: info.variableValues,
    targetOperation: operation,
    targetFieldName: fieldName,
    selectionSet,
    fieldNodes:
      selectionSet != null
        ? undefined
        : fieldNodes != null
        ? fieldNodes
        : info.fieldNodes,
  });
}

export function createRequest({
  sourceSchema,
  sourceParentType,
  sourceFieldName,
  fragments,
  variableDefinitions,
  variableValues,
  targetOperation,
  targetFieldName,
  selectionSet,
  fieldNodes,
}: ICreateRequest): Request {
  let argumentNodes: ReadonlyArray<ArgumentNode>;
  let newSelectionSet: SelectionSetNode = selectionSet;
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

  const newVariables = {};
  const variableDefinitionMap = {};
  variableDefinitions.forEach((def) => {
    const varName = def.variable.name.value;
    variableDefinitionMap[varName] = def;
    const varType = typeFromAST(
      sourceSchema,
      def.type as NamedTypeNode,
    ) as GraphQLInputType;
    newVariables[varName] = serializeInputValue(
      varType,
      variableValues[varName],
    );
  });

  const argumentNodeMap: Record<string, ArgumentNode> = {};
  argumentNodes.forEach((argument: ArgumentNode) => {
    argumentNodeMap[argument.name.value] = argument;
  });

  updateArgumentsWithDefaults(
    sourceParentType,
    sourceFieldName,
    argumentNodeMap,
    variableDefinitionMap,
    newVariables,
  );

  const rootfieldNode: FieldNode = {
    kind: Kind.FIELD,
    alias: null,
    arguments: Object.keys(argumentNodeMap).map(
      (argName) => argumentNodeMap[argName],
    ),
    selectionSet: newSelectionSet,
    name: {
      kind: Kind.NAME,
      value: targetFieldName || fieldNodes[0].name.value,
    },
  };

  const operationDefinition: OperationDefinitionNode = {
    kind: Kind.OPERATION_DEFINITION,
    operation: targetOperation,
    variableDefinitions: Object.keys(variableDefinitionMap).map(
      (varName) => variableDefinitionMap[varName],
    ),
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
    variables: newVariables,
  };
}

function updateArgumentsWithDefaults(
  sourceParentType: GraphQLObjectType,
  sourceFieldName: string,
  argumentNodeMap: Record<string, ArgumentNode>,
  variableDefinitionMap: Record<string, VariableDefinitionNode>,
  variableValues: Record<string, any>,
): void {
  const sourceField = sourceParentType.getFields()[sourceFieldName];
  sourceField.args.forEach((argument: GraphQLArgument) => {
    const argName = argument.name;
    const sourceArgType = argument.type;

    if (argumentNodeMap[argName] === undefined) {
      const defaultValue = argument.defaultValue;

      if (defaultValue !== undefined) {
        updateArgument(
          argName,
          sourceArgType,
          argumentNodeMap,
          variableDefinitionMap,
          variableValues,
          serializeInputValue(sourceArgType, defaultValue),
        );
      }
    }
  });
}
