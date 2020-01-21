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
  astFromValue,
} from 'graphql';
import { Request } from '../Interfaces';
import { Transform } from './transforms';

export default class AddArgumentsTransform implements Transform {
  private targetSchema: GraphQLSchema;
  private args: { [key: string]: any };

  constructor(targetSchema: GraphQLSchema, args: { [key: string]: any }) {
    this.targetSchema = targetSchema;
    this.args = args;
  }

  public transformRequest(originalRequest: Request): Request {
    const document = addVariablesToRootField(
      this.targetSchema,
      originalRequest.document,
      this.args,
    );
    return {
      ...originalRequest,
      document,
    };
  }
}

function addVariablesToRootField(
  targetSchema: GraphQLSchema,
  document: DocumentNode,
  args: { [key: string]: any },
): DocumentNode {
  const operations: Array<
    OperationDefinitionNode
  > = document.definitions.filter(
    def => def.kind === Kind.OPERATION_DEFINITION,
  ) as Array<OperationDefinitionNode>;
  const fragments: Array<FragmentDefinitionNode> = document.definitions.filter(
    def => def.kind === Kind.FRAGMENT_DEFINITION,
  ) as Array<FragmentDefinitionNode>;

  const newOperations = operations.map((operation: OperationDefinitionNode) => {
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
            newArgs[argument.name] = {
              kind: Kind.ARGUMENT,
              name: {
                kind: Kind.NAME,
                value: argument.name,
              },
              value: astFromValue(args[argument.name], argument.type),
            };
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
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections: newSelectionSet,
      },
    };
  });

  return {
    ...document,
    definitions: [...newOperations, ...fragments],
  };
}
