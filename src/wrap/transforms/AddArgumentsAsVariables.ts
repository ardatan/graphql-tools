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
  VariableDefinitionNode,
} from 'graphql';

import { Transform, Request } from '../../Interfaces';
import { serializeInputValue } from '../../utils/index';
import { updateArgument } from '../../utils/updateArgument';

export default class AddArgumentsAsVariables implements Transform {
  private readonly targetSchema: GraphQLSchema;
  private readonly args: { [key: string]: any };

  constructor(targetSchema: GraphQLSchema, args: { [key: string]: any }) {
    this.targetSchema = targetSchema;
    this.args = args;
  }

  public transformRequest(originalRequest: Request): Request {
    const { document, newVariables } = addVariablesToRootField(
      this.targetSchema,
      originalRequest,
      this.args,
    );

    return {
      document,
      variables: newVariables,
    };
  }
}

function addVariablesToRootField(
  targetSchema: GraphQLSchema,
  originalRequest: Request,
  args: { [key: string]: any },
): {
  document: DocumentNode;
  newVariables: { [key: string]: any };
} {
  const document = originalRequest.document;
  const variableValues = originalRequest.variables;

  const operations: Array<OperationDefinitionNode> = document.definitions.filter(
    (def) => def.kind === Kind.OPERATION_DEFINITION,
  ) as Array<OperationDefinitionNode>;
  const fragments: Array<FragmentDefinitionNode> = document.definitions.filter(
    (def) => def.kind === Kind.FRAGMENT_DEFINITION,
  ) as Array<FragmentDefinitionNode>;

  const newOperations = operations.map((operation: OperationDefinitionNode) => {
    const variableDefinitionMap = {};
    operation.variableDefinitions.forEach((def) => {
      const varName = def.variable.name.value;
      variableDefinitionMap[varName] = def;
    });

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
        const argumentNodes = selection.arguments;
        const argumentNodeMap: Record<string, ArgumentNode> = {};
        argumentNodes.forEach((argument: ArgumentNode) => {
          argumentNodeMap[argument.name.value] = argument;
        });

        const targetField = type.getFields()[selection.name.value];

        // excludes __typename
        if (targetField != null) {
          updateArguments(
            targetField,
            argumentNodeMap,
            variableDefinitionMap,
            variableValues,
            args,
          );
        }

        newSelectionSet.push({
          ...selection,
          arguments: Object.keys(argumentNodeMap).map(
            (argName) => argumentNodeMap[argName],
          ),
        });
      } else {
        newSelectionSet.push(selection);
      }
    });

    return {
      ...operation,
      variableDefinitions: Object.keys(variableDefinitionMap).map(
        (varName) => variableDefinitionMap[varName],
      ),
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections: newSelectionSet,
      },
    };
  });

  return {
    document: {
      ...document,
      definitions: [...newOperations, ...fragments],
    },
    newVariables: variableValues,
  };
}

const hasOwn = Object.prototype.hasOwnProperty;

function updateArguments(
  targetField: GraphQLField<any, any>,
  argumentNodeMap: Record<string, ArgumentNode>,
  variableDefinitionMap: Record<string, VariableDefinitionNode>,
  variableValues: Record<string, any>,
  newArgs: Record<string, any>,
): void {
  targetField.args.forEach((argument: GraphQLArgument) => {
    const argName = argument.name;
    const argType = argument.type;

    if (hasOwn.call(newArgs, argName)) {
      updateArgument(
        argName,
        argType,
        argumentNodeMap,
        variableDefinitionMap,
        variableValues,
        serializeInputValue(argType, newArgs[argName]),
      );
    }
  });
}
