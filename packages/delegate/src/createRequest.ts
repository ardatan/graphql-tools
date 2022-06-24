import {
  ArgumentNode,
  FieldNode,
  Kind,
  OperationDefinitionNode,
  SelectionNode,
  GraphQLSchema,
  GraphQLObjectType,
  OperationTypeNode,
  typeFromAST,
  NamedTypeNode,
  GraphQLInputType,
  VariableDefinitionNode,
  SelectionSetNode,
  DefinitionNode,
  DocumentNode,
  NameNode,
} from 'graphql';

import {
  createVariableNameGenerator,
  ExecutionRequest,
  serializeInputValue,
  updateArgument,
} from '@graphql-tools/utils';
import { ICreateRequest } from './types.js';

export function getDelegatingOperation(parentType: GraphQLObjectType, schema: GraphQLSchema): OperationTypeNode {
  if (parentType === schema.getMutationType()) {
    return 'mutation' as OperationTypeNode;
  } else if (parentType === schema.getSubscriptionType()) {
    return 'subscription' as OperationTypeNode;
  }

  return 'query' as OperationTypeNode;
}

export function createRequest({
  sourceSchema,
  sourceParentType,
  sourceFieldName,
  fragments,
  variableDefinitions,
  variableValues,
  targetRootValue,
  targetOperationName,
  targetOperation,
  targetFieldName,
  selectionSet,
  fieldNodes,
  context,
  info,
}: ICreateRequest): ExecutionRequest {
  let newSelectionSet: SelectionSetNode | undefined;
  const argumentNodeMap: Record<string, ArgumentNode> = Object.create(null);

  if (selectionSet != null) {
    newSelectionSet = selectionSet;
  } else {
    const selections: Array<SelectionNode> = [];
    for (const fieldNode of fieldNodes || []) {
      if (fieldNode.selectionSet) {
        for (const selection of fieldNode.selectionSet.selections) {
          selections.push(selection);
        }
      }
    }

    newSelectionSet = selections.length
      ? {
          kind: Kind.SELECTION_SET,
          selections,
        }
      : undefined;

    const args = fieldNodes?.[0]?.arguments;
    if (args) {
      for (const argNode of args) {
        argumentNodeMap[argNode.name.value] = argNode;
      }
    }
  }

  const newVariables = Object.create(null);
  const variableDefinitionMap = Object.create(null);

  if (sourceSchema != null && variableDefinitions != null) {
    for (const def of variableDefinitions) {
      const varName = def.variable.name.value;
      variableDefinitionMap[varName] = def;
      const varType = typeFromAST(sourceSchema, def.type as NamedTypeNode) as GraphQLInputType;
      const serializedValue = serializeInputValue(varType, variableValues?.[varName]);
      if (serializedValue !== undefined) {
        newVariables[varName] = serializedValue;
      }
    }
  }

  if (sourceParentType != null && sourceFieldName != null) {
    updateArgumentsWithDefaults(
      sourceParentType,
      sourceFieldName,
      argumentNodeMap,
      variableDefinitionMap,
      newVariables
    );
  }

  const rootFieldName = targetFieldName ?? fieldNodes?.[0]?.name.value;

  if (rootFieldName === undefined) {
    throw new Error(`Either "targetFieldName" or a non empty "fieldNodes" array must be provided.`);
  }

  const rootfieldNode: FieldNode = {
    kind: Kind.FIELD,
    arguments: Object.values(argumentNodeMap),
    name: {
      kind: Kind.NAME,
      value: rootFieldName,
    },
    selectionSet: newSelectionSet,
  };

  const operationName: NameNode | undefined = targetOperationName
    ? {
        kind: Kind.NAME,
        value: targetOperationName,
      }
    : undefined;

  const operationDefinition: OperationDefinitionNode = {
    kind: Kind.OPERATION_DEFINITION,
    name: operationName,
    operation: targetOperation,
    variableDefinitions: Object.values(variableDefinitionMap),
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections: [rootfieldNode],
    },
  };

  const definitions: Array<DefinitionNode> = [operationDefinition];

  if (fragments != null) {
    for (const fragmentName in fragments) {
      const fragment = fragments[fragmentName];
      definitions.push(fragment);
    }
  }

  const document: DocumentNode = {
    kind: Kind.DOCUMENT,
    definitions,
  };

  return {
    document,
    variables: newVariables,
    rootValue: targetRootValue,
    operationName: targetOperationName,
    context,
    info,
    operationType: targetOperation,
  };
}

function updateArgumentsWithDefaults(
  sourceParentType: GraphQLObjectType,
  sourceFieldName: string,
  argumentNodeMap: Record<string, ArgumentNode>,
  variableDefinitionMap: Record<string, VariableDefinitionNode>,
  variableValues: Record<string, any>
): void {
  const generateVariableName = createVariableNameGenerator(variableDefinitionMap);

  const sourceField = sourceParentType.getFields()[sourceFieldName];
  for (const argument of sourceField.args) {
    const argName = argument.name;
    const sourceArgType = argument.type;

    if (argumentNodeMap[argName] === undefined) {
      const defaultValue = argument.defaultValue;

      if (defaultValue !== undefined) {
        updateArgument(
          argumentNodeMap,
          variableDefinitionMap,
          variableValues,
          argName,
          generateVariableName(argName),
          sourceArgType,
          serializeInputValue(sourceArgType, defaultValue)
        );
      }
    }
  }
}
