import {
  ArgumentNode,
  DocumentNode,
  FragmentDefinitionNode,
  getNamedType,
  GraphQLField,
  GraphQLNamedType,
  GraphQLSchema,
  GraphQLType,
  isAbstractType,
  isInterfaceType,
  isObjectType,
  Kind,
  OperationDefinitionNode,
  SelectionNode,
  SelectionSetNode,
  TypeInfo,
  TypeNameMetaFieldDef,
  VariableDefinitionNode,
  versionInfo as graphqlVersionInfo,
  visit,
  visitWithTypeInfo,
} from 'graphql';

import {
  getDefinedRootType,
  ExecutionRequest,
  serializeInputValue,
  updateArgument,
  createVariableNameGenerator,
  implementsAbstractType,
  inspect,
  ASTVisitorKeyMap,
} from '@graphql-tools/utils';

import { DelegationContext } from './types.js';
import { getDocumentMetadata } from './getDocumentMetadata.js';

function finalizeGatewayDocument(
  targetSchema: GraphQLSchema,
  fragments: FragmentDefinitionNode[],
  operations: OperationDefinitionNode[]
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
    } = collectFragmentVariables(targetSchema, fragmentSet, validFragments, validFragmentsWithType, usedFragments);
    const operationOrFragmentVariables = union(operationUsedVariables, collectedUsedVariables);
    usedVariables = union(usedVariables, operationOrFragmentVariables);
    newFragments = collectedNewFragments;
    fragmentSet = collectedFragmentSet;

    const variableDefinitions = (operation.variableDefinitions ?? []).filter(
      (variable: VariableDefinitionNode) => operationOrFragmentVariables.indexOf(variable.variable.name.value) !== -1
    );

    newOperations.push({
      kind: Kind.OPERATION_DEFINITION,
      operation: operation.operation,
      name: operation.name,
      directives: operation.directives,
      variableDefinitions,
      selectionSet,
    });
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
  delegationContext: DelegationContext<TContext>
): ExecutionRequest {
  let { document, variables } = originalRequest;

  let { operations, fragments } = getDocumentMetadata(document);
  const { targetSchema, args } = delegationContext;

  if (args) {
    const requestWithNewVariables = addVariablesToRootFields(targetSchema, operations, args);
    operations = requestWithNewVariables.newOperations;
    variables = Object.assign({}, variables ?? {}, requestWithNewVariables.newVariables);
  }

  const { usedVariables, newDocument } = finalizeGatewayDocument(targetSchema, fragments, operations);

  const newVariables = {};
  if (variables != null) {
    for (const variableName of usedVariables) {
      const variableValue = variables[variableName];
      if (variableValue !== undefined) {
        newVariables[variableName] = variableValue;
      }
    }
  }

  return {
    ...originalRequest,
    document: newDocument,
    variables: newVariables,
  };
}

function addVariablesToRootFields(
  targetSchema: GraphQLSchema,
  operations: Array<OperationDefinitionNode>,
  args: Record<string, any>
): {
  newOperations: Array<OperationDefinitionNode>;
  newVariables: Record<string, any>;
} {
  const newVariables = Object.create(null);

  const newOperations = operations.map((operation: OperationDefinitionNode) => {
    const variableDefinitionMap: Record<string, VariableDefinitionNode> = (operation.variableDefinitions ?? []).reduce(
      (prev, def) => ({
        ...prev,
        [def.variable.name.value]: def,
      }),
      {}
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
          {}
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
  newArgs: Record<string, any>
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
        serializeInputValue(argType, newArgs[argName])
      );
    }
  }
}

function collectFragmentVariables(
  targetSchema: GraphQLSchema,
  fragmentSet: any,
  validFragments: Array<FragmentDefinitionNode>,
  validFragmentsWithType: { [name: string]: GraphQLType },
  usedFragments: Array<string>
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
          `Fragment reference type "${typeName}", but the type is not contained within the target schema.`
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
  selectionSet: SelectionSetNode
) {
  const usedFragments: Array<string> = [];
  const usedVariables: Array<string> = [];

  const typeInfo =
    graphqlVersionInfo.major < 16 ? new TypeInfo(schema, undefined, type as any) : new TypeInfo(schema, type as any);
  const filteredSelectionSet = visit(
    selectionSet,
    visitWithTypeInfo(typeInfo, {
      [Kind.FIELD]: {
        enter: node => {
          const parentType = typeInfo.getParentType();
          if (isObjectType(parentType) || isInterfaceType(parentType)) {
            const fields = parentType.getFields();
            const field = node.name.value === '__typename' ? TypeNameMetaFieldDef : fields[node.name.value];
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
        },
        leave: node => {
          const type = typeInfo.getType();
          if (type == null) {
            throw new Error(`No type was found for field node ${inspect(node)}.`);
          }
          const namedType = getNamedType(type);
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
            if (!implementsAbstractType(schema, parentType, innerType)) {
              return null;
            }
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
    filteredSelectionSetVisitorKeys as any
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
    variablesVisitorKeys as any
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
