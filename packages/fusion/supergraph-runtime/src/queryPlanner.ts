import {
  ArgumentNode,
  FieldNode,
  FragmentDefinitionNode,
  isObjectType,
  Kind,
  OperationDefinitionNode,
  parse,
  SelectionNode,
  TypeInfo,
  visit,
  visitWithTypeInfo,
} from 'graphql';
import { getFieldDef } from '@graphql-tools/executor';
import { ExecutionRequest, getDirectives, getRootTypeMap } from '@graphql-tools/utils';
import { ProcessedSupergraph } from './processSupergraph.js';
import {
  ParallelNode,
  PlanNode,
  ResolveNode,
  ResolverConfig,
  ResolverVariableConfig,
  SequenceNode,
} from './types.js';
import { visitResolutionPath } from './visitResolutionPath.js';

interface QueryPlanner {
  plan(executionRequest: ExecutionRequest): PlanNode;
  _plan(planCtx: PlanContext): PlanNode;
}

interface PlanContext {
  resolverDirective: ResolverConfig;
  parentSelections: SelectionNode[];
  variableStateMap?: Map<string, string>;
  selectionFieldName?: string;
  fieldArgs?: readonly ArgumentNode[];
  uniqueIds: {
    selectionId: number;
    stateId: number;
  };
}

export function createQueryPlannerFromProcessedSupergraph({
  supergraphSchema,
}: ProcessedSupergraph): QueryPlanner {
  const rootTypeMap = getRootTypeMap(supergraphSchema);

  return {
    plan(executionRequest: ExecutionRequest) {
      const fragments: Record<string, FragmentDefinitionNode> = Object.create(null);
      let operationDefinition: OperationDefinitionNode | undefined;
      for (const definition of executionRequest.document.definitions) {
        if (definition.kind === Kind.FRAGMENT_DEFINITION) {
          fragments[definition.name.value] = definition;
        } else if (definition.kind === Kind.OPERATION_DEFINITION) {
          if (executionRequest.operationName === definition.name?.value) {
            operationDefinition = definition;
          } else if (operationDefinition?.operation === executionRequest.operationType) {
            operationDefinition = definition;
          } else {
            operationDefinition = definition;
          }
        }
      }
      if (!operationDefinition) {
        throw new Error(`No operation definition found`);
      }

      const rootType = rootTypeMap.get(operationDefinition.operation);
      if (!rootType) {
        throw new Error(`No root type found for operation type ${operationDefinition.operation}`);
      }

      const uniqueIds = {
        selectionId: 0,
        stateId: 0,
      };

      const parallelNode: ParallelNode = {
        type: 'Parallel',
        nodes: [],
      };
      for (const selection of operationDefinition.selectionSet.selections) {
        let fieldNode: FieldNode;
        switch (selection.kind) {
          case Kind.FIELD:
            fieldNode = selection;
            break;
          case Kind.INLINE_FRAGMENT:
            fieldNode = selection.selectionSet.selections[0] as FieldNode;
            break;
          case Kind.FRAGMENT_SPREAD: {
            const fragment = fragments[selection.name.value];
            if (!fragment) {
              throw new Error(`No fragment found with name ${selection.name.value}`);
            }
            fieldNode = fragment.selectionSet.selections[0] as FieldNode;
            break;
          }
        }
        if (!fieldNode) {
          throw new Error(`No field node found`);
        }
        const fieldDef = getFieldDef(supergraphSchema, rootType, fieldNode);
        if (!fieldDef) {
          throw new Error(`No field definition found for field ${fieldNode.name.value}`);
        }
        const directives = getDirectives(supergraphSchema, fieldDef);
        const resolverDirective = directives.find(directive => directive.name === 'resolver')
          ?.args as ResolverConfig | undefined;
        if (resolverDirective) {
          const parentSelections: SelectionNode[] = [...(fieldNode.selectionSet?.selections || [])];
          parallelNode.nodes.push(
            this._plan({
              resolverDirective,
              parentSelections,
              fieldArgs: fieldNode.arguments,
              uniqueIds,
              selectionFieldName: fieldNode.alias?.value,
            }),
          );
        }
      }

      if (parallelNode.nodes.length === 1) {
        return parallelNode.nodes[0];
      }
      return parallelNode;
    },
    _plan({
      resolverDirective,
      parentSelections,
      variableStateMap,
      selectionFieldName,
      fieldArgs,
      uniqueIds,
    }) {
      const resolverOperationDocument = parse(resolverDirective.operation, { noLocation: true });
      const subgraphName = resolverDirective.subgraph;

      const resolveNode = {
        type: 'Resolve',
        subgraph: subgraphName,
      } as ResolveNode;

      const sequenceNode: SequenceNode = {
        type: 'Sequence',
        nodes: [resolveNode],
      };

      let selectionSetAdded = false;
      const supergraphTypeInfo = new TypeInfo(supergraphSchema);
      const missingTypeFieldNodeMap = new Map<string, FieldNode[]>();
      const missingFieldNodeAncestorPathMap = new WeakMap<FieldNode, string>();
      resolveNode.document = visit(
        resolverOperationDocument,
        visitWithTypeInfo(supergraphTypeInfo, {
          [Kind.FIELD]: {
            enter(node: FieldNode, _key, parentNode, path) {
              const fieldDef = supergraphTypeInfo.getFieldDef();
              const sourceDirective =
                fieldDef &&
                (getDirectives(supergraphSchema, fieldDef).find(
                  directive =>
                    directive.name === 'source' && directive.args?.['subgraph'] === subgraphName,
                )?.args as any);
              if (selectionSetAdded && fieldDef && !sourceDirective) {
                const parentType = supergraphTypeInfo.getParentType();
                if (!parentType) {
                  throw new Error(`Expected parent type to be defined`);
                }
                let missingFieldNodes = missingTypeFieldNodeMap.get(parentType.name);
                if (!missingFieldNodes) {
                  missingFieldNodes = [];
                  missingTypeFieldNodeMap.set(parentType.name, missingFieldNodes);
                }
                if (!Array.isArray(parentNode)) {
                  throw new Error(`Expected parent node to be an array`);
                }
                missingFieldNodes.push(node);
                missingFieldNodeAncestorPathMap.set(node, path.slice(0, -2).join('.'));
                return null;
              }
              const nodeSelectionName = node.alias?.value || node.name.value;
              if (
                !selectionSetAdded &&
                (!node.selectionSet ||
                  node.selectionSet?.selections?.[0].kind === Kind.INLINE_FRAGMENT)
              ) {
                selectionSetAdded = true;
                return {
                  ...node,
                  ...(selectionFieldName != null
                    ? {
                        alias: {
                          kind: Kind.NAME,
                          value: selectionFieldName,
                        },
                      }
                    : {}),
                  selectionSet: parentSelections?.length
                    ? {
                        kind: Kind.SELECTION_SET,
                        selections: parentSelections,
                      }
                    : undefined,
                };
              } else if (sourceDirective.name) {
                return {
                  ...node,
                  name: {
                    ...node.name,
                    value: sourceDirective.name,
                  },
                  alias: {
                    kind: Kind.NAME,
                    value: nodeSelectionName,
                  },
                };
              }
            },
          },

          // Replace variables with unique state names
          [Kind.VARIABLE_DEFINITION](node) {
            let stateName = variableStateMap?.get(node.variable.name.value);
            if (!stateName) {
              const fieldArg = fieldArgs?.find(arg => arg.name.value === node.variable.name.value);
              if (fieldArg) {
                const fieldArgValue = fieldArg.value;
                if (fieldArgValue.kind === Kind.VARIABLE) {
                  stateName = fieldArgValue.name.value;
                  variableStateMap ||= new Map();
                  variableStateMap.set(node.variable.name.value, stateName);
                } else {
                  return {
                    ...node,
                    defaultValue: fieldArgValue,
                  };
                }
              }
            }
            if (stateName) {
              resolveNode.required = resolveNode.required || {};
              resolveNode.required.variables = resolveNode.required.variables || [];
              resolveNode.required.variables.push(stateName);
              return {
                ...node,
                variable: {
                  ...node.variable,
                  name: {
                    ...node.variable.name,
                    value: stateName,
                  },
                },
              };
            }
          },
          [Kind.VARIABLE](node, _key) {
            const stateName = variableStateMap?.get(node.name.value);
            if (stateName) {
              return {
                ...node,
                name: {
                  ...node.name,
                  value: stateName,
                },
              };
            }
          },
        }),
      );
      // Now resolve the missing fields

      const missingFieldsPlanNode: ParallelNode = {
        type: 'Parallel',
        nodes: [],
      };

      for (const [typeName, missingFieldNodes] of missingTypeFieldNodeMap) {
        const type = supergraphSchema.getType(typeName);
        if (!isObjectType(type)) {
          throw new Error(`Expected type ${typeName} to be an object type`);
        }
        const typeDirectives = getDirectives(supergraphSchema, type);
        const missingFieldNodesByAncestorBySubgraph = new Map<string, Map<string, FieldNode[]>>();
        const missingFieldNodesWithResolvers = new Map<
          FieldNode,
          {
            resolverDirective: ResolverConfig;
            variablesForCurrentSubgraph: ResolverVariableConfig[];
          }
        >();
        for (const missingFieldNode of missingFieldNodes) {
          const fieldDef = getFieldDef(supergraphSchema, type, missingFieldNode);
          if (!fieldDef) {
            continue;
          }

          const fieldDirectives = getDirectives(supergraphSchema, fieldDef);

          const resolverDirective = fieldDirectives.find(directive => directive.name === 'resolver')
            ?.args as ResolverConfig;

          let missingFieldSubgraphName: string;
          let sourceDirective: any;
          if (resolverDirective) {
            const variablesForCurrentSubgraph = fieldDirectives
              .filter(
                directive =>
                  directive.name === 'variable' && directive.args?.['subgraph'] === subgraphName,
              )
              .map(directive => directive.args) as ResolverVariableConfig[];
            missingFieldNodesWithResolvers.set(missingFieldNode, {
              resolverDirective,
              variablesForCurrentSubgraph,
            });
            missingFieldSubgraphName = resolverDirective.subgraph;
          } else {
            sourceDirective = fieldDirectives.find(directive => directive.name === 'source')
              ?.args as any;
            missingFieldSubgraphName = sourceDirective.subgraph;
          }

          if (!missingFieldSubgraphName) {
            throw new Error(
              `No subgraph found for field ${missingFieldNode.name.value} on type ${typeName}`,
            );
          }

          let missingFieldNodesByAncestor =
            missingFieldNodesByAncestorBySubgraph.get(missingFieldSubgraphName);
          if (!missingFieldNodesByAncestor) {
            missingFieldNodesByAncestor = new Map<string, FieldNode[]>();
            missingFieldNodesByAncestorBySubgraph.set(
              missingFieldSubgraphName,
              missingFieldNodesByAncestor,
            );
          }
          const ancestorPath = missingFieldNodeAncestorPathMap.get(missingFieldNode);
          if (!ancestorPath) {
            throw new Error(
              `No ancestor found for field ${missingFieldNode.name.value} on type ${typeName}`,
            );
          }
          let ancestorFieldNodes = missingFieldNodesByAncestor.get(ancestorPath);
          if (!ancestorFieldNodes) {
            ancestorFieldNodes = [];
            missingFieldNodesByAncestor.set(ancestorPath, ancestorFieldNodes);
          }
          if (sourceDirective?.name) {
            ancestorFieldNodes.push({
              ...missingFieldNode,
              name: {
                ...missingFieldNode.name,
                value: sourceDirective.name,
              },
              alias: {
                kind: Kind.NAME,
                value: missingFieldNode.alias?.value || missingFieldNode.name.value,
              },
            });
          } else {
            ancestorFieldNodes.push(missingFieldNode);
          }
        }

        const variableSelectionIdByAncestorPath = new Map<string, number>();

        // eslint-disable-next-line no-inner-declarations
        function processMissingFieldResolvers(
          resolverDirective: ResolverConfig,
          variablesForCurrentSubgraph: ResolverVariableConfig[],
          ancestorPath: string,
        ) {
          const resolverOperationDocument = parse(resolverDirective.operation, {
            noLocation: true,
          });
          const resolverOperation = resolverOperationDocument
            .definitions[0] as OperationDefinitionNode;
          const variablesForResolver = variablesForCurrentSubgraph.filter(
            variable =>
              resolverOperation.variableDefinitions?.find(
                variableDefinition => variableDefinition.variable.name.value === variable.name,
              ),
          );
          const variableStateMap = new Map<string, string>();
          for (const variableForResolver of variablesForResolver) {
            const selectionDoc = parse(`{ ${variableForResolver.select} }`, { noLocation: true });
            const selectionOp = selectionDoc.definitions[0] as OperationDefinitionNode;
            const selectionSet = selectionOp.selectionSet;
            const selectionNode = selectionSet.selections[0];
            let aliased = false;
            const aliasedSelectionNode = visit(selectionNode, {
              [Kind.FIELD]: {
                enter(node: FieldNode) {
                  if (!aliased && !node.selectionSet) {
                    aliased = true;
                    const uniqueVarName = `__variable__${uniqueIds.stateId++}`;
                    variableStateMap.set(variableForResolver.name, uniqueVarName);
                    return {
                      ...node,
                      alias: {
                        kind: Kind.NAME,
                        value: uniqueVarName,
                      },
                    };
                  }
                },
              },
            });

            // Add required selection to the resolve node
            resolveNode.document = visit(resolveNode.document, {
              [Kind.SELECTION_SET](node, _key, _parent, path) {
                if (path.join('.') === ancestorPath) {
                  const variableSelectionId = variableSelectionIdByAncestorPath.get(ancestorPath);
                  if (variableSelectionId == null) {
                    throw new Error(
                      `Expected variable selection id to be defined for ${ancestorPath}`,
                    );
                  }
                  return {
                    ...node,
                    selections: [
                      {
                        kind: Kind.FIELD,
                        name: {
                          kind: Kind.NAME,
                          value: '__typename',
                        },
                        alias: {
                          kind: Kind.NAME,
                          value: `__selection__${variableSelectionId}__typename`,
                        },
                      },
                      aliasedSelectionNode,
                      ...node.selections,
                    ],
                  };
                }
              },
            });
          }
          return { variableStateMap };
        }

        for (const [
          missingFieldSubgraphName,
          missingFieldNodesByAncestor,
        ] of missingFieldNodesByAncestorBySubgraph) {
          // Check if the field itself has its own resolver
          for (const [ancestorPath, missingFieldNodes] of missingFieldNodesByAncestor) {
            let variableSelectionId = variableSelectionIdByAncestorPath.get(ancestorPath);
            if (variableSelectionId == null) {
              variableSelectionId = uniqueIds.selectionId++;
              variableSelectionIdByAncestorPath.set(ancestorPath, variableSelectionId);
            }
            const missingFieldNodesForTypeResolver: FieldNode[] = [];
            for (const missingFieldNode of missingFieldNodes) {
              const fieldResolver = missingFieldNodesWithResolvers.get(missingFieldNode);
              if (fieldResolver) {
                const { resolverDirective, variablesForCurrentSubgraph } = fieldResolver;
                const { variableStateMap } = processMissingFieldResolvers(
                  resolverDirective,
                  variablesForCurrentSubgraph,
                  ancestorPath,
                );

                const missingFieldPlanNode = this._plan({
                  resolverDirective,
                  parentSelections: missingFieldNode.selectionSet?.selections || ([] as any),
                  variableStateMap,
                  selectionFieldName: `__field__${
                    missingFieldNode.alias?.value || missingFieldNode.name.value
                  }__selection__${variableSelectionId}`,
                  uniqueIds,
                });
                missingFieldsPlanNode.nodes.push(missingFieldPlanNode);
              } else {
                missingFieldNodesForTypeResolver.push(missingFieldNode);
              }
            }
            if (missingFieldNodesForTypeResolver.length) {
              const variablesForCurrentSubgraph = typeDirectives
                .filter(
                  directive =>
                    directive.name === 'variable' && directive.args?.['subgraph'] === subgraphName,
                )
                .map(directive => directive.args) as ResolverVariableConfig[];

              const resolverDirectives = typeDirectives
                .filter(
                  directive =>
                    directive.name === 'resolver' &&
                    directive.args?.['subgraph'] === missingFieldSubgraphName,
                )
                .map(d => d.args) as ResolverConfig[];
              // choose the first one for now
              const resolverDirective = resolverDirectives[0];

              const { variableStateMap } = processMissingFieldResolvers(
                resolverDirective,
                variablesForCurrentSubgraph,
                ancestorPath,
              );

              const missingFieldPlanNode = this._plan({
                resolverDirective,
                parentSelections: missingFieldNodesForTypeResolver,
                variableStateMap,
                uniqueIds,
                selectionFieldName: `__selection__${variableSelectionId}`,
              });
              missingFieldsPlanNode.nodes.push(missingFieldPlanNode);
            }
          }
        }
      }

      if (missingFieldsPlanNode.nodes.length === 1) {
        const missingFieldsPlanNodeOne = missingFieldsPlanNode.nodes[0];
        if (missingFieldsPlanNodeOne.type === 'Sequence') {
          sequenceNode.nodes.push(...missingFieldsPlanNodeOne.nodes);
        } else {
          sequenceNode.nodes.push(missingFieldsPlanNodeOne);
        }
      } else if (missingFieldsPlanNode.nodes.length > 1) {
        sequenceNode.nodes.push(missingFieldsPlanNode);
      }

      let providedVariables: Map<string, string[]> | undefined;
      visitResolutionPath(resolveNode.document, ({ path }) => {
        const alias = path[path.length - 1];
        if (alias.startsWith('__selection__') && alias.endsWith('__typename')) {
          const stateName = alias.slice(0, -'__typename'.length);
          resolveNode.required = resolveNode.required || {};
          resolveNode.required.selections = resolveNode.required.selections || new Map();
          resolveNode.required.selections.set(stateName, path.slice(0, -1));
        } else if (alias.startsWith('__variable')) {
          providedVariables = providedVariables || new Map();
          providedVariables.set(alias, path);
        } else if (alias.startsWith('__selection__')) {
          resolveNode.provided = resolveNode.provided || {};
          resolveNode.provided.selections = resolveNode.provided.selections || new Map();
          resolveNode.provided.selections.set(alias, path);
        } else if (alias.startsWith('__field__')) {
          const regexp = /^__field__(?<fieldName>[^_]+)__selection__(?<selectionId>[^_]+)$/;
          const match = regexp.exec(alias);
          if (!match) {
            throw new Error(`Expected alias ${alias} to match pattern`);
          }
          const { fieldName, selectionId } = match.groups!;
          resolveNode.provided = resolveNode.provided || {};
          resolveNode.provided.selectionFields = resolveNode.provided.selectionFields || new Map();
          let selectionFieldMap = resolveNode.provided.selectionFields.get(
            `__selection__${selectionId}`,
          );
          if (!selectionFieldMap) {
            selectionFieldMap = new Map();
            resolveNode.provided.selectionFields.set(
              `__selection__${selectionId}`,
              selectionFieldMap,
            );
          }
          selectionFieldMap.set(fieldName, path);
        }
      });

      if (providedVariables && resolveNode.required?.selections) {
        for (const [variableName, varPathInResult] of providedVariables) {
          const varPathInResultStr = varPathInResult.join('.');
          for (const [selectionName, selectionPathInResult] of resolveNode.required.selections) {
            const selectionPathInResultStr = selectionPathInResult.join('.');
            if (varPathInResultStr.startsWith(selectionPathInResultStr)) {
              const varPathInSelectionStr = varPathInResultStr.slice(
                selectionPathInResultStr.length + 1,
              );
              const varPathInSelection = varPathInSelectionStr.split('.');
              resolveNode.provided ||= {};
              resolveNode.provided.variablesInSelections ||= new Map();
              let selectionVarMap = resolveNode.provided.variablesInSelections.get(selectionName);
              if (!selectionVarMap) {
                selectionVarMap = new Map();
                resolveNode.provided.variablesInSelections.set(selectionName, selectionVarMap);
              }
              selectionVarMap.set(variableName, varPathInSelection);
            }
          }
        }
      }

      if (resolverDirective.kind === 'BATCH') {
        resolveNode.batch = true;
      }

      if (sequenceNode.nodes.length === 1) {
        return sequenceNode.nodes[0];
      }

      return sequenceNode;
    },
  };
}
