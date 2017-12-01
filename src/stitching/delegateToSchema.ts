import {
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  GraphQLField,
  GraphQLInputType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLSchema,
  GraphQLType,
  GraphQLUnionType,
  InlineFragmentNode,
  Kind,
  OperationDefinitionNode,
  SelectionSetNode,
  TypeNameMetaFieldDef,
  TypeNode,
  VariableDefinitionNode,
  VariableNode,
  execute,
  visit,
  subscribe,
} from 'graphql';
import { checkResultAndHandleErrors } from './errors';

export default async function delegateToSchema(
  schema: GraphQLSchema,
  fragmentReplacements: {
    [typeName: string]: { [fieldName: string]: InlineFragmentNode };
  },
  operation: 'query' | 'mutation' | 'subscription',
  fieldName: string,
  args: { [key: string]: any },
  context: { [key: string]: any },
  info: GraphQLResolveInfo,
): Promise<any> {
  let type;
  if (operation === 'mutation') {
    type = schema.getMutationType();
  } else if (operation === 'subscription') {
    type = schema.getSubscriptionType();
  } else {
    type = schema.getQueryType();
  }
  if (type) {
    const graphqlDoc: DocumentNode = createDocument(
      schema,
      fragmentReplacements,
      type,
      fieldName,
      operation,
      info.fieldNodes,
      info.fragments,
      info.operation.variableDefinitions,
    );

    const operationDefinition = graphqlDoc.definitions.find(
      ({ kind }) => kind === Kind.OPERATION_DEFINITION,
    );
    let variableValues = {};
    if (
      operationDefinition &&
      operationDefinition.kind === Kind.OPERATION_DEFINITION &&
      operationDefinition.variableDefinitions
    ) {
      operationDefinition.variableDefinitions.forEach(definition => {
        const key = definition.variable.name.value;
        // (XXX) This is kinda hacky
        let actualKey = key;
        if (actualKey.startsWith('_')) {
          actualKey = actualKey.slice(1);
        }
        const value = args[actualKey] || args[key] || info.variableValues[key];
        variableValues[key] = value;
      });
    }

    if (operation === 'query' || operation === 'mutation') {
      const result = await execute(
        schema,
        graphqlDoc,
        info.rootValue,
        context,
        variableValues,
      );
      return checkResultAndHandleErrors(result, info, fieldName);
    }

    if (operation === 'subscription') {
      return subscribe(
        schema,
        graphqlDoc,
        info.rootValue,
        context,
        variableValues,
      );
    }
  }

  throw new Error('Could not forward to merged schema');
}

export function createDocument(
  schema: GraphQLSchema,
  fragmentReplacements: {
    [typeName: string]: { [fieldName: string]: InlineFragmentNode };
  },
  type: GraphQLObjectType,
  rootFieldName: string,
  operation: 'query' | 'mutation' | 'subscription',
  selections: Array<FieldNode>,
  fragments: { [fragmentName: string]: FragmentDefinitionNode },
  variableDefinitions?: Array<VariableDefinitionNode>,
): DocumentNode {
  const rootField = type.getFields()[rootFieldName];
  const newVariables: Array<{ arg: string; variable: string }> = [];
  const rootSelectionSet = {
    kind: Kind.SELECTION_SET,
    // (XXX) This (wrongly) assumes only having one fieldNode
    selections: selections.map(selection => {
      if (selection.kind === Kind.FIELD) {
        const { selection: newSelection, variables } = processRootField(
          selection,
          rootFieldName,
          rootField,
        );
        newVariables.push(...variables);
        return newSelection;
      } else {
        return selection;
      }
    }),
  };

  const newVariableDefinitions = newVariables.map(({ arg, variable }) => {
    const argDef = rootField.args.find(rootArg => rootArg.name === arg);
    if (!argDef) {
      throw new Error('Unexpected missing arg');
    }
    const typeName = typeToAst(argDef.type);
    return {
      kind: Kind.VARIABLE_DEFINITION,
      variable: {
        kind: Kind.VARIABLE,
        name: {
          kind: Kind.NAME,
          value: variable,
        },
      },
      type: typeName,
    };
  });

  const {
    selectionSet,
    fragments: processedFragments,
    usedVariables,
  } = filterSelectionSetDeep(
    schema,
    fragmentReplacements,
    type,
    rootSelectionSet,
    fragments,
  );

  const operationDefinition: OperationDefinitionNode = {
    kind: Kind.OPERATION_DEFINITION,
    operation,
    variableDefinitions: [
      ...(variableDefinitions || []).filter(
        variableDefinition =>
          usedVariables.indexOf(variableDefinition.variable.name.value) !== -1,
      ),
      ...newVariableDefinitions,
    ],
    selectionSet,
  };

  const newDoc: DocumentNode = {
    kind: Kind.DOCUMENT,
    definitions: [operationDefinition, ...processedFragments],
  };

  return newDoc;
}

function processRootField(
  selection: FieldNode,
  rootFieldName: string,
  rootField: GraphQLField<any, any>,
): {
  selection: FieldNode;
  variables: Array<{ arg: string; variable: string }>;
} {
  const existingArguments = selection.arguments || [];
  const existingArgumentNames = existingArguments.map(arg => arg.name.value);
  const allowedArguments = rootField.args.map(arg => arg.name);
  const missingArgumentNames = difference(
    allowedArguments,
    existingArgumentNames,
  );
  const extraArguments = difference(existingArgumentNames, allowedArguments);
  const filteredExistingArguments = existingArguments.filter(
    arg => extraArguments.indexOf(arg.name.value) === -1,
  );
  const variables: Array<{ arg: string; variable: string }> = [];
  const missingArguments = missingArgumentNames.map(name => {
    // (XXX): really needs better var generation
    const variableName = `_${name}`;
    variables.push({
      arg: name,
      variable: variableName,
    });
    return {
      kind: Kind.ARGUMENT,
      name: {
        kind: Kind.NAME,
        value: name,
      },
      value: {
        kind: Kind.VARIABLE,
        name: {
          kind: Kind.NAME,
          value: variableName,
        },
      },
    };
  });

  return {
    selection: {
      kind: Kind.FIELD,
      alias: null,
      arguments: [...filteredExistingArguments, ...missingArguments],
      selectionSet: selection.selectionSet,
      name: {
        kind: Kind.NAME,
        value: rootFieldName,
      },
    },
    variables,
  };
}

function filterSelectionSetDeep(
  schema: GraphQLSchema,
  fragmentReplacements: {
    [typeName: string]: { [fieldName: string]: InlineFragmentNode };
  },
  type: GraphQLType,
  selectionSet: SelectionSetNode,
  fragments: { [fragmentName: string]: FragmentDefinitionNode },
): {
  selectionSet: SelectionSetNode;
  fragments: Array<FragmentDefinitionNode>;
  usedVariables: Array<string>;
} {
  const validFragments: Array<FragmentDefinitionNode> = [];
  Object.keys(fragments).forEach(fragmentName => {
    const fragment = fragments[fragmentName];
    const typeName = fragment.typeCondition.name.value;
    const innerType = schema.getType(typeName);
    if (innerType) {
      validFragments.push(fragment);
    }
  });
  let {
    selectionSet: newSelectionSet,
    usedFragments: remainingFragments,
    usedVariables,
  } = filterSelectionSet(
    schema,
    fragmentReplacements,
    type,
    selectionSet,
    validFragments,
  );

  const newFragments = {};
  // (XXX): So this will break if we have a fragment that only has link fields
  while (remainingFragments.length > 0) {
    const name = remainingFragments.pop();
    if (newFragments[name]) {
      continue;
    } else {
      const nextFragment = fragments[name];
      if (!name) {
        throw new Error(`Could not find fragment ${name}`);
      }
      const typeName = nextFragment.typeCondition.name.value;
      const innerType = schema.getType(typeName);
      if (!innerType) {
        continue;
      }
      const {
        selectionSet: fragmentSelectionSet,
        usedFragments: fragmentUsedFragments,
        usedVariables: fragmentUsedVariables,
      } = filterSelectionSet(
        schema,
        fragmentReplacements,
        innerType,
        nextFragment.selectionSet,
        validFragments,
      );
      remainingFragments = union(remainingFragments, fragmentUsedFragments);
      usedVariables = union(usedVariables, fragmentUsedVariables);
      newFragments[name] = {
        kind: Kind.FRAGMENT_DEFINITION,
        name: {
          kind: Kind.NAME,
          value: name,
        },
        typeCondition: nextFragment.typeCondition,
        selectionSet: fragmentSelectionSet,
      };
    }
  }
  const newFragmentValues: Array<FragmentDefinitionNode> = Object.keys(
    newFragments,
  ).map(name => newFragments[name]);
  return {
    selectionSet: newSelectionSet,
    fragments: newFragmentValues,
    usedVariables,
  };
}

function filterSelectionSet(
  schema: GraphQLSchema,
  fragmentReplacements: {
    [typeName: string]: { [fieldName: string]: InlineFragmentNode };
  },
  type: GraphQLType,
  selectionSet: SelectionSetNode,
  validFragments: Array<FragmentDefinitionNode>,
): {
  selectionSet: SelectionSetNode;
  usedFragments: Array<string>;
  usedVariables: Array<string>;
} {
  const usedFragments: Array<string> = [];
  const usedVariables: Array<string> = [];
  const typeStack: Array<GraphQLType> = [type];
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
    [Kind.SELECTION_SET](
      node: SelectionSetNode,
    ): SelectionSetNode | null | undefined {
      const parentType: GraphQLType = resolveType(
        typeStack[typeStack.length - 1],
      );
      const parentTypeName = parentType.name;
      let selections = node.selections;
      if (
        (parentType instanceof GraphQLInterfaceType ||
          parentType instanceof GraphQLUnionType) &&
        !selections.find(
          _ =>
            (_ as FieldNode).kind === Kind.FIELD &&
            (_ as FieldNode).name.value === '__typename',
        )
      ) {
        selections = selections.concat({
          kind: Kind.FIELD,
          name: {
            kind: Kind.NAME,
            value: '__typename',
          },
        });
      }

      if (fragmentReplacements[parentTypeName]) {
        selections.forEach(selection => {
          if (selection.kind === Kind.FIELD) {
            const name = selection.name.value;
            const fragment = fragmentReplacements[parentTypeName][name];
            if (fragment) {
              selections = selections.concat(fragment);
            }
          }
        });
      }

      if (selections !== node.selections) {
        return {
          ...node,
          selections,
        };
      }
    },
    [Kind.FRAGMENT_SPREAD](node: FragmentSpreadNode): null | undefined {
      const fragmentFiltered = validFragments.filter(
        frg => frg.name.value === node.name.value,
      );
      const fragment = fragmentFiltered[0];
      if (fragment) {
        if (fragment.typeCondition) {
          const innerType = schema.getType(fragment.typeCondition.name.value);
          const parentType: GraphQLNamedType = resolveType(
            typeStack[typeStack.length - 1],
          );
          if (!implementsAbstractType(parentType, innerType)) {
            return null;
          }
        }
        usedFragments.push(node.name.value);
        return;
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
          if (implementsAbstractType(parentType, innerType)) {
            typeStack.push(innerType);
          } else {
            return null;
          }
        }
      },
      leave(node: InlineFragmentNode): null | undefined {
        if (node.typeCondition) {
          const innerType = schema.getType(node.typeCondition.name.value);
          if (innerType) {
            typeStack.pop();
          } else {
            return null;
          }
        }
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

function implementsAbstractType(
  parent: GraphQLType,
  child: GraphQLType,
  bail: boolean = false,
): boolean {
  if (parent === child) {
    return true;
  } else if (
    parent instanceof GraphQLInterfaceType &&
    child instanceof GraphQLObjectType
  ) {
    return child.getInterfaces().indexOf(parent) !== -1;
  } else if (
    parent instanceof GraphQLUnionType &&
    child instanceof GraphQLObjectType
  ) {
    return parent.getTypes().indexOf(child) !== -1;
  } else if (parent instanceof GraphQLObjectType && !bail) {
    return implementsAbstractType(child, parent, true);
  }

  return false;
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

function difference(
  from: Array<string>,
  ...arrays: Array<Array<string>>
): Array<string> {
  const cache: { [key: string]: Boolean } = {};
  arrays.forEach(array => {
    array.forEach(item => {
      cache[item] = true;
    });
  });
  return from.filter(item => !cache[item]);
}
