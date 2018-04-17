import {
  ArgumentNode,
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLType,
  GraphQLUnionType,
  InlineFragmentNode,
  Kind,
  OperationDefinitionNode,
  SelectionSetNode,
  TypeNameMetaFieldDef,
  VariableDefinitionNode,
  VariableNode,
  visit,
} from 'graphql';
import { Request } from '../Interfaces';
import implementsAbstractType from '../implementsAbstractType';
import { Transform } from './transforms';

export default function FilterToSchema(targetSchema: GraphQLSchema): Transform {
  return {
    transformRequest(originalRequest: Request): Request {
      const document = filterDocumentToSchema(
        targetSchema,
        originalRequest.document,
      );
      return {
        ...originalRequest,
        document,
      };
    },
  };
}

function filterDocumentToSchema(
  targetSchema: GraphQLSchema,
  document: DocumentNode,
): DocumentNode {
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
      const type = targetSchema.getType(typeName);
      return Boolean(type);
    },
  );

  const validFragmentsWithType: { [name: string]: GraphQLType } = {};
  validFragments.forEach((fragment: FragmentDefinitionNode) => {
    const typeName = fragment.typeCondition.name.value;
    const type = targetSchema.getType(typeName);
    validFragmentsWithType[fragment.name.value] = type;
  });

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
      operation.selectionSet,
    );

    usedFragments = union(usedFragments, operationUsedFragments);
    const fullUsedVariables = union(usedVariables, operationUsedVariables);

    const variableDefinitions = operation.variableDefinitions.filter(
      (variable: VariableDefinitionNode) =>
        fullUsedVariables.indexOf(variable.variable.name.value) !== -1,
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

  return {
    kind: Kind.DOCUMENT,
    definitions: [...newOperations, ...newFragments],
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
  const typeStack: Array<GraphQLType> = [type];

  // Should be rewritten using visitWithSchema
  const filteredSelectionSet = visit(selectionSet, {
    [Kind.FIELD]: {
      enter(node: FieldNode): null | undefined | FieldNode {
        let parentType: GraphQLNamedType = resolveType(
          typeStack[typeStack.length - 1],
        );
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
          } else {
            typeStack.push(field.type);
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
        } else if (
          parentType instanceof GraphQLUnionType &&
          node.name.value === '__typename'
        ) {
          typeStack.push(TypeNameMetaFieldDef.type);
        }
      },
      leave() {
        typeStack.pop();
      },
    },
    [Kind.FRAGMENT_SPREAD](node: FragmentSpreadNode): null | undefined {
      if (node.name.value in validFragments) {
        const parentType: GraphQLNamedType = resolveType(
          typeStack[typeStack.length - 1],
        );
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
          const innerType = schema.getType(node.typeCondition.name.value);
          const parentType: GraphQLNamedType = resolveType(
            typeStack[typeStack.length - 1],
          );
          if (implementsAbstractType(schema, parentType, innerType)) {
            typeStack.push(innerType);
          } else {
            return null;
          }
        }
      },
      leave(node: InlineFragmentNode) {
        typeStack.pop();
      },
    },
    [Kind.VARIABLE](node: VariableNode) {
      usedVariables.push(node.name.value);
    },
  });

  return {
    selectionSet: filteredSelectionSet,
    usedFragments,
    usedVariables,
  };
}

function resolveType(type: GraphQLType): GraphQLNamedType {
  let lastType = type;
  while (
    lastType instanceof GraphQLNonNull ||
    lastType instanceof GraphQLList
  ) {
    lastType = lastType.ofType;
  }
  return lastType;
}

function union(...arrays: Array<Array<string>>): Array<string> {
  const cache: { [key: string]: Boolean } = {};
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
