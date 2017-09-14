import {
  isEmpty,
  mapValues,
  fromPairs,
  forEach,
  pick,
  values,
  union,
  keyBy,
  difference,
} from 'lodash';
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLList,
  isNamedType,
  isCompositeType,
  getNamedType,
  Kind,
  execute,
  visit,
  parse,
  GraphQLFieldMap,
  GraphQLInputFieldConfigMap,
  GraphQLFieldConfigMap,
  GraphQLField,
  GraphQLArgument,
  GraphQLFieldConfigArgumentMap,
  GraphQLArgumentConfig,
  GraphQLCompositeType,
  GraphQLType,
  DocumentNode,
  SelectionSetNode,
  FragmentDefinitionNode,
  OperationDefinitionNode,
  FieldNode,
  VariableDefinitionNode,
  InlineFragmentNode,
  GraphQLInputType,
  VariableNode,
  TypeNode,
  FragmentSpreadNode,
  GraphQLFieldConfig,
  GraphQLResolveInfo,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLInputObjectType,
  GraphQLInputFieldMap,
  GraphQLInputField,
  GraphQLInputFieldConfig,
} from 'graphql';
import TypeRegistry from './TypeRegistry';
import { SchemaLink } from './types';
import resolveFromParentTypename from './resolveFromParentTypename';
import addTypenameForFragments from './addTypenameForFragments';

type EnhancedGraphQLFieldResolver<TSource, TContext> = (
  source: TSource,
  args: { [argName: string]: any },
  context: TContext,
  info: GraphQLResolveInfo,
  implicitArgs?: { [argName: string]: any },
) => any;

export default function mergeSchemas({
  links = [],
  schemas,
  onTypeConflict,
}: {
  links?: Array<SchemaLink>;
  schemas: Array<GraphQLSchema>;
  onTypeConflict?: (
    leftType: GraphQLCompositeType,
    rightType: GraphQLCompositeType,
  ) => GraphQLCompositeType;
}): GraphQLSchema {
  let queryFields: GraphQLFieldConfigMap<any, any> = {};
  let mutationFields: GraphQLFieldConfigMap<any, any> = {};

  const typeRegistry = new TypeRegistry();

  schemas.forEach(schema => {
    typeRegistry.addSchema(schema);
  });

  typeRegistry.addLinks(
    links.map(link => ({
      ...link,
      inlineFragment:
        link.fragment && parseFragmentToInlineFragment(link.fragment),
    })),
  );

  schemas.forEach(schema => {
    const typeMap = schema.getTypeMap();
    const queryType = schema.getQueryType();
    const mutationType = schema.getMutationType();

    forEach(typeMap, (type: GraphQLType) => {
      if (
        isNamedType(type) &&
        getNamedType(type).name.slice(0, 2) !== '__' &&
        type !== queryType &&
        type !== mutationType
      ) {
        let newType;
        if (isCompositeType(type) || type instanceof GraphQLInputObjectType) {
          newType = recreateCompositeType(schema, type, typeRegistry);
        } else {
          newType = getNamedType(type);
        }
        typeRegistry.setType(newType.name, newType, onTypeConflict);
      }
    });

    const queryTypeFields = mapValues(
      fieldMapToFieldConfigMap(queryType.getFields(), typeRegistry),
      (field, name) => ({
        ...field,
        resolve: createForwardingResolver(typeRegistry, schema, name, 'query'),
      }),
    );
    queryFields = {
      ...queryFields,
      ...queryTypeFields,
    };
    if (mutationType) {
      const mutationTypeFields = mapValues(
        fieldMapToFieldConfigMap(mutationType.getFields(), typeRegistry),
        (field, name) => ({
          ...field,
          resolve: createForwardingResolver(
            typeRegistry,
            schema,
            name,
            'mutation',
          ),
        }),
      );

      mutationFields = {
        ...mutationFields,
        ...mutationTypeFields,
      };
    }
  });

  const query = new GraphQLObjectType({
    name: 'Query',
    fields: {
      ...queryFields,
    },
  });
  typeRegistry.setQuery(query);
  let mutation;
  if (!isEmpty(mutationFields)) {
    mutation = new GraphQLObjectType({
      name: 'Mutation',
      fields: {
        ...mutationFields,
      },
    });
    typeRegistry.setMutation(mutation);
  }

  return new GraphQLSchema({
    query,
    mutation,
  });
}

function recreateCompositeType(
  schema: GraphQLSchema,
  type: GraphQLCompositeType | GraphQLInputObjectType,
  registry: TypeRegistry,
): GraphQLCompositeType | GraphQLInputObjectType {
  if (type instanceof GraphQLObjectType) {
    const fields = type.getFields();
    const interfaces = type.getInterfaces();

    return new GraphQLObjectType({
      name: type.name,
      description: type.description,
      isTypeOf: type.isTypeOf,
      fields: () => ({
        ...fieldMapToFieldConfigMap(fields, registry),
        ...createLinks(registry.getLinksByType(type.name), registry),
      }),
      interfaces: () => interfaces.map(iface => registry.resolveType(iface)),
    });
  } else if (type instanceof GraphQLInterfaceType) {
    const fields = type.getFields();

    return new GraphQLInterfaceType({
      name: type.name,
      description: type.description,
      fields: () => ({
        ...fieldMapToFieldConfigMap(fields, registry),
        ...createLinks(registry.getLinksByType(type.name), registry),
      }),
      resolveType: (parent, context, info) =>
        resolveFromParentTypename(parent, info.schema),
    });
  } else if (type instanceof GraphQLUnionType) {
    return new GraphQLUnionType({
      name: type.name,
      description: type.description,
      types: () =>
        type.getTypes().map(unionMember => registry.resolveType(unionMember)),
      resolveType: (parent, context, info) =>
        resolveFromParentTypename(parent, info.schema),
    });
  } else if (type instanceof GraphQLInputObjectType) {
    return new GraphQLInputObjectType({
      name: type.name,
      description: type.description,
      fields: () => inputFieldMapToFieldConfigMap(type.getFields(), registry),
    });
  } else {
    throw new Error('Invalid type ${type.name}');
  }
}

function fieldMapToFieldConfigMap(
  fields: GraphQLFieldMap<any, any>,
  registry: TypeRegistry,
): GraphQLFieldConfigMap<any, any> {
  return mapValues(fields, field => fieldToFieldConfig(field, registry));
}

function fieldToFieldConfig(
  field: GraphQLField<any, any>,
  registry: TypeRegistry,
): GraphQLFieldConfig<any, any> {
  return {
    type: registry.resolveType(field.type),
    args: argsToFieldConfigArgumentMap(field.args, registry),
    description: field.description,
    deprecationReason: field.deprecationReason,
  };
}

function argsToFieldConfigArgumentMap(
  args: Array<GraphQLArgument>,
  registry: TypeRegistry,
): GraphQLFieldConfigArgumentMap {
  return fromPairs(args.map(arg => argumentToArgumentConfig(arg, registry)));
}

function argumentToArgumentConfig(
  argument: GraphQLArgument,
  registry: TypeRegistry,
): [string, GraphQLArgumentConfig] {
  return [
    argument.name,
    {
      type: registry.resolveType(argument.type),
      defaultValue: argument.defaultValue,
      description: argument.description,
    },
  ];
}

function inputFieldMapToFieldConfigMap(
  fields: GraphQLInputFieldMap,
  registry: TypeRegistry,
): GraphQLInputFieldConfigMap {
  return mapValues(fields, field => inputFieldToFieldConfig(field, registry));
}

function inputFieldToFieldConfig(
  field: GraphQLInputField,
  registry: TypeRegistry,
): GraphQLInputFieldConfig {
  return {
    type: registry.resolveType(field.type),
    description: field.description,
  };
}

function createLinks(
  links: Array<SchemaLink>,
  registry: TypeRegistry,
): { [key: string]: GraphQLFieldConfig<any, any> } {
  if (!registry.query) {
    throw new Error('Somehow we do not have Query in registry');
  }
  const queryFields = registry.query.getFields();
  return fromPairs(
    links.map(link => {
      const field = link.to;
      const schema = registry.getSchemaByRootField(field);
      const resolver: EnhancedGraphQLFieldResolver<
        any,
        any
      > = createForwardingResolver(registry, schema, field, 'query');
      const rootField = queryFields[link.to];
      const processedArgs = pick(
        argsToFieldConfigArgumentMap(rootField.args, registry),
        link.args || [],
      ) as GraphQLFieldConfigArgumentMap;
      const linkField: GraphQLFieldConfig<any, any> = {
        type: registry.resolveType(rootField.type),
        args: processedArgs,
        resolve: (parent, args, context, info) => {
          let implicitArgs;
          if (link.resolveArgs) {
            implicitArgs = link.resolveArgs(parent, args, context, info);
          } else {
            implicitArgs = {};
          }

          return resolver(parent, args, context, info, implicitArgs);
        },
      };
      return [link.name, linkField];
    }),
  );
}

function createForwardingResolver(
  registry: TypeRegistry,
  schema: GraphQLSchema,
  rootFieldName: string,
  operation: 'query' | 'mutation',
): EnhancedGraphQLFieldResolver<any, any> {
  return async (root, args, context, info, implicitArgs = {}) => {
    let type;
    if (operation === 'query') {
      type = schema.getQueryType();
    } else {
      type = schema.getMutationType();
    }
    if (type) {
      const graphqlDoc: DocumentNode = createDocument(
        registry,
        schema,
        type,
        rootFieldName,
        operation,
        info.fieldNodes,
        info.fragments,
        info.operation.variableDefinitions,
      );

      const operationDefinition = graphqlDoc.definitions.find(
        ({ kind }) => kind === Kind.OPERATION_DEFINITION,
      );
      let variableValues;
      if (
        operationDefinition &&
        operationDefinition.kind === Kind.OPERATION_DEFINITION &&
        operationDefinition.variableDefinitions
      ) {
        variableValues = fromPairs(
          operationDefinition.variableDefinitions.map(definition => {
            const key = definition.variable.name.value;
            // (XXX) This is kinda hacky
            let actualKey = key;
            if (actualKey.startsWith('_')) {
              actualKey = actualKey.slice(1);
            }
            const value =
              implicitArgs[actualKey] || args[key] || info.variableValues[key];
            return [key, value];
          }),
        );
      }

      const result = await execute(
        schema,
        graphqlDoc,
        info.rootValue,
        context,
        variableValues,
      );

      // const print = require('graphql').print;
      // console.log(
      //   'RESULT FROM FORWARDING\n',
      //   print(graphqlDoc),
      //   '\n',
      //   JSON.stringify(variableValues, null, 2),
      //   '\n',
      //   JSON.stringify(result, null, 2),
      // );

      if (result.errors) {
        throw new Error(result.errors[0].message);
      } else {
        return result.data[rootFieldName];
      }
    }

    throw new Error('Could not forward to merged schema');
  };
}

function createDocument(
  registry: TypeRegistry,
  schema: GraphQLSchema,
  type: GraphQLObjectType,
  rootFieldName: string,
  operation: 'query' | 'mutation',
  selections: Array<FieldNode>,
  fragments: { [fragmentName: string]: FragmentDefinitionNode },
  variableDefinitions?: Array<VariableDefinitionNode>,
): DocumentNode {
  const rootField = type.getFields()[rootFieldName];
  const requiredArgs = rootField.args.filter(
    arg => arg.type instanceof GraphQLNonNull,
  );
  const requiredArgMap = keyBy(requiredArgs, arg => arg.name);
  const newVariables: Array<{ arg: string; variable: string }> = [];
  const rootSelectionSet = {
    kind: Kind.SELECTION_SET,
    // (XXX) This (wrongly) assumes only having one fieldNode
    selections: selections.map(selection => {
      if (selection.kind === Kind.FIELD) {
        const { selection: newSelection, variables } = processRootField(
          selection,
          rootFieldName,
          requiredArgs,
        );
        newVariables.push(...variables);
        return newSelection;
      } else {
        return selection;
      }
    }),
  };

  const newVariableDefinitions = newVariables.map(({ arg, variable }) => {
    const argDef = requiredArgMap[arg];
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
    registry,
    schema,
    type,
    rootSelectionSet,
    fragments,
  );

  const operationDefinition: OperationDefinitionNode = {
    kind: Kind.OPERATION_DEFINITION,
    operation,
    variableDefinitions: [
      ...(variableDefinitions || [])
        .filter(variableDefinition =>
          usedVariables.includes(variableDefinition.variable.name.value),
        ),
      ...newVariableDefinitions,
    ],
    selectionSet,
  };

  const newDoc: DocumentNode = {
    kind: Kind.DOCUMENT,
    definitions: [operationDefinition, ...processedFragments],
  };

  const newDocWithTypenames: DocumentNode = addTypenameForFragments(
    newDoc,
    schema,
  );
  return newDocWithTypenames;
}

function processRootField(
  selection: FieldNode,
  rootFieldName: string,
  requiredArgs: Array<GraphQLArgument>,
): {
  selection: FieldNode;
  variables: Array<{ arg: string; variable: string }>;
} {
  const existingArguments = selection.arguments || [];
  const existingArgumentNames = existingArguments.map(arg => arg.name.value);
  const missingArgumentNames = difference(
    requiredArgs.map(arg => arg.name),
    existingArgumentNames,
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
      arguments: [...existingArguments, ...missingArguments],
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
  registry: TypeRegistry,
  schema: GraphQLSchema,
  type: GraphQLType,
  selectionSet: SelectionSetNode,
  fragments: { [fragmentName: string]: FragmentDefinitionNode },
): {
  selectionSet: SelectionSetNode;
  fragments: Array<FragmentDefinitionNode>;
  usedVariables: Array<string>;
} {
  const validFragments = values(fragments)
    .filter(node => {
      const typeName = node.typeCondition.name.value;
      const innerType = schema.getType(typeName);
      return Boolean(innerType);
    })
    .map(node => node.name.value);
  let {
    selectionSet: newSelectionSet,
    usedFragments: remainingFragments,
    usedVariables,
  } = filterSelectionSet(registry, schema, type, selectionSet, validFragments);

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
        registry,
        schema,
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
  return {
    selectionSet: newSelectionSet,
    fragments: values(newFragments) as Array<FragmentDefinitionNode>,
    usedVariables,
  };
}

function filterSelectionSet(
  registry: TypeRegistry,
  schema: GraphQLSchema,
  type: GraphQLType,
  selectionSet: SelectionSetNode,
  validFragments: Array<string>,
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
      enter(node: FieldNode) {
        let parentType: GraphQLType = resolveType(
          typeStack[typeStack.length - 1],
        );
        if (
          parentType instanceof GraphQLNonNull ||
          parentType instanceof GraphQLList
        ) {
          parentType = parentType.ofType;
        }
        if (
          parentType instanceof GraphQLObjectType ||
          parentType instanceof GraphQLInterfaceType
        ) {
          const fields = parentType.getFields();
          const field = fields[node.name.value];
          if (!field) {
            const link = registry.getLinkByAddress(
              parentType.name,
              node.name.value,
            );
            if (link && link.inlineFragment) {
              return link.inlineFragment;
            } else {
              return null;
            }
          } else {
            typeStack.push(field.type);
          }
        }
      },
      leave() {
        typeStack.pop();
      },
    },
    [Kind.FRAGMENT_SPREAD](node: FragmentSpreadNode): null | undefined {
      if (validFragments.includes(node.name.value)) {
        usedFragments.push(node.name.value);
      } else {
        return null;
      }
    },
    [Kind.INLINE_FRAGMENT]: {
      enter(node: InlineFragmentNode): null | undefined {
        if (node.typeCondition) {
          const innerType = schema.getType(node.typeCondition.name.value);
          if (innerType) {
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

function resolveType(type: GraphQLType): GraphQLType {
  let lastType = type;
  while (
    lastType instanceof GraphQLNonNull ||
    lastType instanceof GraphQLList
  ) {
    lastType = lastType.ofType;
  }
  return lastType;
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

function parseFragmentToInlineFragment(
  definitions: string,
): InlineFragmentNode {
  const document = parse(definitions);
  for (const definition of document.definitions) {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      return {
        kind: Kind.INLINE_FRAGMENT,
        typeCondition: definition.typeCondition,
        selectionSet: definition.selectionSet,
      };
    }
  }
  throw new Error('Could not parse fragment');
}
