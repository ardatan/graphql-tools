import {
  isEmpty,
  mapValues,
  fromPairs,
  forEach,
  values,
  union,
  difference,
  isString,
  merge,
  includes,
} from 'lodash';
import {
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  GraphQLArgument,
  GraphQLArgumentConfig,
  GraphQLCompositeType,
  GraphQLField,
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLFieldConfigMap,
  GraphQLFieldMap,
  GraphQLFieldResolver,
  GraphQLInputField,
  GraphQLInputFieldConfig,
  GraphQLInputFieldConfigMap,
  GraphQLInputFieldMap,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLType,
  GraphQLUnionType,
  InlineFragmentNode,
  Kind,
  OperationDefinitionNode,
  SelectionSetNode,
  TypeNode,
  TypeNameMetaFieldDef,
  VariableDefinitionNode,
  VariableNode,
  buildASTSchema,
  execute,
  getNamedType,
  isCompositeType,
  isNamedType,
  parse,
  visit,
  extendSchema,
} from 'graphql';
import TypeRegistry from './TypeRegistry';
import { IResolvers } from '../Interfaces';
import {
  extractExtensionDefinitions,
  addResolveFunctionsToSchema,
} from '../schemaGenerator';
import resolveFromParentTypename from './resolveFromParentTypename';

export type MergeInfo = {
  delegate: (
    type: 'query' | 'mutation',
    fieldName: string,
    args: { [key: string]: any },
    context: { [key: string]: any },
    info: GraphQLResolveInfo,
  ) => any;
};

export default function mergeSchemas({
  schemas,
  onTypeConflict,
  resolvers,
}: {
  schemas: Array<GraphQLSchema | string>;
  onTypeConflict?: (
    leftType: GraphQLCompositeType,
    rightType: GraphQLCompositeType,
  ) => GraphQLCompositeType;
  resolvers: (mergeInfo: MergeInfo) => IResolvers;
}): GraphQLSchema {
  let queryFields: GraphQLFieldConfigMap<any, any> = {};
  let mutationFields: GraphQLFieldConfigMap<any, any> = {};

  const typeRegistry = new TypeRegistry();

  const mergeInfo: MergeInfo = createMergeInfo(typeRegistry);

  const actualSchemas: Array<GraphQLSchema> = [];
  const extensions: Array<DocumentNode> = [];
  let fullResolvers: IResolvers = {};

  schemas.forEach(schema => {
    if (schema instanceof GraphQLSchema) {
      actualSchemas.push(schema);
    } else if (isString(schema)) {
      let parsedSchemaDocument = parse(schema);
      try {
        const actualSchema = buildASTSchema(parsedSchemaDocument);
        actualSchemas.push(actualSchema);
      } catch (e) {
        // Could not create a schema from parsed string, will use extensions
      }
      parsedSchemaDocument = extractExtensionDefinitions(parsedSchemaDocument);
      if (parsedSchemaDocument.definitions.length > 0) {
        extensions.push(parsedSchemaDocument);
      }
    }
  });

  actualSchemas.forEach(schema => {
    typeRegistry.addSchema(schema);
    const queryType = schema.getQueryType();
    const mutationType = schema.getMutationType();

    forEach(schema.getTypeMap(), (type: GraphQLType) => {
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
        typeRegistry.addType(newType.name, newType, onTypeConflict);
      }
    });

    forEach(queryType.getFields(), (field, name) => {
      if (!fullResolvers.Query) {
        fullResolvers.Query = {};
      }
      fullResolvers.Query[name] = createDelegatingResolver(
        mergeInfo,
        'query',
        name,
      );
    });

    queryFields = {
      ...queryFields,
      ...fieldMapToFieldConfigMap(queryType.getFields(), typeRegistry),
    };

    if (mutationType) {
      if (!fullResolvers.Mutation) {
        fullResolvers.Mutation = {};
      }
      forEach(mutationType.getFields(), (field, name) => {
        fullResolvers.Mutation[name] = createDelegatingResolver(
          mergeInfo,
          'mutation',
          name,
        );
      });

      mutationFields = {
        ...mutationFields,
        ...fieldMapToFieldConfigMap(mutationType.getFields(), typeRegistry),
      };
    }
  });

  const passedResolvers = resolvers(mergeInfo);

  forEach(passedResolvers, (type, typeName) => {
    if (type instanceof GraphQLScalarType) {
      return;
    }
    forEach(type, (field, fieldName) => {
      if (field.fragment) {
        typeRegistry.addFragment(typeName, fieldName, field.fragment);
      }
    });
  });

  merge(fullResolvers, passedResolvers);

  const query = new GraphQLObjectType({
    name: 'Query',
    fields: {
      ...queryFields,
    },
  });

  let mutation;
  if (!isEmpty(mutationFields)) {
    mutation = new GraphQLObjectType({
      name: 'Mutation',
      fields: {
        ...mutationFields,
      },
    });
  }

  let mergedSchema = new GraphQLSchema({
    query,
    mutation,
    types: typeRegistry.getAllTypes(),
  });

  extensions.forEach(extension => {
    mergedSchema = extendSchema(mergedSchema, extension);
  });

  addResolveFunctionsToSchema(mergedSchema, fullResolvers);

  return mergedSchema;
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
      fields: () => fieldMapToFieldConfigMap(fields, registry),
      interfaces: () => interfaces.map(iface => registry.resolveType(iface)),
    });
  } else if (type instanceof GraphQLInterfaceType) {
    const fields = type.getFields();

    return new GraphQLInterfaceType({
      name: type.name,
      description: type.description,
      fields: () => fieldMapToFieldConfigMap(fields, registry),
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
    throw new Error(`Invalid type ${type}`);
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

function createMergeInfo(typeRegistry: TypeRegistry): MergeInfo {
  return {
    delegate(
      operation: 'query' | 'mutation',
      fieldName: string,
      args: { [key: string]: any },
      context: { [key: string]: any },
      info: GraphQLResolveInfo,
    ): any {
      const schema = typeRegistry.getSchemaByField(operation, fieldName);
      if (!schema) {
        throw new Error(
          `Cannot find subschema for root field ${operation}.${fieldName}`,
        );
      }
      const fragmentReplacements = typeRegistry.fragmentReplacements;
      return delegateToSchema(
        schema,
        fragmentReplacements,
        operation,
        fieldName,
        args,
        context,
        info,
      );
    },
  };
}

function createDelegatingResolver(
  mergeInfo: MergeInfo,
  operation: 'query' | 'mutation',
  fieldName: string,
): GraphQLFieldResolver<any, any> {
  return (root, args, context, info) => {
    return mergeInfo.delegate(operation, fieldName, args, context, info);
  };
}

async function delegateToSchema(
  schema: GraphQLSchema,
  fragmentReplacements: {
    [typeName: string]: { [fieldName: string]: InlineFragmentNode };
  },
  operation: 'query' | 'mutation',
  fieldName: string,
  args: { [key: string]: any },
  context: { [key: string]: any },
  info: GraphQLResolveInfo,
): Promise<any> {
  let type;
  if (operation === 'mutation') {
    type = schema.getMutationType();
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
            args[actualKey] || args[key] || info.variableValues[key];
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
      const errorMessage = result.errors.map(error => error.message).join('\n');
      throw new Error(errorMessage);
    } else {
      return result.data[fieldName];
    }
  }

  throw new Error('Could not forward to merged schema');
}

function createDocument(
  schema: GraphQLSchema,
  fragmentReplacements: {
    [typeName: string]: { [fieldName: string]: InlineFragmentNode };
  },
  type: GraphQLObjectType,
  rootFieldName: string,
  operation: 'query' | 'mutation',
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
      ...(variableDefinitions || []).filter(variableDefinition =>
        includes(usedVariables, variableDefinition.variable.name.value),
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
  const missingArgumentNames = difference(
    rootField.args.map(arg => arg.name),
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
  return {
    selectionSet: newSelectionSet,
    fragments: values(newFragments) as Array<FragmentDefinitionNode>,
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
      enter(node: FieldNode): InlineFragmentNode | null | undefined {
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
          const field =
            node.name.value === '__typename'
              ? TypeNameMetaFieldDef
              : fields[node.name.value];
          if (!field) {
            const fragment =
              fragmentReplacements[parentType.name] &&
              fragmentReplacements[parentType.name][node.name.value];
            if (fragment) {
              return fragment;
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
    [Kind.SELECTION_SET](
      node: SelectionSetNode,
    ): SelectionSetNode | null | undefined {
      const parentType: GraphQLType = resolveType(
        typeStack[typeStack.length - 1],
      );
      if (
        parentType instanceof GraphQLInterfaceType ||
        parentType instanceof GraphQLUnionType
      ) {
        return {
          ...node,
          selections: node.selections.concat({
            kind: Kind.FIELD,
            name: {
              kind: Kind.NAME,
              value: '__typename',
            },
          }),
        };
      }
    },
    [Kind.FRAGMENT_SPREAD](node: FragmentSpreadNode): null | undefined {
      if (includes(validFragments, node.name.value)) {
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
