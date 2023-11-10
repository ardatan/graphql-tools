import {
  ASTNode,
  DocumentNode,
  FieldNode,
  getNamedType,
  GraphQLObjectType,
  GraphQLSchema,
  isAbstractType,
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

  return { newFieldNode, resolverOperationDocument, resolvedFieldPath: deepestFieldNodePath };
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
  // Supergraph Schema
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

  const resolverOperationNodes = [];
  const resolverDependencyMap = new Map<string, ResolverOperationNode[]>();
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
        );
        subFieldNode = newSubFieldNode;
        resolverDependencyMap.set(subFieldNode.name.value, subFieldResolverOperationNodes);
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
      } = createResolveNode(
        parentSubgraph,
        newFieldNode,
        resolverDirective,
        variableDirectives,
        resolverSelections,
      );
      newFieldNode = newFieldNodeForSubgraph;
      let fieldResolverDependencyMap: Map<string, ResolverOperationNode[]> | undefined;
      const fieldSubgraph = resolverDirective.subgraph;
      const fieldResolverOperationNodes: ResolverOperationNode[] = [
        {
          subgraph: fieldSubgraph,
          resolverOperationDocument,
          resolverDependencyMap: fieldResolverDependencyMap || new Map(),
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
          resolverDependencyMap: newFieldResolverDependencyMap,
        } = visitFieldNodeForTypeResolvers(
          fieldSubgraph,
          resolverOperationResolvedFieldNode,
          namedFieldType,
          supergraph,
        );
        resolverOperationResolvedFieldNode = newResolvedFieldNode;
        fieldResolverDependencyMap = newFieldResolverDependencyMap;
        fieldResolverOperationNodes.push(...subFieldResolverOperationNodes);
        _.set(resolverOperationDocument, resolvedFieldPath, resolverOperationResolvedFieldNode);
      } else if (isAbstractType(namedFieldType)) {
        let resolverOperationResolvedFieldNode = _.get(
          resolverOperationDocument,
          resolvedFieldPath,
        ) as FlattenedFieldNode;
        fieldResolverDependencyMap = new Map();
        for (const possibleType of supergraph.getPossibleTypes(namedFieldType)) {
          const {
            newFieldNode: newResolvedFieldNode,
            resolverOperationNodes: subFieldResolverOperationNodes,
            resolverDependencyMap: newFieldResolverDependencyMap,
          } = visitFieldNodeForTypeResolvers(
            fieldSubgraph,
            resolverOperationResolvedFieldNode,
            possibleType,
            supergraph,
          );
          resolverOperationResolvedFieldNode = newResolvedFieldNode;
          fieldResolverOperationNodes.push(...subFieldResolverOperationNodes);
          for (const [fieldName, dependencies] of newFieldResolverDependencyMap.entries()) {
            let existingDependencies = fieldResolverDependencyMap.get(fieldName);
            if (!existingDependencies) {
              existingDependencies = [];
              fieldResolverDependencyMap.set(fieldName, existingDependencies);
            }
            existingDependencies.push(...dependencies);
          }
        }
        _.set(resolverOperationDocument, resolvedFieldPath, resolverOperationResolvedFieldNode);
      }
      resolverDependencyMap.set(fieldAliasInParent, fieldResolverOperationNodes);
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
    const { newFieldNode: newFieldNodeForSubgraph, resolverOperationDocument } = createResolveNode(
      parentSubgraph,
      newFieldNode,
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
      const namedSelectionType = getNamedType(typeFieldMap[resolverSubFieldName].type);
      if (isObjectType(namedSelectionType)) {
        const {
          newFieldNode: newSubFieldNode,
          resolverOperationNodes: subFieldResolverOperationNodes,
        } = visitFieldNodeForTypeResolvers(
          fieldSubgraph,
          resolverSubFieldNode,
          namedSelectionType,
          supergraph,
        );
        resolverSelections[resolverSelectionIndex] = newSubFieldNode;
        resolverDependencyMap.set(resolverSubFieldName, subFieldResolverOperationNodes);
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
          );
          resolverSelections[resolverSelectionIndex] = newSubFieldNode;
          subFieldResolverOperationNodes.push(...subFieldResolverOperationNodes);
        }
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
