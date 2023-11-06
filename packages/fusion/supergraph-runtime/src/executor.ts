import { ExecutionRequest, ExecutionResult, Executor, MaybePromise, isAsyncIterable, isPromise } from "@graphql-tools/utils";
import { PlanNode } from "./types";
import { GraphQLError, GraphQLSchema } from "graphql";
import _ from "lodash";

export type QueryPlanExecutorRequest = {
  queryPlan: PlanNode;
} & Omit<ExecutionRequest, 'document'>;

export interface CreateQueryPlanExecutorOpts {
  subgraphExecutors: Map<string, Executor>;
}
export type QueryPlanExecutor = (request: QueryPlanExecutorRequest) => MaybePromise<ExecutionResult>;

export function createQueryPlanExecutor({
  subgraphExecutors,
}: CreateQueryPlanExecutorOpts): QueryPlanExecutor {
  return function executeQueryPlan({ queryPlan, variables, context }) {
    const variablesState = new Map<string, any>(Object.entries(variables ?? {}));
    const selectionsState = new Map<string, any>();
    const errors: GraphQLError[] = [];
    let finalResult: any = null;
    function _executeNode(node: PlanNode) {
      switch (node.type) {
        case 'Resolve': {
          let executorVariables: Record<string, any> | undefined;
          if (node.required?.variables) {
            for (const variableName of node.required.variables) {
              const variableValue = variablesState.get(variableName);
              if (!variableValue) {
                throw new Error(`Missing variable ${variableName}`);
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
            if (node.provided?.variables) {
              for (const [variable, variablePathInResult] of node.provided.variables) {
                const variableToBeSet = _.get(result.data, variablePathInResult);
                variablesState.set(variable, variableToBeSet);
              }
            }
            if (node.required?.selections) {
              for (const [selectionName, selectionPathInResult] of node.required.selections) {
                const selectionToBeSet = _.get(result.data, selectionPathInResult);
                selectionsState.set(selectionName, selectionToBeSet);
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
                Object.assign(selection, selectionToBeSet);
              }
            }
            if (node.provided?.selectionFields) {
              for (const [selectionName, selectionFieldMap] of node.provided.selectionFields) {
                for (const [pathInSelection, pathInResult] of selectionFieldMap) {
                  const selection = selectionsState.get(selectionName);
                  if (!selection) {
                    throw new Error(`Missing selection ${selectionName}`);
                  }
                  const fieldToBeSet = _.get(result.data, pathInResult);
                  _.set(selection, pathInSelection, fieldToBeSet);
                }
              }
            }
            if (!finalResult) {
              finalResult = result.data;
            }
          }
          if (isAsyncIterable(result$)) {
            return Promise.resolve().then(async () => {
              for await (const result of result$) {
                handleResult(result);
              }
            })
          }
          if (isPromise(result$)) {
            return result$.then(maybeAsyncIterableResult => {
              if (isAsyncIterable(maybeAsyncIterableResult)) {
                return Promise.resolve().then(async () => {
                  for await (const result of maybeAsyncIterableResult) {
                    handleResult(result);
                  }
                })
              }
              handleResult(maybeAsyncIterableResult);
            })
          }
          handleResult(result$);
          break;
        }
        case 'Parallel': {
          const promises: PromiseLike<any>[] = [];
          for (const nodeElem of node.nodes) {
            const res$ = _executeNode(nodeElem);
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
    }
  }
}
