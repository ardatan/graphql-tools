import {
  ArgumentNode,
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLType,
  InlineFragmentNode,
  Kind,
  OperationDefinitionNode,
  SelectionSetNode,
  TypeNameMetaFieldDef,
  VariableDefinitionNode,
  VariableNode,
  visit,
  TypeInfo,
  visitWithTypeInfo,
  getNamedType,
} from 'graphql';
import { Request } from '../Interfaces';
import implementsAbstractType from '../utils/implementsAbstractType';
import { Transform } from './transforms';

export default class FilterToSchema implements Transform {
  private targetSchema: GraphQLSchema;

  constructor(targetSchema: GraphQLSchema) {
    this.targetSchema = targetSchema;
  }

  public transformRequest(originalRequest: Request): Request {
    return {
      ...originalRequest,
      ...filterToSchema(
        this.targetSchema,
        originalRequest.document,
        originalRequest.variables,
      ),
    };
  }
}

function filterToSchema(
  targetSchema: GraphQLSchema,
  document: DocumentNode,
  variables: Record<string, any>,
): { document: DocumentNode; variables: Record<string, any> } {
  const operations: Array<
    OperationDefinitionNode
    > = document.definitions.filter(
      def => def.kind === Kind.OPERATION_DEFINITION,
    ) as Array<OperationDefinitionNode>;
  const fragments: Array<FragmentDefinitionNode> = document.definitions.filter(
    def => def.kind === Kind.FRAGMENT_DEFINITION,
  ) as Array<FragmentDefinitionNode>;

  let usedVariables: Array<string> = [];
  let usedFragments: Array<string> = [];
  const newOperations: Array<OperationDefinitionNode> = [];
  let newFragments: Array<FragmentDefinitionNode> = [];

  const validFragments: Array<FragmentDefinitionNode> = fragments.filter(
    (fragment: FragmentDefinitionNode) => {
      const typeName = fragment.typeCondition.name.value;
      return Boolean(targetSchema.getType(typeName));
    },
  );

  const validFragmentsWithType: { [name: string]: GraphQLType } = {};
  validFragments.forEach((fragment: FragmentDefinitionNode) => {
    const typeName = fragment.typeCondition.name.value;
    const type = targetSchema.getType(typeName);
    validFragmentsWithType[fragment.name.value] = type;
  });

  let fragmentSet = Object.create(null);

  operations.forEach((operation: OperationDefinitionNode) => {
    let type;
    if (operation.operation === 'subscription') {
      type = targetSchema.getSubscriptionType();
    } else if (operation.operation === 'mutation') {
      type = targetSchema.getMutationType();
    } else {
      type = targetSchema.getQueryType();
    }

    const {
      selectionSet,
      usedFragments: operationUsedFragments,
      usedVariables: operationUsedVariables,
    } = filterSelectionSet(
      targetSchema,
      type,
      validFragmentsWithType,
      operation.selectionSet
    );

    usedFragments = union(usedFragments, operationUsedFragments);

    const {
      usedVariables: collectedUsedVariables,
      newFragments: collectedNewFragments,
      fragmentSet: collectedFragmentSet,
    } = collectFragmentVariables(
      targetSchema,
      fragmentSet,
      validFragments,
      validFragmentsWithType,
      usedFragments,
    );
    const operationOrFragmentVariables =
      union(operationUsedVariables, collectedUsedVariables);
    usedVariables = union(usedVariables, operationOrFragmentVariables);
    newFragments = collectedNewFragments;
    fragmentSet = collectedFragmentSet;

    const variableDefinitions = operation.variableDefinitions.filter(
      (variable: VariableDefinitionNode) =>
      operationOrFragmentVariables.indexOf(variable.variable.name.value) !== -1,
    );

    newOperations.push({
      kind: Kind.OPERATION_DEFINITION,
      operation: operation.operation,
      name: operation.name,
      directives: operation.directives,
      variableDefinitions,
      selectionSet,
    });
  });

  const newVariables: Record<string, any> = {};
  usedVariables.forEach(variableName => {
    newVariables[variableName] = variables[variableName];
  });

  return {
    document: {
      kind: Kind.DOCUMENT,
      definitions: [...newOperations, ...newFragments],
    },
    variables: newVariables,
  };
}

function collectFragmentVariables(
  targetSchema: GraphQLSchema,
  fragmentSet: Object,
  validFragments: Array<FragmentDefinitionNode>,
  validFragmentsWithType: { [name: string]: GraphQLType },
  usedFragments: Array<string>,
) {
  let usedVariables: Array<string> = [];
  let newFragments: Array<FragmentDefinitionNode> = [];

  while (usedFragments.length !== 0) {
    const nextFragmentName = usedFragments.pop();
    const fragment = validFragments.find(
      fr => fr.name.value === nextFragmentName,
    );
    if (fragment) {
      const name = nextFragmentName;
      const typeName = fragment.typeCondition.name.value;
      const type = targetSchema.getType(typeName);
      const {
        selectionSet,
        usedFragments: fragmentUsedFragments,
        usedVariables: fragmentUsedVariables,
      } = filterSelectionSet(
        targetSchema,
        type,
        validFragmentsWithType,
        fragment.selectionSet,
        );
      usedFragments = union(usedFragments, fragmentUsedFragments);
      usedVariables = union(usedVariables, fragmentUsedVariables);

      if (!fragmentSet[name]) {
        fragmentSet[name] = true;
        newFragments.push({
          kind: Kind.FRAGMENT_DEFINITION,
          name: {
            kind: Kind.NAME,
            value: name,
          },
          typeCondition: fragment.typeCondition,
          selectionSet,
        });
      }
    }
  }

  return {
    usedVariables,
    newFragments,
    fragmentSet,
  };
}

function filterSelectionSet(
  schema: GraphQLSchema,
  type: GraphQLType,
  validFragments: { [name: string]: GraphQLType },
  selectionSet: SelectionSetNode,
) {
  const usedFragments: Array<string> = [];
  const usedVariables: Array<string> = [];

  const typeInfo = new TypeInfo(schema, undefined, type);
  const filteredSelectionSet = visit(selectionSet, visitWithTypeInfo(typeInfo, {
    [Kind.FIELD]: {
      enter(node: FieldNode): null | undefined | FieldNode {
        const parentType = typeInfo.getParentType();
        if (
          parentType instanceof GraphQLObjectType ||
          parentType instanceof GraphQLInterfaceType
        ) {
          const fields = parentType.getFields();
          const field =
            node.name.value === '__typename'
              ? TypeNameMetaFieldDef
              : fields[node.name.value];
          if (!field) {
            return null;
          }

          const argNames = (field.args || []).map(arg => arg.name);
          if (node.arguments) {
            let args = node.arguments.filter((arg: ArgumentNode) => {
              return argNames.indexOf(arg.name.value) !== -1;
            });
            if (args.length !== node.arguments.length) {
              return {
                ...node,
                arguments: args,
              };
            }
          }
        }
      },
      leave(node: FieldNode): null | undefined | FieldNode {
        const resolvedType = getNamedType(typeInfo.getType());
        if (
          resolvedType instanceof GraphQLObjectType ||
          resolvedType instanceof GraphQLInterfaceType
        ) {
          const selections = node.selectionSet && node.selectionSet.selections || null;
          if (!selections || selections.length === 0) {
            // need to remove any added variables. Is there a better way to do this?
            visit(node, {
              [Kind.VARIABLE](variableNode: VariableNode) {
                const index = usedVariables.indexOf(variableNode.name.value);
                if (index !== -1) {
                  usedVariables.splice(index, 1);
                }
              }
            }
            );
            return null;
          }
        }
      },
    },
    [Kind.FRAGMENT_SPREAD](node: FragmentSpreadNode): null | undefined {
      if (node.name.value in validFragments) {
        const parentType = typeInfo.getParentType();
        const innerType = validFragments[node.name.value];
        if (!implementsAbstractType(schema, parentType, innerType)) {
          return null;
        } else {
          usedFragments.push(node.name.value);
          return;
        }
      } else {
        return null;
      }
    },
    [Kind.INLINE_FRAGMENT]: {
      enter(node: InlineFragmentNode): null | undefined {
        if (node.typeCondition) {
          const parentType = typeInfo.getParentType();
          const innerType = schema.getType(node.typeCondition.name.value);
          if (!implementsAbstractType(schema, parentType, innerType)) {
            return null;
          } else {
            return;
          }
        }
      },
    },
    [Kind.VARIABLE](node: VariableNode) {
      usedVariables.push(node.name.value);
    },
  }));

  return {
    selectionSet: filteredSelectionSet,
    usedFragments,
    usedVariables,
  };
}

function union(...arrays: Array<Array<string>>): Array<string> {
  const cache: { [key: string]: boolean } = {};
  const result: Array<string> = [];
  arrays.forEach(array => {
    array.forEach(item => {
      if (!cache[item]) {
        cache[item] = true;
        result.push(item);
      }
    });
  });
  return result;
}
