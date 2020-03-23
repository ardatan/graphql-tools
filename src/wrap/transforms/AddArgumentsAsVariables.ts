import {
  ArgumentNode,
  DocumentNode,
  FragmentDefinitionNode,
  GraphQLArgument,
  GraphQLInputType,
  GraphQLField,
  GraphQLObjectType,
  GraphQLSchema,
  Kind,
  OperationDefinitionNode,
  SelectionNode,
  TypeNode,
  VariableDefinitionNode,
  isNonNullType,
  isListType,
} from 'graphql';

import { Transform, Request } from '../../Interfaces';
import { serializeInputValue } from '../../utils/index';

export default class AddArgumentsAsVariablesTransform implements Transform {
  private readonly targetSchema: GraphQLSchema;
  private readonly args: { [key: string]: any };

  constructor(targetSchema: GraphQLSchema, args: { [key: string]: any }) {
    this.targetSchema = targetSchema;
    this.args = args;
  }

  public transformRequest(originalRequest: Request): Request {
    const { document, newVariables } = addVariablesToRootField(
      this.targetSchema,
      originalRequest.document,
      this.args,
    );
    const variables = {
      ...originalRequest.variables,
      ...newVariables,
    };
    return {
      document,
      variables,
    };
  }
}

function addVariablesToRootField(
  targetSchema: GraphQLSchema,
  document: DocumentNode,
  args: { [key: string]: any },
): {
  document: DocumentNode;
  newVariables: { [key: string]: any };
} {
  const operations: Array<OperationDefinitionNode> = document.definitions.filter(
    (def) => def.kind === Kind.OPERATION_DEFINITION,
  ) as Array<OperationDefinitionNode>;
  const fragments: Array<FragmentDefinitionNode> = document.definitions.filter(
    (def) => def.kind === Kind.FRAGMENT_DEFINITION,
  ) as Array<FragmentDefinitionNode>;

  const variableNames = {};
  const newVariables = {};

  const newOperations = operations.map((operation: OperationDefinitionNode) => {
    const originalVariableDefinitions = operation.variableDefinitions;
    const existingVariables = originalVariableDefinitions.map(
      (variableDefinition: VariableDefinitionNode) =>
        variableDefinition.variable.name.value,
    );

    let variableCounter = 0;
    const variables = {};

    const generateVariableName = (argName: string) => {
      let varName;
      do {
        varName = `_v${variableCounter.toString()}_${argName}`;
        variableCounter++;
      } while (existingVariables.indexOf(varName) !== -1);
      return varName;
    };

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
        const newArgs: { [name: string]: ArgumentNode } = {};
        if (selection.arguments != null) {
          selection.arguments.forEach((argument: ArgumentNode) => {
            newArgs[argument.name.value] = argument;
          });
        }
        const name: string = selection.name.value;

        if (type != null) {
          const field: GraphQLField<any, any> = type.getFields()[name];
          field.args.forEach((argument: GraphQLArgument) => {
            if (argument.name in args) {
              const variableName = generateVariableName(argument.name);
              variableNames[argument.name] = variableName;
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
                    value: variableName,
                  },
                },
              };
              existingVariables.push(variableName);
              variables[variableName] = {
                kind: Kind.VARIABLE_DEFINITION,
                variable: {
                  kind: Kind.VARIABLE,
                  name: {
                    kind: Kind.NAME,
                    value: variableName,
                  },
                },
                type: typeToAst(argument.type),
              };
              newVariables[variableName] = serializeInputValue(
                argument.type,
                args[argument.name],
              );
            }
          });
        }

        newSelectionSet.push({
          ...selection,
          arguments: Object.keys(newArgs).map((argName) => newArgs[argName]),
        });
      } else {
        newSelectionSet.push(selection);
      }
    });

    return {
      ...operation,
      variableDefinitions: originalVariableDefinitions.concat(
        Object.keys(variables).map((varName) => variables[varName]),
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
    newVariables,
  };
}

function typeToAst(type: GraphQLInputType): TypeNode {
  if (isNonNullType(type)) {
    const innerType = typeToAst(type.ofType);
    if (
      innerType.kind === Kind.LIST_TYPE ||
      innerType.kind === Kind.NAMED_TYPE
    ) {
      return {
        kind: Kind.NON_NULL_TYPE,
        type: innerType,
      };
    }
    throw new Error('Incorrect inner non-null type');
  } else if (isListType(type)) {
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
