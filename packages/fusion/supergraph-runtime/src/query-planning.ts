import {
  ASTNode,
  DocumentNode,
  FieldNode,
  getNamedType,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLSchema,
  isAbstractType,
  isListType,
  isNonNullType,
  isObjectType,
  Kind,
  OperationDefinitionNode,
  parse,
  valueFromASTUntyped,
  visit,
} from 'graphql';
import _ from 'lodash';
import { DirectiveAnnotation } from '@graphql-tools/utils';
import { FlattenedFieldNode, FlattenedSelectionSet } from './flattenSelections.js';
import { ResolverConfig, ResolverVariableConfig } from './types.js';

// Resolution direction is from parentSubgraph to resolverDirective.subgraph
export function createResolveNode(
  // Subgraph of which that the field node belongs to
  parentSubgraph: string,
  // Field Node that returns this type
  fieldNode: FlattenedFieldNode,
  // Resolver Directive that is used to resolve this type
  resolverDirective: ResolverConfig,
  // Variable directives that are used to resolve this type
  variableDirectives: ResolverVariableConfig[],
  // Selections that are used to resolve this type
  resolverSelections: FlattenedFieldNode[],
  // Visitor context
  ctx: VisitorContext,
) {
  let resolverOperationDocument = parse(resolverDirective.operation, { noLocation: true });

  if (!fieldNode.selectionSet) {
    throw new Error('Object type should have a selectionSet');
  }

  const deepestFieldNodePath: (string | number)[] = [];

  const requiredVariableNames = new Set<string>();

  const newVariableNameMap = new Map<string, string>();

  const resolverOperationPath: (string | number)[] = [];

  resolverOperationDocument = visit(resolverOperationDocument, {
    OperationDefinition(_, __, ___, path) {
      resolverOperationPath.push(...path);
    },
    VariableDefinition(node) {
      const newVariableName = `__variable_${ctx.currentVariableIndex++}`;
      newVariableNameMap.set(node.variable.name.value, newVariableName);
      if (node.type.kind === Kind.NON_NULL_TYPE) {
        requiredVariableNames.add(node.variable.name.value);
      }
    },
    Variable(node) {
      const newVariableName = newVariableNameMap.get(node.name.value);
      if (!newVariableName) {
        throw new Error(`No variable name found for ${node.name.value}`);
      }
      return {
        ...node,
        name: {
          kind: Kind.NAME,
          value: newVariableName,
        },
      };
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
    d => d.subgraph === parentSubgraph && newVariableNameMap.has(d.name),
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
      const newVarName = newVariableNameMap.get(varDirective.name);
      if (!newVarName) {
        throw new Error(`No variable name found for ${varDirective.name}`);
      }
      const deepestFieldNodeInVarOp = _.get(varOp, deepestFieldNodePathInVarOp) as
        | FieldNode
        | undefined;
      _.set(varOp, deepestFieldNodePathInVarOp, {
        ...deepestFieldNodeInVarOp,
        alias: {
          kind: Kind.NAME,
          value: newVarName,
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
      if (!fieldArgumentNode && requiredVariableNames.has(varDirective.name)) {
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

  return {
    newFieldNode,
    resolverOperationDocument,
    resolvedFieldPath: deepestFieldNodePath,
    batch: resolverDirective.kind === 'BATCH',
  };
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

export function isList(type: GraphQLOutputType) {
  if (isNonNullType(type)) {
    return isList(type.ofType);
  } else if (isListType(type)) {
    return true;
  } else {
    return false;
  }
}

export function visitFieldNodeForTypeResolvers(
  // Subgraph of which that the field node belongs to
  parentSubgraph: string,
  // Field Node that returns this type
  fieldNode: FlattenedFieldNode,
  // Type that is returned by the field node
  type: GraphQLObjectType,
  // Supergraph Schema
  supergraph: GraphQLSchema,
  // Visitor context
  ctx: VisitorContext,
): {
  newFieldNode: FlattenedFieldNode;
  resolverOperationNodes: ResolverOperationNode[];
  resolverDependencyFieldMap: Map<string, ResolverOperationNode[]>;
} {
  if (!fieldNode.selectionSet) {
    throw new Error('Object type should have a selectionSet');
  }

  const typeFieldMap = type.getFields();

  const typeDirectives = getDefDirectives(type.astNode);

  // Visit for type resolvers

  const newFieldSelectionSet: FlattenedSelectionSet = {
    kind: Kind.SELECTION_SET,
    selections: [],
  };

  let newFieldNode: FlattenedFieldNode = {
    ...fieldNode,
    selectionSet: newFieldSelectionSet,
  };

  const resolverSelectionsBySubgraph: Record<string, FlattenedFieldNode[]> = {};

  const resolverOperationNodes: ResolverOperationNode[] = [];
  const resolverDependencyFieldMap = new Map<string, ResolverOperationNode[]>();
  for (const subFieldNodeIndex in fieldNode.selectionSet.selections) {
    let subFieldNode = fieldNode.selectionSet.selections[subFieldNodeIndex] as FlattenedFieldNode;
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
    const namedFieldType = getNamedType(fieldDefInType.type);
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
      if (isObjectType(namedFieldType)) {
        const {
          newFieldNode: newSubFieldNode,
          resolverOperationNodes: subFieldResolverOperationNodes,
        } = visitFieldNodeForTypeResolvers(
          parentSubgraph,
          subFieldNode,
          namedFieldType,
          supergraph,
          ctx,
        );
        subFieldNode = newSubFieldNode;
        resolverDependencyFieldMap.set(subFieldNode.name.value, subFieldResolverOperationNodes);
      } else if (isAbstractType(namedFieldType)) {
        const subFieldResolverOperationNodes: ResolverOperationNode[] = [];
        for (const possibleType of supergraph.getPossibleTypes(namedFieldType)) {
          const {
            newFieldNode: newSubFieldNode,
            resolverOperationNodes: subFieldResolverOperationNodesForPossibleType,
          } = visitFieldNodeForTypeResolvers(
            parentSubgraph,
            subFieldNode,
            possibleType,
            supergraph,
            ctx,
          );
          subFieldNode = newSubFieldNode;
          subFieldResolverOperationNodes.push(...subFieldResolverOperationNodesForPossibleType);
        }
      }
      newFieldSelectionSet.selections.push(subFieldNode);
      continue;
    }
    const sourceDirective = sourceDirectives[0] as DirectiveAnnotation | undefined;

    const subgraph = sourceDirective?.args?.['subgraph'];

    const fieldNameInParent = fieldDefInType.name;
    const fieldAliasInParent = subFieldNode.alias?.value ?? fieldNameInParent;
    const nameInSubgraph = sourceDirective?.args?.['name'] ?? fieldNameInParent;
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

    // Handle field resolvers
    const resolverDirective = fieldDirectives.find(d => d.name === 'resolver')
      ?.args as ResolverConfig;
    if (resolverDirective) {
      const variableDirectives = fieldDirectives
        .filter(d => d.name === 'variable')
        .map(d => d.args) as ResolverVariableConfig[];
      const resolverSelections = subFieldNode.selectionSet?.selections ?? [];
      const {
        newFieldNode: newFieldNodeForSubgraph,
        resolverOperationDocument,
        resolvedFieldPath,
        batch,
      } = createResolveNode(
        parentSubgraph,
        newFieldNode,
        resolverDirective,
        variableDirectives,
        resolverSelections,
        ctx,
      );
      newFieldNode = newFieldNodeForSubgraph;
      let fieldResolveFieldDependencyMap: Map<string, ResolverOperationNode[]> | undefined;
      const fieldSubgraph = resolverDirective.subgraph;
      const fieldResolverDependencies: ResolverOperationNode[] = [];
      const fieldResolverOperationNodes: ResolverOperationNode[] = [
        {
          subgraph: fieldSubgraph,
          resolverOperationDocument,
          resolverDependencies: fieldResolverDependencies,
          resolverDependencyFieldMap: fieldResolveFieldDependencyMap || new Map(),
          batch,
        },
      ];
      if (isObjectType(namedFieldType)) {
        let resolverOperationResolvedFieldNode = _.get(
          resolverOperationDocument,
          resolvedFieldPath,
        ) as FlattenedFieldNode;
        const {
          newFieldNode: newResolvedFieldNode,
          resolverOperationNodes: subFieldResolverOperationNodes,
          resolverDependencyFieldMap: newFieldResolverDependencyMap,
        } = visitFieldNodeForTypeResolvers(
          fieldSubgraph,
          resolverOperationResolvedFieldNode,
          namedFieldType,
          supergraph,
          ctx,
        );
        resolverOperationResolvedFieldNode = newResolvedFieldNode;
        fieldResolveFieldDependencyMap = newFieldResolverDependencyMap;
        fieldResolverDependencies.push(...subFieldResolverOperationNodes);
        _.set(resolverOperationDocument, resolvedFieldPath, resolverOperationResolvedFieldNode);
      } else if (isAbstractType(namedFieldType)) {
        let resolverOperationResolvedFieldNode = _.get(
          resolverOperationDocument,
          resolvedFieldPath,
        ) as FlattenedFieldNode;
        fieldResolveFieldDependencyMap = new Map();
        for (const possibleType of supergraph.getPossibleTypes(namedFieldType)) {
          const {
            newFieldNode: newResolvedFieldNode,
            resolverOperationNodes: subFieldResolverOperationNodes,
            resolverDependencyFieldMap: newFieldResolverDependencyMap,
          } = visitFieldNodeForTypeResolvers(
            fieldSubgraph,
            resolverOperationResolvedFieldNode,
            possibleType,
            supergraph,
            ctx,
          );
          resolverOperationResolvedFieldNode = newResolvedFieldNode;
          fieldResolverDependencies.push(...subFieldResolverOperationNodes);
          for (const [fieldName, dependencies] of newFieldResolverDependencyMap.entries()) {
            let existingDependencies = fieldResolveFieldDependencyMap.get(fieldName);
            if (!existingDependencies) {
              existingDependencies = [];
              fieldResolveFieldDependencyMap.set(fieldName, existingDependencies);
            }
            existingDependencies.push(...dependencies);
          }
        }
        _.set(resolverOperationDocument, resolvedFieldPath, resolverOperationResolvedFieldNode);
      }
      resolverDependencyFieldMap.set(fieldAliasInParent, fieldResolverOperationNodes);
    } else {
      if (!subgraph) {
        throw new Error(`No subgraph found for ${subFieldNode.name.value}`);
      }
      resolverSelectionsBySubgraph[subgraph] ||= [];
      resolverSelectionsBySubgraph[subgraph].push(subFieldNode);
    }
  }

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
    const {
      newFieldNode: newFieldNodeForSubgraph,
      resolverOperationDocument,
      batch,
    } = createResolveNode(
      parentSubgraph,
      newFieldNode,
      resolverDirective,
      variableDirectives,
      resolverSelections,
      ctx,
    );
    newFieldNode = newFieldNodeForSubgraph;
    const resolverDependencyFieldMap = new Map<string, ResolverOperationNode[]>();
    resolverOperationNodes.push({
      subgraph: fieldSubgraph,
      resolverOperationDocument,
      resolverDependencies: [],
      resolverDependencyFieldMap,
      batch,
    });

    for (const resolverSelectionIndex in resolverSelections) {
      const resolverSubFieldNode = resolverSelections[resolverSelectionIndex];
      const resolverSubFieldName = resolverSubFieldNode.name.value;
      const namedSelectionType = getNamedType(typeFieldMap[resolverSubFieldName].type);
      if (isObjectType(namedSelectionType)) {
        const {
          newFieldNode: newSubFieldNode,
          resolverOperationNodes: subFieldResolverOperationNodes,
          resolverDependencyFieldMap: subFieldResolverDependencyMap,
        } = visitFieldNodeForTypeResolvers(
          fieldSubgraph,
          resolverSubFieldNode,
          namedSelectionType,
          supergraph,
          ctx,
        );
        resolverSelections[resolverSelectionIndex] = newSubFieldNode;
        if (subFieldResolverOperationNodes.length) {
          resolverDependencyFieldMap.set(resolverSubFieldName, subFieldResolverOperationNodes);
        }
        for (const [subSubFieldName, dependencies] of subFieldResolverDependencyMap.entries()) {
          if (dependencies.length) {
            resolverDependencyFieldMap.set(
              `${resolverSubFieldName}.${subSubFieldName}`,
              dependencies,
            );
          }
        }
      } else if (isAbstractType(namedSelectionType)) {
        const subFieldResolverOperationNodes: ResolverOperationNode[] = [];
        for (const possibleType of supergraph.getPossibleTypes(namedSelectionType)) {
          const {
            newFieldNode: newSubFieldNode,
            resolverOperationNodes: subFieldResolverOperationNodes,
          } = visitFieldNodeForTypeResolvers(
            fieldSubgraph,
            resolverSelections[resolverSelectionIndex],
            possibleType,
            supergraph,
            ctx,
          );
          resolverSelections[resolverSelectionIndex] = newSubFieldNode;
          subFieldResolverOperationNodes.push(...subFieldResolverOperationNodes);
        }
        resolverDependencyFieldMap.set(resolverSubFieldName, subFieldResolverOperationNodes);
      }
    }
  }

  return {
    newFieldNode,
    resolverOperationNodes,
    resolverDependencyFieldMap,
  };
}

export interface ResolverOperationNode {
  subgraph: string;
  resolverOperationDocument: DocumentNode;
  resolverDependencies: ResolverOperationNode[];
  resolverDependencyFieldMap: Map<string, ResolverOperationNode[]>;
  batch?: boolean;
}

export interface VisitorContext {
  currentVariableIndex: number;
}
