import {
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
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
  isObjectType,
  isInterfaceType,
} from 'graphql';

import { ExecutionRequest, implementsAbstractType, getDefinedRootType } from '@graphql-tools/utils';

import { Transform, DelegationContext } from '../types';
import { TypeMap } from 'graphql/type/schema';
import { getDocumentMetadata } from '../getDocumentMetadata';

export default class FilterToSchema implements Transform {
  public transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext,
    _transformationContext: Record<string, any>
  ): ExecutionRequest {
    const { document, variables } = originalRequest;
    const { operations, fragments } = getDocumentMetadata(document);
    const { targetSchema } = delegationContext;
    const { newOperations, newFragments, newVariables } = filterToSchema(
      targetSchema,
      operations,
      fragments,
      variables
    );
    const newDocument = {
      kind: Kind.DOCUMENT,
      definitions: [...newOperations, ...newFragments],
    };
    return {
      ...originalRequest,
      document: newDocument,
      variables: newVariables,
    };
  }
}

function filterToSchema(
  targetSchema: GraphQLSchema,
  operations: Array<OperationDefinitionNode>,
  fragments: Array<FragmentDefinitionNode>,
  variables?: Record<string, any>
): {
  newOperations: Array<OperationDefinitionNode>;
  newFragments: Array<FragmentDefinitionNode>;
  newVariables: Record<string, any>;
} {
  let usedVariables: Array<string> = [];
  let usedFragments: Array<string> = [];
  const newOperations: Array<OperationDefinitionNode> = [];
  let newFragments: Array<FragmentDefinitionNode> = [];

  const validFragments: Array<FragmentDefinitionNode> = [];
  const validFragmentsWithType: TypeMap = Object.create(null);
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
    } = filterSelectionSet(targetSchema, type, validFragmentsWithType, operation.selectionSet);

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
    newOperations,
    newFragments,
    newVariables,
  };
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
      } = filterSelectionSet(targetSchema, type, validFragmentsWithType, fragment.selectionSet);
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

function filterSelectionSet(
  schema: GraphQLSchema,
  type: GraphQLType,
  validFragments: { [name: string]: GraphQLType },
  selectionSet: SelectionSetNode
) {
  const usedFragments: Array<string> = [];
  const usedVariables: Array<string> = [];

  const typeInfo = new TypeInfo(schema, undefined, type);
  const filteredSelectionSet = visit(
    selectionSet,
    visitWithTypeInfo(typeInfo, {
      [Kind.FIELD]: {
        enter(node: FieldNode): null | undefined | FieldNode {
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
        leave(node: FieldNode): null | undefined | FieldNode {
          const type = typeInfo.getType();
          if (type == null) {
            throw new Error(`No type was found for field node ${node}.`);
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
        enter(node: FragmentSpreadNode): null | undefined {
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
        enter(node: InlineFragmentNode): null | undefined {
          if (node.typeCondition != null) {
            const parentType = typeInfo.getParentType();
            const innerType = schema.getType(node.typeCondition.name.value);
            if (!implementsAbstractType(schema, parentType, innerType)) {
              return null;
            }
          }
        },
      },
    }),
    // visitorKeys argument usage a la https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js
    // empty keys cannot be removed only because of typescript errors
    // will hopefully be fixed in future version of graphql-js to be optional
    {
      Name: [],

      Document: [],
      OperationDefinition: [],
      VariableDefinition: [],
      Variable: [],
      SelectionSet: ['selections'],
      Field: ['selectionSet'],
      Argument: [],

      FragmentSpread: [],
      InlineFragment: ['selectionSet'],
      FragmentDefinition: ['selectionSet'],

      IntValue: [],
      FloatValue: [],
      StringValue: [],
      BooleanValue: [],
      NullValue: [],
      EnumValue: [],
      ListValue: [],
      ObjectValue: [],
      ObjectField: [],

      Directive: [],

      NamedType: [],
      ListType: [],
      NonNullType: [],

      SchemaDefinition: [],
      OperationTypeDefinition: [],

      ScalarTypeDefinition: [],
      ObjectTypeDefinition: [],
      FieldDefinition: [],
      InputValueDefinition: [],
      InterfaceTypeDefinition: [],
      UnionTypeDefinition: [],
      EnumTypeDefinition: [],
      EnumValueDefinition: [],
      InputObjectTypeDefinition: [],

      DirectiveDefinition: [],

      SchemaExtension: [],

      ScalarTypeExtension: [],
      ObjectTypeExtension: [],
      InterfaceTypeExtension: [],
      UnionTypeExtension: [],
      EnumTypeExtension: [],
      InputObjectTypeExtension: [],
    }
  );

  visit(
    filteredSelectionSet,
    {
      [Kind.VARIABLE](variableNode: VariableNode) {
        usedVariables.push(variableNode.name.value);
      },
    },
    // visitorKeys argument usage a la https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js
    // empty keys cannot be removed only because of typescript errors
    // will hopefully be fixed in future version of graphql-js to be optional
    {
      Name: [],

      Document: [],
      OperationDefinition: [],
      VariableDefinition: [],
      Variable: [],
      SelectionSet: ['selections'],
      Field: ['arguments', 'selectionSet'],
      Argument: ['value'],

      FragmentSpread: [],
      InlineFragment: ['selectionSet'],
      FragmentDefinition: ['selectionSet'],

      IntValue: [],
      FloatValue: [],
      StringValue: [],
      BooleanValue: [],
      NullValue: [],
      EnumValue: [],
      ListValue: [],
      ObjectValue: [],
      ObjectField: [],

      Directive: [],

      NamedType: [],
      ListType: [],
      NonNullType: [],

      SchemaDefinition: [],
      OperationTypeDefinition: [],

      ScalarTypeDefinition: [],
      ObjectTypeDefinition: [],
      FieldDefinition: [],
      InputValueDefinition: [],
      InterfaceTypeDefinition: [],
      UnionTypeDefinition: [],
      EnumTypeDefinition: [],
      EnumValueDefinition: [],
      InputObjectTypeDefinition: [],

      DirectiveDefinition: [],

      SchemaExtension: [],

      ScalarTypeExtension: [],
      ObjectTypeExtension: [],
      InterfaceTypeExtension: [],
      UnionTypeExtension: [],
      EnumTypeExtension: [],
      InputObjectTypeExtension: [],
    }
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
