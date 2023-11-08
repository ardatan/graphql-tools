import type { GraphQLError } from 'graphql';
import _ from 'lodash';
import {
  inspect,
  isAsyncIterable,
  isPromise,
  type ExecutionRequest,
  type ExecutionResult,
  type Executor,
  type MaybePromise,
} from '@graphql-tools/utils';
import type { PlanNode } from './types.js';

export type QueryPlanExecutorRequest = {
  queryPlan: PlanNode;
} & Omit<ExecutionRequest, 'document'>;

export interface CreateQueryPlanExecutorOpts {
  subgraphExecutors: Map<string, Executor>;
}
export type QueryPlanExecutor = (
  request: QueryPlanExecutorRequest,
) => MaybePromise<ExecutionResult>;

function arrayGet(obj: any, path: string[], index?: number): any {
  const currentPath = path[0];
  if (path.length === 1) {
    if (Array.isArray(obj)) {
      if (index != null) {
        return obj[index][currentPath];
      }
      return obj.map(item => item[currentPath]);
    }
    return obj[currentPath];
  }
  if (Array.isArray(obj)) {
    if (index != null) {
      return arrayGet(obj[index][currentPath], path.slice(1));
    }
    return obj.map(item => arrayGet(item[currentPath], path.slice(1)));
  }
  return arrayGet(obj[currentPath], path.slice(1), index);
}

export function createQueryPlanExecutor({
  subgraphExecutors,
}: CreateQueryPlanExecutorOpts): QueryPlanExecutor {
  return function executeQueryPlan({ queryPlan, variables, context }) {
    const variablesState = new Map<string, any>(Object.entries(variables ?? {}));
    const multiVariablesState = new Map<string, any[]>();
    const selectionsState = new Map<string, any>();
    const errors: GraphQLError[] = [];
    let finalResult: any = null;
    function _executeNode(node: PlanNode, index?: number): any {
      switch (node.type) {
        case 'Resolve': {
          let executorVariables: Record<string, any> | undefined;
          if (node.required?.variables) {
            for (const variableName of node.required.variables) {
              let variableValue = variablesState.get(variableName);
              if (variableValue == null) {
                const multiVariableValue = multiVariablesState.get(variableName);
                if (multiVariableValue != null) {
                  if (node.batch) {
                    variableValue = multiVariableValue;
                  } else {
                    if (index == null) {
                      return Promise.all(multiVariableValue.map((_, i) => _executeNode(node, i)));
                    }
                    variableValue = multiVariableValue[index];
                  }
                }
              }
              executorVariables ||= {};
              executorVariables[variableName] = variableValue;
            }
          }
          const subgraphExecutor = subgraphExecutors.get(node.subgraph);
          if (!subgraphExecutor) {
            throw new Error(`No executor found for subgraph ${node.subgraph}`);
          }
          const result$ = subgraphExecutor({
            document: node.document,
            context,
            variables: executorVariables,
          });
          const handleResult = (result: ExecutionResult) => {
            if (result.errors) {
              errors.push(...result.errors);
            }
            if (node.required?.selections) {
              for (const [selectionName, selectionPathInResult] of node.required.selections) {
                const selectionToBeSet = arrayGet(result.data, selectionPathInResult, index);
                if (selectionToBeSet == null) {
                  throw new Error(
                    `Missing selection ${selectionPathInResult} in ${inspect(result.data)}`,
                  );
                }
                selectionsState.set(selectionName, selectionToBeSet);
                if (node.provided?.variablesInSelections) {
                  const isArraySelection = Array.isArray(selectionToBeSet);
                  const variablesInSelection =
                    node.provided.variablesInSelections.get(selectionName);
                  if (variablesInSelection) {
                    for (const [variableName, variablePathInSelection] of variablesInSelection) {
                      if (isArraySelection) {
                        let multiVariable = multiVariablesState.get(variableName);
                        if (!multiVariable) {
                          multiVariable = [];
                          multiVariablesState.set(variableName, multiVariable);
                        }
                        for (const selectionItem of selectionToBeSet) {
                          const variableToBeSet = _.get(selectionItem, variablePathInSelection);
                          multiVariable.push(variableToBeSet);
                        }
                      } else {
                        const variableToBeSet = _.get(selectionToBeSet, variablePathInSelection);
                        variablesState.set(variableName, variableToBeSet);
                      }
                    }
                  }
                }
              }
            }
            if (node.provided?.selections) {
              for (const [selectionName, selectionPathInResult] of node.provided.selections) {
                const selection = selectionsState.get(selectionName);
                if (!selection) {
                  throw new Error(`Missing selection ${selectionName}`);
                }
                const selectionToBeSet = _.get(result.data, selectionPathInResult);
                if (!selectionToBeSet) {
                  throw new Error(`Missing selection exported ${selectionPathInResult}`);
                }
                if (node.batch) {
                  const isArraySelection = Array.isArray(selection);
                  for (const i in selectionToBeSet) {
                    Object.assign(isArraySelection ? selection[i] : selection, selectionToBeSet[i]);
                  }
                } else if (index != null) {
                  Object.assign(selection[index], selectionToBeSet);
                } else {
                  Object.assign(selection, selectionToBeSet);
                }
              }
            }
            if (node.provided?.selectionFields) {
              for (const [selectionName, selectionFieldMap] of node.provided.selectionFields) {
                const selection = selectionsState.get(selectionName);
                if (!selection) {
                  throw new Error(`Missing selection ${selectionName}`);
                }
                for (const [pathInSelection, pathInResult] of selectionFieldMap) {
                  const fieldToBeSet = _.get(result.data, pathInResult);
                  if (node.batch) {
                    for (const i in fieldToBeSet) {
                      _.set(selection[i], pathInSelection, fieldToBeSet[i]);
                    }
                  } else if (index != null) {
                    _.set(selection[index], pathInSelection, fieldToBeSet);
                  } else {
                    _.set(selection, pathInSelection, fieldToBeSet);
                  }
                }
              }
            }
            if (!finalResult) {
              finalResult = result.data;
            }
          };
          if (isAsyncIterable(result$)) {
            return Promise.resolve().then(async () => {
              for await (const result of result$) {
                handleResult(result);
              }
            });
          }
          if (isPromise(result$)) {
            return result$.then(maybeAsyncIterableResult => {
              if (isAsyncIterable(maybeAsyncIterableResult)) {
                return Promise.resolve().then(async () => {
                  for await (const result of maybeAsyncIterableResult) {
                    handleResult(result);
                  }
                });
              }
              handleResult(maybeAsyncIterableResult);
            });
          }
          handleResult(result$);
          break;
        }
        case 'Parallel': {
          const promises: PromiseLike<any>[] = [];
          for (const nodeElem of node.nodes) {
            const res$ = _executeNode(nodeElem, index);
            if (isPromise(res$)) {
              promises.push(res$);
            }
          }
          if (promises.length) {
            return Promise.all(promises);
          }
          break;
        }
        case 'Sequence': {
          const nodeIterator = node.nodes[Symbol.iterator]();
          // eslint-disable-next-line no-inner-declarations
          function executeNextNode(): any {
            const nextNode = nodeIterator.next();
            if (nextNode.done) {
              return;
            }
            const res$ = _executeNode(nextNode.value);
            if (isPromise(res$)) {
              return res$.then(executeNextNode);
            }
            return executeNextNode();
          }
          return executeNextNode();
        }
      }
    }
    _executeNode(queryPlan);
    return {
      errors,
      data: finalResult,
    };
  };
}
