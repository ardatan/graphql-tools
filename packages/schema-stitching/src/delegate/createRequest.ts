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
  GraphQLArgument,
  VariableDefinitionNode,
  SelectionSetNode,
  DefinitionNode,
  DocumentNode,
} from 'graphql';

import { Request, ICreateRequest, serializeInputValue, updateArgument } from '@graphql-tools/utils';
import { ICreateRequestFromInfo } from './types';

export function getDelegatingOperation(parentType: GraphQLObjectType, schema: GraphQLSchema): OperationTypeNode {
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
    fieldNodes: selectionSet != null ? undefined : fieldNodes != null ? fieldNodes : info.fieldNodes,
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
  let newSelectionSet: SelectionSetNode = selectionSet;
  let argumentNodeMap: Record<string, ArgumentNode>;

  if (selectionSet != null && fieldNodes == null) {
    argumentNodeMap = Object.create(null);
  } else {
    const selections: Array<SelectionNode> = fieldNodes.reduce(
      (acc, fieldNode) => (fieldNode.selectionSet != null ? acc.concat(fieldNode.selectionSet.selections) : acc),
      []
    );

    newSelectionSet = selections.length
      ? {
          kind: Kind.SELECTION_SET,
          selections,
        }
      : undefined;

    argumentNodeMap = fieldNodes[0].arguments.reduce(
      (prev, curr) => ({
        ...prev,
        [curr.name.value]: curr,
      }),
      {}
    );
  }

  const newVariables = Object.create(null);
  const variableDefinitionMap = Object.create(null);

  if (sourceSchema != null && variableDefinitions != null) {
    variableDefinitions.forEach(def => {
      const varName = def.variable.name.value;
      variableDefinitionMap[varName] = def;
      const varType = typeFromAST(sourceSchema, def.type as NamedTypeNode) as GraphQLInputType;
      newVariables[varName] = serializeInputValue(varType, variableValues[varName]);
    });
  }

  if (sourceParentType != null) {
    updateArgumentsWithDefaults(
      sourceParentType,
      sourceFieldName,
      argumentNodeMap,
      variableDefinitionMap,
      newVariables
    );
  }

  const rootfieldNode: FieldNode = {
    kind: Kind.FIELD,
    arguments: Object.keys(argumentNodeMap).map(argName => argumentNodeMap[argName]),
    name: {
      kind: Kind.NAME,
      value: targetFieldName || fieldNodes[0].name.value,
    },
    selectionSet: newSelectionSet,
  };

  const operationDefinition: OperationDefinitionNode = {
    kind: Kind.OPERATION_DEFINITION,
    operation: targetOperation,
    variableDefinitions: Object.keys(variableDefinitionMap).map(varName => variableDefinitionMap[varName]),
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections: [rootfieldNode],
    },
  };

  let definitions: Array<DefinitionNode> = [operationDefinition];

  if (fragments != null) {
    definitions = definitions.concat(Object.keys(fragments).map(fragmentName => fragments[fragmentName]));
  }

  const document: DocumentNode = {
    kind: Kind.DOCUMENT,
    definitions,
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
  variableValues: Record<string, any>
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
          serializeInputValue(sourceArgType, defaultValue)
        );
      }
    }
  });
}
