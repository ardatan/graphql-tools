import {
  ASTNode,
  DefinitionNode,
  DocumentNode,
  FieldNode,
  getNamedType,
  GraphQLField,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLSchema,
  isObjectType,
  Kind,
  OperationDefinitionNode,
  parse,
  print,
  SelectionSetNode,
  valueFromASTUntyped,
  visit,
} from 'graphql';
import _ from 'lodash';
import { DirectiveAnnotation, getDirectives } from '@graphql-tools/utils';
import { FlattenedFieldNode, FlattenedSelectionSet } from './flattenSelections.js';
import { ResolverConfig, ResolverVariableConfig } from './types.js';

// Resolution direction is from parentSubgraph to resolverDirective.subgraph
export function visitForTypeResolver(
  // Subgraph of which that the field node belongs to
  parentSubgraph: string,
  // Field Node that returns this type
  fieldNode: FlattenedFieldNode,
  // Type that is returned by the field node
  type: GraphQLObjectType,
  // Supergraph schema
  supergraph: GraphQLSchema,
  // Resolver Directive that is used to resolve this type
  resolverDirective: ResolverConfig,
  // Variable directives that are used to resolve this type
  variableDirectives: ResolverVariableConfig[],
  // Selections that are used to resolve this type
  resolverSelections: FlattenedFieldNode[],
) {
  let resolverOperationDocument = parse(resolverDirective.operation, { noLocation: true });

  if (!fieldNode.selectionSet) {
    throw new Error('Object type should have a selectionSet');
  }

  const deepestFieldNodePath: (string | number)[] = [];

  const resolverVariableNames: string[] = [];
  const requiredVariableNames: string[] = [];

  const resolverOperationPath: (string | number)[] = [];

  visit(resolverOperationDocument, {
    OperationDefinition(_, __, ___, path) {
      resolverOperationPath.push(...path);
    },
    VariableDefinition(node) {
      resolverVariableNames.push(node.variable.name.value);
      if (node.type.kind === Kind.NON_NULL_TYPE) {
        requiredVariableNames.push(node.variable.name.value);
      }
    },
    Field(_node, _key, _parent, path) {
      if (path.length > deepestFieldNodePath.length) {
        deepestFieldNodePath.splice(0, deepestFieldNodePath.length, ...path);
      }
    },
  });

  // START: Handle variables and modify the parent field node if needed

  // This is the parent selection set
  const newFieldSelectionSet: FlattenedSelectionSet = {
    kind: Kind.SELECTION_SET,
    selections: [...fieldNode.selectionSet.selections],
  };
  const newFieldNode: FlattenedFieldNode = {
    ...fieldNode,
    selectionSet: newFieldSelectionSet,
  };

  const variableDirectivesForField = variableDirectives.filter(
    d => d.subgraph === parentSubgraph && resolverVariableNames.includes(d.name),
  );

  for (const varDirective of variableDirectivesForField) {
    if (varDirective.select) {
      const varOp = parse(`{${varDirective.select}}`, { noLocation: true });
      const deepestFieldNodePathInVarOp: (string | number)[] = [];
      visit(varOp, {
        Field(_node, _key, _parent, path) {
          if (path.length > deepestFieldNodePathInVarOp.length) {
            deepestFieldNodePathInVarOp.splice(0, deepestFieldNodePathInVarOp.length, ...path);
          }
        },
      });
      const deepestFieldNodeInVarOp = _.get(varOp, deepestFieldNodePathInVarOp) as
        | FieldNode
        | undefined;
      _.set(varOp, deepestFieldNodePathInVarOp, {
        ...deepestFieldNodeInVarOp,
        alias: {
          kind: Kind.NAME,
          value: `__variable_${varDirective.name}`,
        },
      });
      const varOpSelectionSet = _.get(varOp, 'definitions.0.selectionSet') as
        | FlattenedSelectionSet
        | undefined;
      newFieldSelectionSet.selections.push(...(varOpSelectionSet?.selections ?? []));
    }
    // If select is not given, use the variable as the default value for the variable
    else {
      const fieldArgumentNode = newFieldNode.arguments?.find(
        argument => argument.name.value === varDirective.name,
      );
      if (fieldArgumentNode) {
        // If the resolver variable matches the name of the argument, use the variable of the actual operation in the resolver document
        if (fieldArgumentNode.value.kind === Kind.VARIABLE) {
          const fieldArgValueNode = fieldArgumentNode.value;
          resolverOperationDocument = visit(resolverOperationDocument, {
            [Kind.VARIABLE](node) {
              if (node.name.value === varDirective.name) {
                return fieldArgValueNode;
              }
            },
            [Kind.VARIABLE_DEFINITION](node) {
              if (node.variable.name.value === varDirective.name) {
                return {
                  ...node,
                  name: fieldArgValueNode.name,
                };
              }
            },
          });
          // If it is not a variable in the actual operation, use the value as the default value for the variable
        } else {
          const resolverOperation: OperationDefinitionNode = _.get(
            resolverOperationDocument,
            resolverOperationPath,
          );
          const variableInResolveOp = resolverOperation.variableDefinitions?.find(
            variableDefinition => variableDefinition.variable.name.value === varDirective.name,
          );
          if (variableInResolveOp) {
            _.set(variableInResolveOp, 'defaultValue', fieldArgumentNode.value);
          }
        }
      }
      if (!fieldArgumentNode && requiredVariableNames.includes(varDirective.name)) {
        throw new Error(
          `Required variable does not select anything for either from field argument or type`,
        );
      }
    }
  }

  // END: Handle variables and modify the parent field node if needed

  // Modify the exported selection from the resolver operation

  const existingDeepestFieldNode = _.get(
    resolverOperationDocument,
    deepestFieldNodePath,
  ) as FlattenedFieldNode;
  _.set(resolverOperationDocument, deepestFieldNodePath, {
    ...existingDeepestFieldNode,
    alias: {
      kind: Kind.NAME,
      value: '__export',
    },
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections: resolverSelections,
    },
  });

  return { newFieldNode, resolverOperationDocument, resolverFieldNodePath: deepestFieldNodePath };
}

function getDefDirectives(astNode?: ASTNode | null) {
  const directiveAnnotations: DirectiveAnnotation[] = [];
  if (astNode != null && 'directives' in astNode) {
    astNode.directives?.forEach(directiveNode => {
      directiveAnnotations.push({
        name: directiveNode.name.value,
        args:
          directiveNode.arguments?.reduce(
            (acc, arg) => {
              acc[arg.name.value] = valueFromASTUntyped(arg.value);
              return acc;
            },
            {} as Record<string, any>,
          ) ?? {},
      });
    });
  }
  return directiveAnnotations;
}

export function visitFieldNodeForTypeResolvers(
  // Subgraph of which that the field node belongs to
  parentSubgraph: string,
  // Field Node that returns this type
  fieldNode: FlattenedFieldNode,
  // Type that is returned by the field node
  type: GraphQLObjectType,
  // Supergraph schema
  supergraph: GraphQLSchema,
): {
  newFieldNode: FlattenedFieldNode;
  resolverOperationNodes: ResolverOperationNode[];
  resolverDependencyMap: Map<string, ResolverOperationNode[]>;
} {
  if (!fieldNode.selectionSet) {
    throw new Error('Object type should have a selectionSet');
  }

  const typeFieldMap = type.getFields();
  // Visit for type resolvers

  const newFieldSelectionSet: FlattenedSelectionSet = {
    kind: Kind.SELECTION_SET,
    selections: [],
  };
  const resolverSelectionsBySubgraph: Record<string, FlattenedFieldNode[]> = {};

  const resolverOperationNodes = [];
  const resolverDependencyMap = new Map<string, ResolverOperationNode[]>();
  for (let subFieldNode of fieldNode.selectionSet.selections) {
    const fieldDefInType = typeFieldMap[subFieldNode.name.value];
    if (!fieldDefInType) {
      throw new Error(`No field definition found for ${subFieldNode.name.value}`);
    }
    const fieldDirectives = getDefDirectives(fieldDefInType.astNode);
    const sourceDirectives = fieldDirectives.filter(d => d.name === 'source');
    const sourceDirectiveForThisSubgraph = sourceDirectives.find(
      d => d.args?.['subgraph'] === parentSubgraph,
    );
    // Resolve the selections of the field even if it is the same subgraph
    if (sourceDirectiveForThisSubgraph) {
      const fieldNameInParent = fieldDefInType.name;
      const fieldAliasInParent = subFieldNode.alias?.value ?? fieldNameInParent;
      const nameInSubgraph = sourceDirectiveForThisSubgraph.args?.['name'] ?? fieldNameInParent;
      if (nameInSubgraph !== fieldNameInParent || fieldNameInParent !== fieldAliasInParent) {
        subFieldNode = {
          ...subFieldNode,
          name: {
            kind: Kind.NAME,
            value: nameInSubgraph,
          },
          alias: {
            kind: Kind.NAME,
            value: fieldAliasInParent,
          },
        };
      }
      const namedType = getNamedType(fieldDefInType.type);
      if (isObjectType(namedType)) {
        const {
          newFieldNode: newSubFieldNode,
          resolverOperationNodes: subFieldResolverOperationNodes,
        } = visitFieldNodeForTypeResolvers(parentSubgraph, subFieldNode, namedType, supergraph);
        subFieldNode = newSubFieldNode;
        resolverDependencyMap.set(subFieldNode.name.value, subFieldResolverOperationNodes);
      }
      newFieldSelectionSet.selections.push(subFieldNode);
      continue;
    }
    const sourceDirective = sourceDirectives[0];
    if (!sourceDirective) {
      throw new Error(`No source directive found for ${subFieldNode.name.value}`);
    }
    const subgraph = sourceDirective.args?.['subgraph'];
    if (!subgraph) {
      throw new Error(`No subgraph argument found for ${subFieldNode.name.value}`);
    }
    resolverSelectionsBySubgraph[subgraph] ||= [];

    const fieldNameInParent = fieldDefInType.name;
    const fieldAliasInParent = subFieldNode.alias?.value ?? fieldNameInParent;
    const nameInSubgraph = sourceDirective.args?.['name'] ?? fieldNameInParent;
    if (nameInSubgraph !== fieldNameInParent || fieldNameInParent !== fieldAliasInParent) {
      subFieldNode = {
        ...subFieldNode,
        name: {
          kind: Kind.NAME,
          value: nameInSubgraph,
        },
        alias: {
          kind: Kind.NAME,
          value: fieldAliasInParent,
        },
      };
    }
    resolverSelectionsBySubgraph[subgraph].push(subFieldNode);
  }

  const typeDirectives = getDefDirectives(type.astNode);

  let newFieldNode: FlattenedFieldNode = {
    ...fieldNode,
    selectionSet: newFieldSelectionSet,
  };

  for (const fieldSubgraph in resolverSelectionsBySubgraph) {
    const resolverDirective = typeDirectives.find(
      d => d.name === 'resolver' && d.args?.['subgraph'] === fieldSubgraph,
    )?.args as ResolverConfig;
    if (!resolverDirective) {
      throw new Error(`No resolver directive found for ${fieldSubgraph}`);
    }
    const resolverSelections = resolverSelectionsBySubgraph[fieldSubgraph];
    const variableDirectives = typeDirectives
      .filter(d => d.name === 'variable')
      .map(d => d.args) as ResolverVariableConfig[];
    const { newFieldNode: newFieldNodeForSubgraph, resolverOperationDocument } =
      visitForTypeResolver(
        parentSubgraph,
        newFieldNode,
        type,
        supergraph,
        resolverDirective,
        variableDirectives,
        resolverSelections,
      );
    newFieldNode = newFieldNodeForSubgraph;
    const resolverDependencyMap = new Map<string, ResolverOperationNode[]>();
    resolverOperationNodes.push({
      subgraph: fieldSubgraph,
      resolverOperationDocument,
      resolverDependencyMap,
    });

    for (const resolverSelectionIndex in resolverSelections) {
      const resolverSubFieldNode = resolverSelections[resolverSelectionIndex];
      const resolverSubFieldName = resolverSubFieldNode.name.value;
      const namedType = getNamedType(typeFieldMap[resolverSubFieldName].type);
      if (isObjectType(namedType)) {
        const {
          newFieldNode: newSubFieldNode,
          resolverOperationNodes: subFieldResolverOperationNodes,
        } = visitFieldNodeForTypeResolvers(
          fieldSubgraph,
          resolverSubFieldNode,
          namedType,
          supergraph,
        );
        resolverSelections[resolverSelectionIndex] = newSubFieldNode;
        resolverDependencyMap.set(resolverSubFieldName, subFieldResolverOperationNodes);
      }
    }
  }

  return {
    newFieldNode,
    resolverOperationNodes,
    resolverDependencyMap,
  };
}

export interface ResolverOperationNode {
  subgraph: string;
  resolverOperationDocument: DocumentNode;
  resolverDependencyMap: Map<string, ResolverOperationNode[]>;
}

// NEXT BEFORE ABOVE
function visitForFieldResolver(
  parentSelections: FlattenedFieldNode[],
  parentSubgraph: string,
  fieldType: GraphQLNamedType,
  fieldNode: FlattenedFieldNode,
  supergraph: GraphQLSchema,
  resolverDirective: ResolverConfig,
  variableDirectives: ResolverVariableConfig[],
) {
  const resolverVariables: string[] = [];
  visit(fieldNode, {
    VariableDefinition(node) {
      resolverVariables.push(node.variable.name.value);
    },
  });
  const resolverVariableDirectives = variableDirectives.filter(
    d => d.subgraph === parentSubgraph && resolverVariables.includes(d.name),
  );
  for (const varDirective of resolverVariableDirectives) {
    if (varDirective.select) {
      const varOp = parse(`{${varDirective.select}}`, { noLocation: true });
      const deepestFieldNodePath: (string | number)[] = [];
      visit(varOp, {
        Field(_node, _key, _parent, path) {
          if (path.length > deepestFieldNodePath.length) {
            deepestFieldNodePath.splice(0, deepestFieldNodePath.length, ...path);
          }
        },
      });
      const deepestFieldNode = _.get(varOp, deepestFieldNodePath) as FieldNode | undefined;
      _.set(varOp, deepestFieldNodePath, {
        ...deepestFieldNode,
        alias: {
          kind: Kind.NAME,
          value: `__variable_${varDirective.name}`,
        },
      });
      const varOpSelectionSet = _.get(varOp, 'definitions.0.selectionSet') as
        | FlattenedSelectionSet
        | undefined;
      parentSelections.push(...(varOpSelectionSet?.selections ?? []));
    }
  }
}
