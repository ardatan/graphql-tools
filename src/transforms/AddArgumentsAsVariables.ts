import {
  ArgumentNode,
  DocumentNode,
  FragmentDefinitionNode,
  GraphQLArgument,
  GraphQLInputType,
  GraphQLList,
  GraphQLField,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  Kind,
  OperationDefinitionNode,
  SelectionNode,
  TypeNode,
  VariableDefinitionNode,
  GraphQLEnumType,
  GraphQLScalarType,
} from 'graphql';
import { Request } from '../Interfaces';
import { Transform } from './transforms';
import { transformInputValue } from '../utils';

export default class AddArgumentsAsVariablesTransform implements Transform {
  private targetSchema: GraphQLSchema;
  private args: { [key: string]: any };
  private sourceSchema: GraphQLSchema;

  constructor(targetSchema: GraphQLSchema, args: { [key: string]: any }, sourceSchema: GraphQLSchema) {
    this.targetSchema = targetSchema;
    this.args = args;
    this.sourceSchema = sourceSchema;
  }

  public transformRequest(originalRequest: Request): Request {
    const { document, newVariables } = addVariablesToRootField(
      this.targetSchema,
      originalRequest.document,
      this.args,
      this.sourceSchema,
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
  sourceSchema: GraphQLSchema,
): {
  document: DocumentNode;
  newVariables: { [key: string]: any };
  } {
  const operations: Array<
    OperationDefinitionNode
  > = document.definitions.filter(
    def => def.kind === Kind.OPERATION_DEFINITION,
  ) as Array<OperationDefinitionNode>;
  const fragments: Array<FragmentDefinitionNode> = document.definitions.filter(
    def => def.kind === Kind.FRAGMENT_DEFINITION,
  ) as Array<FragmentDefinitionNode>;

  const variableNames = {};
  const newVariables = {};

  const newOperations = operations.map((operation: OperationDefinitionNode) => {
    let existingVariables = operation.variableDefinitions.map(
      (variableDefinition: VariableDefinitionNode) =>
        variableDefinition.variable.name.value,
    );

    let variableCounter = 0;
    const variables = {};

    const generateVariableName = (argName: string) => {
      let varName;
      do {
        varName = `_v${variableCounter}_${argName}`;
        variableCounter++;
      } while (existingVariables.indexOf(varName) !== -1);
      return varName;
    };

    let type: GraphQLObjectType;
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
        let newArgs: { [name: string]: ArgumentNode } = {};
        selection.arguments.forEach((argument: ArgumentNode) => {
          newArgs[argument.name.value] = argument;
        });
        const name: string = selection.name.value;
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
            if (sourceSchema) {
              newVariables[variableName] = transformInputValue(
                argument.type,
                args[argument.name],
                (t, v) => {
                  const type = sourceSchema.getType(t.name) as GraphQLEnumType | GraphQLScalarType;
                  return type ? type.serialize(v) : v;
                }
              );
            } else {
              // tslint:disable-next-line:max-line-length
              console.warn(
                'AddArgumentsAsVariables should be passed the wrapping schema so that arguments can be properly serialized prior to delegation.'
              );
              newVariables[variableName] = args[argument.name];
            }
          }
        });

        newSelectionSet.push({
          ...selection,
          arguments: Object.keys(newArgs).map(argName => newArgs[argName]),
        });
      } else {
        newSelectionSet.push(selection);
      }
    });

    return {
      ...operation,
      variableDefinitions: operation.variableDefinitions.concat(
        Object.keys(variables).map(varName => variables[varName]),
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
