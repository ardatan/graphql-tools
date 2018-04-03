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
  SelectionSetNode,
  TypeNameMetaFieldDef,
  TypeNode,
  VariableDefinitionNode,
  VariableNode,
  execute,
  visit,
  subscribe,
  validate,
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
  const {
    query: graphqlDoc,
    variables: variableValues
  } = createBatchOperation(
    schema,
    fragmentReplacements,
    operation,
    {
      [fieldName]: [args, context, info]
    },
    context,
    info
  );

  const errors = validate(schema, graphqlDoc);
  if (errors.length > 0) {
    throw errors;
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
  const info = {
    fieldNodes: selections,
    operation: {
      variableDefinitions
    },
    fragments
  };
  const {
    query: document
  } = createBatchOperation(
    schema,
    fragmentReplacements,
    operation,
    {
      [rootFieldName]: [{}, {}, info]
    },
    {},
    info
  );

  return document;
}

const DELIMITER = '___';
export function createBatchOperation(
  schema: GraphQLSchema,
  fragmentReplacements: {
    [typeName: string]: { [fieldName: string]: InlineFragmentNode };
  },
  operation: 'query' | 'mutation' | 'subscription',
  rootDefs: { [key: string]: [{ [key: string]: any }, { [key: string]: any }, any] },
  graphqlContext: { [key: string]: any },
  documentInfo: {
    operation: {
      name?: { [key: string]: any }
      variableDefinitions?: Array<VariableDefinitionNode>,
    },
    variableValues?: { [variableName: string]: any },
    fragments?: { [fragmentName: string]: FragmentDefinitionNode },
  },
): {
  query: DocumentNode,
  variables: { [key: string]: any },
  context: {},
  operationName: string
} {
  let operationType: GraphQLObjectType;
  if (operation === 'mutation') {
    operationType = schema.getMutationType();
  } else if (operation === 'subscription') {
    operationType = schema.getSubscriptionType();
  } else {
    operationType = schema.getQueryType();
  }

  if (!operationType) {
    throw new Error(`Operation type "${operation}" not supported`);
  }

  const roots = Object.keys(rootDefs).map(key => {
    const [args, context, info] = rootDefs[key];
    const [a, n] = key.split(':');
    const name = n || a;
    const alias = n ? a : null;
    return {
      key: alias || name,
      name,
      alias,
      args,
      context: context || graphqlContext,
      info: info || documentInfo
    };
  });

  const newVariableDefinitions: VariableDefinitionNode[] = [];

  const selections = roots.reduce((newSelections, { key, name: rootFieldName, info, alias }) => {
    const rootSelections = info.fieldNodes.map((selection: FieldNode) => {
      if (selection.kind === Kind.FIELD) {
        const rootField = operationType.getFields()[rootFieldName];

        const { selection: newSelection, variables } = processRootField(
          selection,
          rootFieldName,
          rootField,
          key,
          alias
        );

        variables.forEach(({ arg, variable }) => {
          if (newVariableDefinitions.find(newVarDef => newVarDef.variable.name.value === variable)) {
            return;
          }

          const argDef = rootField.args.find(rootArg => rootArg.name === arg);

          if (!argDef) {
            throw new Error('Unexpected missing arg');
          }
          const typeName = typeToAst(argDef.type);

          newVariableDefinitions.push({
            kind: Kind.VARIABLE_DEFINITION,
            variable: {
              kind: Kind.VARIABLE,
              name: {
                kind: Kind.NAME,
                value: variable
              }
            },
            type: typeName
          });
        });

        return newSelection;
      }
      return selection;
    });

    return newSelections.concat(rootSelections);
  }, []);

  const rootSelectionSet = {
    kind: Kind.SELECTION_SET,
    selections
  };

  const { selectionSet, usedVariables, fragments: processedFragments } = filterSelectionSetDeep(
    schema,
    fragmentReplacements,
    operationType,
    rootSelectionSet,
    documentInfo.fragments
  );

  const variableDefinitions = (documentInfo.operation.variableDefinitions || [])
    .filter(varDef => usedVariables.indexOf(varDef.variable.name.value) !== -1)
    .concat(newVariableDefinitions);

  const operationDefinition = {
    kind: Kind.OPERATION_DEFINITION,
    operation,
    variableDefinitions,
    selectionSet
  };

  let variableValues = {};
  if (
    operationDefinition.variableDefinitions &&
    Array.isArray(operationDefinition.variableDefinitions)
  ) {
    for (const definition of operationDefinition.variableDefinitions) {
      const variableName = definition.variable.name.value;

      // (XXX) This is kinda hacky
      const actualKey = variableName.startsWith('_') ? variableName.slice(1) : variableName;
      const [finalKey, key] = actualKey.split(DELIMITER);
      const root = roots.find(r => r.key === key);

      variableValues[variableName] = root
        ? root.args[finalKey] || root.info.variableValues[variableName]
        : documentInfo.variableValues[variableName];
    }
  }

  const document = {
    kind: Kind.DOCUMENT,
    definitions: [operationDefinition, ...processedFragments]
  };

  return {
    query: document,
    variables: variableValues,
    context: graphqlContext,
    operationName:
      documentInfo.operation && documentInfo.operation.name && documentInfo.operation.name.value
  };
}

function processRootField(
  selection: FieldNode,
  rootFieldName: string,
  rootField: GraphQLField<any, any>,
  variableKey?: string,
  alias?: string,
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
    const variableName = `_${name}${variableKey ? `${DELIMITER}${variableKey}` : ''}`;
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
      alias: alias ? { kind: Kind.NAME, value: alias } : null,
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
    parent instanceof GraphQLInterfaceType &&
    child instanceof GraphQLInterfaceType
  ) {
    return true;
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
