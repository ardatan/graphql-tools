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
} from 'graphql';
import { Request, OperationRootDefinition } from '../Interfaces';
import { Transform } from './transforms';

export default class AddArgumentsAsVariablesTransform implements Transform {
  private schema: GraphQLSchema;
  private args: { [key: string]: any };

  constructor(schema: GraphQLSchema, args: { [key: string]: any }) {
    this.schema = schema;
    this.args = args;
  }

  public transformRequest(originalRequest: Request): Request {
    const { document, newVariables } = addVariablesToRootField(
      this.schema,
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
  args: { [key: string]: any } | Array<OperationRootDefinition>,
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

  const newOperations = operations.map((operation: OperationDefinitionNode) => {
    let existingVariables = operation.variableDefinitions.map(
      (variableDefinition: VariableDefinitionNode) =>
        variableDefinition.variable.name.value,
    );

    let variableCounter = 0;
    const variables = {};

    const generateVariableName = (argName: string, fieldName: string) => {
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

        const addArgument = (variableName: string, argument: GraphQLArgument) =>  {
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
        };

        if (Array.isArray(args)) {
          const def = args.find(arg => {
            if (arg.alias && selection.alias) {
              return arg.alias === selection.alias.value;
            }
            return arg.fieldName === selection.name.value;
          });

          const key = def.alias || def.fieldName;

          Object.keys(def.args || {}).forEach(arg => {
            const variableName = generateVariableName(arg, key);

            if (!variableNames[key]) {
              variableNames[key] = {};
            }

            const argument = field.args.find(rootArg => rootArg.name === arg);

            if (argument) {
              addArgument(variableName, argument);
              // TODO change this to always be single map or map-of-maps?
              variableNames[key][arg] = variableName;
            }
          });
        } else {
          field.args.forEach((argument: GraphQLArgument) => {
            if (argument.name in args) {
              const variableName = generateVariableName(argument.name, name);
              variableNames[argument.name] = variableName;
              addArgument(variableName, argument);
            }
          });
        }

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

  const newVariables = {};
  if (Array.isArray(args)) {
    args.forEach((root) => {
      if (root.args) {
        Object.keys(root.args).forEach((arg) => {
          newVariables[variableNames[root.alias || root.fieldName][arg]] = root.args[arg];
        });
      }
    });
  } else {
    Object.keys(variableNames).forEach(name => {
      newVariables[variableNames[name]] = args[name];
    });
  }

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
