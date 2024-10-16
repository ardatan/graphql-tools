import {
  ArgumentNode,
  DocumentNode,
  FragmentDefinitionNode,
  getNamedType,
  GraphQLField,
  GraphQLNamedType,
  GraphQLSchema,
  GraphQLType,
  versionInfo as graphqlVersionInfo,
  isAbstractType,
  isInterfaceType,
  isObjectType,
  isUnionType,
  Kind,
  OperationDefinitionNode,
  SelectionNode,
  SelectionSetNode,
  TypeInfo,
  TypeNameMetaFieldDef,
  VariableDefinitionNode,
  visit,
  visitWithTypeInfo,
} from 'graphql';
import { CRITICAL_ERROR } from '@graphql-tools/executor';
import {
  ASTVisitorKeyMap,
  createGraphQLError,
  createVariableNameGenerator,
  ExecutionRequest,
  getDefinedRootType,
  implementsAbstractType,
  serializeInputValue,
  updateArgument,
} from '@graphql-tools/utils';
import { getDocumentMetadata } from './getDocumentMetadata.js';
import { DelegationContext } from './types.js';

function finalizeGatewayDocument(
  targetSchema: GraphQLSchema,
  fragments: FragmentDefinitionNode[],
  operations: OperationDefinitionNode[],
) {
  let usedVariables: Array<string> = [];
  let usedFragments: Array<string> = [];
  const newOperations: Array<OperationDefinitionNode> = [];
  let newFragments: Array<FragmentDefinitionNode> = [];

  const validFragments: Array<FragmentDefinitionNode> = [];
  const validFragmentsWithType: Record<string, GraphQLNamedType> = Object.create(null);
  for (const fragment of fragments) {
    const typeName = fragment.typeCondition.name.value;
    const type = targetSchema.getType(typeName);
    if (type != null) {
      validFragments.push(fragment);
      validFragmentsWithType[fragment.name.value] = type;
    }
  }

  let fragmentSet = Object.create(null);

  for (const operation of operations) {
    const type = getDefinedRootType(targetSchema, operation.operation);

    const {
      selectionSet,
      usedFragments: operationUsedFragments,
      usedVariables: operationUsedVariables,
    } = finalizeSelectionSet(targetSchema, type, validFragmentsWithType, operation.selectionSet);

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
    const operationOrFragmentVariables = union(operationUsedVariables, collectedUsedVariables);
    usedVariables = union(usedVariables, operationOrFragmentVariables);
    newFragments = collectedNewFragments;
    fragmentSet = collectedFragmentSet;

    const variableDefinitions = (operation.variableDefinitions ?? []).filter(
      (variable: VariableDefinitionNode) =>
        operationOrFragmentVariables.indexOf(variable.variable.name.value) !== -1,
    );

    // Prevent unnecessary __typename in Subscription
    if (operation.operation === 'subscription') {
      selectionSet.selections = selectionSet.selections.filter(
        (selection: SelectionNode) =>
          selection.kind !== Kind.FIELD || selection.name.value !== '__typename',
      );
    }

    // Do not add the operation if it only asks for __typename
    if (
      selectionSet.selections.length === 1 &&
      selectionSet.selections[0].kind === Kind.FIELD &&
      selectionSet.selections[0].name.value === '__typename'
    ) {
      continue;
    }

    newOperations.push({
      kind: Kind.OPERATION_DEFINITION,
      operation: operation.operation,
      name: operation.name,
      directives: operation.directives,
      variableDefinitions,
      selectionSet,
    });
  }

  if (!newOperations.length) {
    throw createGraphQLError(
      'Failed to create a gateway request. The request must contain at least one operation.',
      {
        extensions: {
          [CRITICAL_ERROR]: true,
        },
      },
    );
  }

  const newDocument: DocumentNode = {
    kind: Kind.DOCUMENT,
    definitions: [...newOperations, ...newFragments],
  };

  return {
    usedVariables,
    newDocument,
  };
}

export function finalizeGatewayRequest<TContext>(
  originalRequest: ExecutionRequest,
  delegationContext: DelegationContext<TContext>,
): ExecutionRequest {
  let { document, variables } = originalRequest;

  let { operations, fragments } = getDocumentMetadata(document);
  const { targetSchema, args } = delegationContext;

  if (args) {
    const requestWithNewVariables = addVariablesToRootFields(targetSchema, operations, args);
    operations = requestWithNewVariables.newOperations;
    variables = Object.assign({}, variables ?? {}, requestWithNewVariables.newVariables);
  }

  const { usedVariables, newDocument } = finalizeGatewayDocument(
    targetSchema,
    fragments,
    operations,
  );

  const newVariables: Record<string, any> = {};
  if (variables != null) {
    for (const variableName of usedVariables) {
      const variableValue = variables[variableName];
      if (variableValue !== undefined) {
        newVariables[variableName] = variableValue;
      }
    }
  }

  let cleanedUpDocument = newDocument;

  // TODO: Optimize this internally later
  const visitorKeys: ASTVisitorKeyMap = {
    Document: ['definitions'],
    OperationDefinition: ['selectionSet'],
    SelectionSet: ['selections'],
    Field: ['selectionSet'],
    InlineFragment: ['selectionSet'],
    FragmentDefinition: ['selectionSet'],
  };
  cleanedUpDocument = visit(
    newDocument,
    {
      // Cleanup extra __typename fields
      [Kind.SELECTION_SET]: {
        leave(node) {
          const { hasTypeNameField, selections } = filterTypenameFields(node.selections);
          if (hasTypeNameField) {
            selections.unshift({
              kind: Kind.FIELD,
              name: {
                kind: Kind.NAME,
                value: '__typename',
              },
            });
          }
          return {
            ...node,
            selections,
          };
        },
      },
      // Cleanup empty inline fragments
      [Kind.INLINE_FRAGMENT]: {
        leave(node) {
          // No need __typename in inline fragment
          const { selections } = filterTypenameFields(node.selectionSet.selections);
          if (selections.length === 0) {
            return null;
          }
          return {
            ...node,
            selectionSet: {
              ...node.selectionSet,
              selections,
            },
            // @defer is not available for the communication between the gw and subgraph
            directives: node.directives?.filter?.(directive => directive.name.value !== 'defer'),
          };
        },
      },
    },
    visitorKeys as any,
  );

  return {
    ...originalRequest,
    document: cleanedUpDocument,
    variables: newVariables,
  };
}

function isTypeNameField(selection: SelectionNode): boolean {
  return selection.kind === Kind.FIELD && !selection.alias && selection.name.value === '__typename';
}

function filterTypenameFields(selections: readonly SelectionNode[]): {
  hasTypeNameField: boolean;
  selections: SelectionNode[];
} {
  let hasTypeNameField = false;
  const filteredSelections = selections.filter(selection => {
    if (isTypeNameField(selection)) {
      hasTypeNameField = true;
      return false;
    }
    return true;
  });
  return {
    hasTypeNameField,
    selections: filteredSelections,
  };
}

function addVariablesToRootFields(
  targetSchema: GraphQLSchema,
  operations: Array<OperationDefinitionNode>,
  args: Record<string, any>,
): {
  newOperations: Array<OperationDefinitionNode>;
  newVariables: Record<string, any>;
} {
  const newVariables = Object.create(null);

  const newOperations = operations.map((operation: OperationDefinitionNode) => {
    const variableDefinitionMap: Record<string, VariableDefinitionNode> = (
      operation.variableDefinitions ?? []
    ).reduce(
      (prev, def) => ({
        ...prev,
        [def.variable.name.value]: def,
      }),
      {},
    );

    const type = getDefinedRootType(targetSchema, operation.operation);

    const newSelections: Array<SelectionNode> = [];

    for (const selection of operation.selectionSet.selections) {
      if (selection.kind === Kind.FIELD) {
        const argumentNodes = selection.arguments ?? [];
        const argumentNodeMap: Record<string, ArgumentNode> = argumentNodes.reduce(
          (prev, argument) => ({
            ...prev,
            [argument.name.value]: argument,
          }),
          {},
        );

        const targetField = type.getFields()[selection.name.value];

        // excludes __typename
        if (targetField != null) {
          updateArguments(targetField, argumentNodeMap, variableDefinitionMap, newVariables, args);
        }

        newSelections.push({
          ...selection,
          arguments: Object.values(argumentNodeMap),
        });
      } else {
        newSelections.push(selection);
      }
    }

    const newSelectionSet: SelectionSetNode = {
      kind: Kind.SELECTION_SET,
      selections: newSelections,
    };

    return {
      ...operation,
      variableDefinitions: Object.values(variableDefinitionMap),
      selectionSet: newSelectionSet,
    };
  });

  return {
    newOperations,
    newVariables,
  };
}

function updateArguments(
  targetField: GraphQLField<any, any>,
  argumentNodeMap: Record<string, ArgumentNode>,
  variableDefinitionMap: Record<string, VariableDefinitionNode>,
  variableValues: Record<string, any>,
  newArgs: Record<string, any>,
): void {
  const generateVariableName = createVariableNameGenerator(variableDefinitionMap);

  for (const argument of targetField.args) {
    const argName = argument.name;
    const argType = argument.type;

    if (argName in newArgs) {
      updateArgument(
        argumentNodeMap,
        variableDefinitionMap,
        variableValues,
        argName,
        generateVariableName(argName),
        argType,
        serializeInputValue(argType, newArgs[argName]),
      );
    }
  }
}

function collectFragmentVariables(
  targetSchema: GraphQLSchema,
  fragmentSet: any,
  validFragments: Array<FragmentDefinitionNode>,
  validFragmentsWithType: { [name: string]: GraphQLType },
  usedFragments: Array<string>,
) {
  let remainingFragments = usedFragments.slice();

  let usedVariables: Array<string> = [];
  const newFragments: Array<FragmentDefinitionNode> = [];

  while (remainingFragments.length !== 0) {
    const nextFragmentName = remainingFragments.pop();
    const fragment = validFragments.find(fr => fr.name.value === nextFragmentName);
    if (fragment != null) {
      const name = nextFragmentName;
      const typeName = fragment.typeCondition.name.value;
      const type = targetSchema.getType(typeName);
      if (type == null) {
        throw new Error(
          `Fragment reference type "${typeName}", but the type is not contained within the target schema.`,
        );
      }
      const {
        selectionSet,
        usedFragments: fragmentUsedFragments,
        usedVariables: fragmentUsedVariables,
      } = finalizeSelectionSet(targetSchema, type, validFragmentsWithType, fragment.selectionSet);
      remainingFragments = union(remainingFragments, fragmentUsedFragments);
      usedVariables = union(usedVariables, fragmentUsedVariables);

      if (name && !(name in fragmentSet)) {
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

const filteredSelectionSetVisitorKeys: ASTVisitorKeyMap = {
  SelectionSet: ['selections'],
  Field: ['selectionSet'],
  InlineFragment: ['selectionSet'],
  FragmentDefinition: ['selectionSet'],
};

const variablesVisitorKeys: ASTVisitorKeyMap = {
  SelectionSet: ['selections'],
  Field: ['arguments', 'directives', 'selectionSet'],
  Argument: ['value'],

  InlineFragment: ['directives', 'selectionSet'],
  FragmentSpread: ['directives'],
  FragmentDefinition: ['selectionSet'],

  ObjectValue: ['fields'],
  ObjectField: ['name', 'value'],
  Directive: ['arguments'],
  ListValue: ['values'],
};

function finalizeSelectionSet(
  schema: GraphQLSchema,
  type: GraphQLType,
  validFragments: { [name: string]: GraphQLType },
  selectionSet: SelectionSetNode,
) {
  const usedFragments: Array<string> = [];
  const usedVariables: Array<string> = [];

  const typeInfo =
    graphqlVersionInfo.major < 16
      ? new TypeInfo(schema, undefined, type as any)
      : new TypeInfo(schema, type as any);
  const filteredSelectionSet = visit(
    selectionSet,
    visitWithTypeInfo(typeInfo, {
      [Kind.FIELD]: {
        enter: node => {
          const parentType = typeInfo.getParentType();
          if (isObjectType(parentType) || isInterfaceType(parentType)) {
            const fields = parentType.getFields();
            const field =
              node.name.value === '__typename' ? TypeNameMetaFieldDef : fields[node.name.value];
            if (!field) {
              return null;
            }

            const args = field.args != null ? field.args : [];
            const argsMap = Object.create(null);
            for (const arg of args) {
              argsMap[arg.name] = arg;
            }
            if (node.arguments != null) {
              const newArgs = [];
              for (const arg of node.arguments) {
                if (arg.name.value in argsMap) {
                  newArgs.push(arg);
                }
              }
              if (newArgs.length !== node.arguments.length) {
                return {
                  ...node,
                  arguments: newArgs,
                };
              }
            }
          }
          if (isUnionType(parentType) && typeInfo.getType() == null) {
            const possibleTypeNames: Array<string> = [];
            for (const memberType of parentType.getTypes()) {
              const possibleField = memberType.getFields()[node.name.value];
              if (possibleField != null) {
                possibleTypeNames.push(memberType.name);
              }
            }
            if (possibleTypeNames.length > 0) {
              return possibleTypeNames.map(possibleTypeName => ({
                kind: Kind.INLINE_FRAGMENT,
                typeCondition: {
                  kind: Kind.NAMED_TYPE,
                  name: {
                    kind: Kind.NAME,
                    value: possibleTypeName,
                  },
                },
                selectionSet: {
                  kind: Kind.SELECTION_SET,
                  selections: [node],
                },
              }));
            }
          }
        },
        leave: node => {
          const type = typeInfo.getType();
          if (type == null) {
            // console.warn(
            //   `Invalid type for node: ${typeInfo.getParentType()?.name}.${node.name.value}`,
            // );
            return null;
          }
          const namedType = getNamedType(type);
          // eslint-disable-next-line no-constant-binary-expression
          if (!schema.getType(namedType.name) == null) {
            return null;
          }

          if (isObjectType(namedType) || isInterfaceType(namedType)) {
            const selections = node.selectionSet != null ? node.selectionSet.selections : null;
            if (selections == null || selections.length === 0) {
              return null;
            }
          }
        },
      },
      [Kind.FRAGMENT_SPREAD]: {
        enter: node => {
          if (!(node.name.value in validFragments)) {
            return null;
          }
          const parentType = typeInfo.getParentType();
          const innerType = validFragments[node.name.value];
          if (!implementsAbstractType(schema, parentType, innerType)) {
            return null;
          }

          usedFragments.push(node.name.value);
        },
      },
      [Kind.INLINE_FRAGMENT]: {
        enter: node => {
          if (node.typeCondition != null) {
            const parentType = typeInfo.getParentType();
            const innerType = schema.getType(node.typeCondition.name.value);
            if (
              isUnionType(parentType) &&
              parentType.getTypes().some(t => t.name === innerType?.name)
            ) {
              return node;
            }
            if (!implementsAbstractType(schema, parentType, innerType)) {
              return null;
            }
          }
        },
        leave: node => {
          if (!node.selectionSet?.selections?.length) {
            return null;
          }
        },
      },
      [Kind.SELECTION_SET]: {
        leave: node => {
          const parentType = typeInfo.getParentType();
          if (parentType != null && isAbstractType(parentType)) {
            const selections = node.selections.concat([
              {
                kind: Kind.FIELD,
                name: {
                  kind: Kind.NAME,
                  value: '__typename',
                },
              },
            ]);
            return {
              ...node,
              selections,
            };
          }
        },
      },
    }),
    // visitorKeys argument usage a la https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js
    // empty keys cannot be removed only because of typescript errors
    // will hopefully be fixed in future version of graphql-js to be optional
    filteredSelectionSetVisitorKeys as any,
  );

  visit(
    filteredSelectionSet,
    {
      [Kind.VARIABLE]: variableNode => {
        usedVariables.push(variableNode.name.value);
      },
    },
    // visitorKeys argument usage a la https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js
    // empty keys cannot be removed only because of typescript errors
    // will hopefully be fixed in future version of graphql-js to be optional
    variablesVisitorKeys as any,
  );

  return {
    selectionSet: filteredSelectionSet,
    usedFragments,
    usedVariables,
  };
}

function union(...arrays: Array<Array<string>>): Array<string> {
  const cache: Record<string, boolean> = Object.create(null);
  const result: Array<string> = [];
  for (const array of arrays) {
    for (const item of array) {
      if (!(item in cache)) {
        cache[item] = true;
        result.push(item);
      }
    }
  }
  return result;
}
