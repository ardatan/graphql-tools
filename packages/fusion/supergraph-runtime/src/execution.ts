/* eslint-disable no-inner-declarations */
import { Kind, visit } from 'graphql';
import _ from 'lodash';
import { createGraphQLError, Executor, isAsyncIterable, isPromise } from '@graphql-tools/utils';
import { ResolverOperationNode } from './query-planning.js';
import { visitResolutionPath } from './visitResolutionPath.js';

export interface ExecutableResolverOperationNode extends ResolverOperationNode {
  providedVariablePathMap: Map<string, string[]>;
  requiredVariableNames: Set<string>;
  exportPath: string[];
  resolverDependencyFieldMap: Map<string, ExecutableResolverOperationNode[]>;
  batchedResolverDependencyFieldMap: Map<string, ExecutableResolverOperationNode[]>;
  resolverDependencies: ExecutableResolverOperationNode[];
  batchedResolverDependencies: ExecutableResolverOperationNode[];
}

function deserializeGraphQLError(error: any) {
  if (error.name === 'GraphQLError') {
    return error;
  }
  return createGraphQLError(error.message, error);
}

export function createExecutableResolverOperationNode(
  resolverOperationNode: ResolverOperationNode,
): ExecutableResolverOperationNode {
  const providedVariablePathMap = new Map<string, string[]>();
  const exportPath: string[] = [];

  visitResolutionPath(resolverOperationNode.resolverOperationDocument, ({ path }) => {
    const lastElem = path[path.length - 1];
    if (lastElem === '__export') {
      exportPath.splice(0, exportPath.length, ...path);
    } else if (lastElem.startsWith('__variable')) {
      providedVariablePathMap.set(lastElem, path);
    }
  });

  // Remove __export from variable paths
  for (const [, providedVariablePath] of providedVariablePathMap) {
    const index = providedVariablePath.indexOf('__export');
    if (index !== -1) {
      providedVariablePath.splice(index, 1);
    }
  }

  const newDependencyMap: Map<string, ExecutableResolverOperationNode[]> = new Map();
  const newBatchedDependencyMap: Map<string, ExecutableResolverOperationNode[]> = new Map();

  for (const [key, nodes] of resolverOperationNode.resolverDependencyFieldMap) {
    const batchedNodes: ExecutableResolverOperationNode[] = [];
    const nonBatchedNodes: ExecutableResolverOperationNode[] = [];
    for (const node of nodes) {
      const executableNode = createExecutableResolverOperationNode(node);
      if (node.batch) {
        batchedNodes.push(executableNode);
      } else {
        nonBatchedNodes.push(executableNode);
      }
    }
    newBatchedDependencyMap.set(key, batchedNodes);
    newDependencyMap.set(key, nonBatchedNodes);
  }

  const requiredVariableNames = new Set<string>();

  visit(resolverOperationNode.resolverOperationDocument, {
    [Kind.VARIABLE_DEFINITION]: node => {
      requiredVariableNames.add(node.variable.name.value);
    },
  });

  const batchedResolverDependencies = [];
  const resolverDependencies = [];

  for (const node of resolverOperationNode.resolverDependencies) {
    const executableNode = createExecutableResolverOperationNode(node);
    if (node.batch) {
      batchedResolverDependencies.push(executableNode);
    } else {
      resolverDependencies.push(executableNode);
    }
  }

  return {
    ...resolverOperationNode,
    resolverDependencies,
    batchedResolverDependencies,
    resolverDependencyFieldMap: newDependencyMap,
    batchedResolverDependencyFieldMap: newBatchedDependencyMap,
    providedVariablePathMap,
    requiredVariableNames,
    exportPath,
  };
}

export function createExecutableResolverOperationNodesWithDependencyMap(
  resolverOperationNodes: ResolverOperationNode[],
  resolverDependencyMap: Map<string, ResolverOperationNode[]>,
) {
  const newResolverOperationNodes = resolverOperationNodes.map(
    createExecutableResolverOperationNode,
  );
  const newResolverDependencyMap = new Map<string, ExecutableResolverOperationNode[]>();
  for (const [key, nodes] of resolverDependencyMap) {
    newResolverDependencyMap.set(key, nodes.map(createExecutableResolverOperationNode));
  }
  return {
    newResolverOperationNodes,
    newResolverDependencyMap,
  };
}

export function createResolverOperationNodeFromExecutable(
  executableNode: ExecutableResolverOperationNode,
) {
  const resolverOpNode: ResolverOperationNode = {
    subgraph: executableNode.subgraph,
    resolverOperationDocument: executableNode.resolverOperationDocument,
    resolverDependencies: [],
    resolverDependencyFieldMap: executableNode.resolverDependencyFieldMap,
  };

  resolverOpNode.resolverDependencies = executableNode.resolverDependencies.map(
    createResolverOperationNodeFromExecutable,
  );

  resolverOpNode.resolverDependencyFieldMap = new Map(
    [...executableNode.resolverDependencyFieldMap.entries()].map(([key, value]) => [
      key,
      value.map(createResolverOperationNodeFromExecutable),
    ]),
  );

  if (executableNode.batchedResolverDependencies.length) {
    resolverOpNode.batch = true;
    for (const batchedResolverDependency of executableNode.batchedResolverDependencies) {
      resolverOpNode.resolverDependencies.push(
        createResolverOperationNodeFromExecutable(batchedResolverDependency),
      );
    }
  }

  if (executableNode.batchedResolverDependencyFieldMap.size) {
    resolverOpNode.batch = true;
    for (const [key, value] of executableNode.batchedResolverDependencyFieldMap) {
      resolverOpNode.resolverDependencyFieldMap.set(
        key,
        value.map(createResolverOperationNodeFromExecutable),
      );
    }
  }

  return resolverOpNode;
}

export function executeResolverOperationNodesWithDependenciesInParallel(
  resolverOperationNodes: ExecutableResolverOperationNode[],
  fieldDependencyMap: Map<string, ExecutableResolverOperationNode[]>,
  inputVariableMap: Map<string, any>,
  executorMap: Map<string, Executor>,
  obj: any = {},
) {
  const dependencyPromises: PromiseLike<any>[] = [];

  const outputVariableMap = new Map();

  for (const depOp of resolverOperationNodes) {
    const depOpResult$ = executeResolverOperationNode(depOp, inputVariableMap, executorMap);
    function handleDepOpResult(depOpResult: {
      exported: any;
      outputVariableMap: Map<string, any>;
    }) {
      Object.assign(obj, depOpResult.exported);
      for (const [key, value] of depOpResult.outputVariableMap) {
        outputVariableMap.set(key, value);
      }
    }
    if (isPromise(depOpResult$)) {
      dependencyPromises.push(depOpResult$.then(handleDepOpResult));
    } else {
      handleDepOpResult(depOpResult$);
    }
  }

  for (const [fieldName, fieldOperationNodes] of fieldDependencyMap) {
    const fieldOpPromises: PromiseLike<any>[] = [];
    const fieldOpResults: any[] = [];
    let listed = false;
    for (const fieldOperationNode of fieldOperationNodes) {
      const fieldOpResult$ = executeResolverOperationNode(
        fieldOperationNode,
        inputVariableMap,
        executorMap,
      );
      function handleFieldOpResult(fieldOpResult: { exported: any; listed?: boolean }) {
        if (fieldOpResult.listed) {
          listed = true;
        }
        fieldOpResults.push(fieldOpResult.exported);
      }
      if (isPromise(fieldOpResult$)) {
        fieldOpPromises.push(fieldOpResult$.then(handleFieldOpResult));
      } else {
        handleFieldOpResult(fieldOpResult$);
      }
    }
    function handleFieldOpResults() {
      if (listed) {
        const existingVals = arrayGet(obj, fieldName.split('.'));
        for (const resultItemIndex in existingVals) {
          const fieldOpItemResults = fieldOpResults.map(resultItem => resultItem[resultItemIndex]);
          const existingVal = existingVals[resultItemIndex];
          if (Array.isArray(existingVals[resultItemIndex])) {
            for (const existingValItemIndex in existingVal) {
              Object.assign(
                existingVal[existingValItemIndex],
                ...fieldOpItemResults.map(
                  fieldOpItemResult => fieldOpItemResult[existingValItemIndex],
                ),
              );
            }
          } else {
            Object.assign(existingVal, ...fieldOpItemResults);
          }
        }
      } else {
        const existingVal = _.get(obj, fieldName);
        if (existingVal != null) {
          Object.assign(existingVal, ...fieldOpResults);
        } else {
          _.set(
            obj,
            fieldName,
            fieldOpResults.length > 1
              ? (Object.assign as any)(...fieldOpResults)
              : fieldOpResults[0],
          );
        }
      }
    }
    if (fieldOpPromises.length) {
      dependencyPromises.push(Promise.all(fieldOpPromises).then(handleFieldOpResults));
    } else {
      handleFieldOpResults();
    }
  }
  function handleDependencyPromises() {
    return {
      exported: obj,
      outputVariableMap,
    };
  }

  if (dependencyPromises.length) {
    return Promise.all(dependencyPromises).then(handleDependencyPromises);
  }
  return handleDependencyPromises();
}

export function executeResolverOperationNode(
  resolverOperationNode: ExecutableResolverOperationNode,
  inputVariableMap: Map<string, any>,
  executorMap: Map<string, Executor>,
) {
  const executor = executorMap.get(resolverOperationNode.subgraph);
  if (!executor) {
    throw new Error(`Executor not found for subgraph ${resolverOperationNode.subgraph}`);
  }

  const variablesForOperation: Record<string, any> = {};

  for (const requiredVarName of resolverOperationNode.requiredVariableNames) {
    const varValue = inputVariableMap.get(requiredVarName);
    if (Array.isArray(varValue) && !resolverOperationNode.batch) {
      const promises: PromiseLike<any>[] = [];
      const results: any[] = [];
      const outputVariableMaps: Map<string, any>[] = [];
      for (const varIndex in varValue) {
        const itemInputVariableMap = new Map();
        for (const [key, value] of inputVariableMap) {
          itemInputVariableMap.set(key, Array.isArray(value) ? value[varIndex] : value);
        }
        const itemResult$ = executeResolverOperationNode(
          resolverOperationNode,
          itemInputVariableMap,
          executorMap,
        );
        if (isPromise(itemResult$)) {
          promises.push(
            itemResult$.then(resolvedVarValueItem => {
              results[varIndex] = resolvedVarValueItem.exported;
              outputVariableMaps[varIndex] = resolvedVarValueItem.outputVariableMap;
            }),
          );
        } else {
          results[varIndex] = itemResult$.exported;
          outputVariableMaps[varIndex] = itemResult$.outputVariableMap;
        }
      }
      function handleResults() {
        const outputVariableMap = new Map();
        for (const outputVariableMapItem of outputVariableMaps) {
          for (const [key, value] of outputVariableMapItem) {
            let existing = outputVariableMap.get(key);
            if (!existing) {
              existing = [];
              outputVariableMap.set(key, existing);
            }
            existing.push(value);
          }
        }
        return {
          exported: results,
          listed: true,
          outputVariableMap,
        };
      }
      if (promises.length) {
        return Promise.all(promises).then(handleResults);
      }
      return handleResults();
    }
    variablesForOperation[requiredVarName] = varValue;
  }

  const result$ = executor({
    document: resolverOperationNode.resolverOperationDocument,
    variables: variablesForOperation,
  });

  if (isAsyncIterable(result$)) {
    throw new Error(`Async iterable not supported`);
  }

  function handleResult(result: any) {
    if (result.errors) {
      if (result.errors.length === 1) {
        throw deserializeGraphQLError(result.errors[0]);
      }
      throw new AggregateError(result.errors.map(deserializeGraphQLError));
    }
    const outputVariableMap = new Map();
    const exported = _.get(result.data, resolverOperationNode.exportPath);
    function handleExportedListForBatching(exportedList: any) {
      for (const [
        providedVariableName,
        providedVariablePath,
      ] of resolverOperationNode.providedVariablePathMap) {
        const value = arrayGet(exportedList, providedVariablePath);
        outputVariableMap.set(providedVariableName, value);
      }
      return executeResolverOperationNodesWithDependenciesInParallel(
        resolverOperationNode.batchedResolverDependencies,
        resolverOperationNode.batchedResolverDependencyFieldMap,
        outputVariableMap,
        executorMap,
        exportedList,
      );
    }
    function handleExportedItem(exportedItem: any) {
      for (const [
        providedVariableName,
        providedVariablePath,
      ] of resolverOperationNode.providedVariablePathMap) {
        const value = arrayGet(exportedItem, providedVariablePath);
        outputVariableMap.set(providedVariableName, value);
      }
      return executeResolverOperationNodesWithDependenciesInParallel(
        resolverOperationNode.resolverDependencies,
        resolverOperationNode.resolverDependencyFieldMap,
        outputVariableMap,
        executorMap,
        exportedItem,
      );
    }
    let depsResult$: PromiseLike<any> | any;
    if (Array.isArray(exported)) {
      handleExportedListForBatching(exported);
      const depsResultPromises: PromiseLike<any>[] = [];
      for (const exportedItem of exported) {
        const depsResultItem = handleExportedItem(exportedItem);
        if (isPromise(depsResultItem)) {
          depsResultPromises.push(depsResultItem);
        }
      }
      if (depsResultPromises.length) {
        depsResult$ = Promise.all(depsResultPromises);
      }
    } else {
      depsResult$ = handleExportedItem(exported);
    }
    if (isPromise(depsResult$)) {
      return depsResult$.then(() => ({
        exported,
        outputVariableMap,
      }));
    }
    return {
      exported,
      outputVariableMap,
    };
  }

  if (isPromise(result$)) {
    return result$.then(handleResult);
  }

  return handleResult(result$);
}

// TODO: Maybe can be implemented in a better way
function arrayGet(obj: any, path: string[]): any {
  if (Array.isArray(obj)) {
    return obj.map(item => arrayGet(item, path));
  }
  if (path.length === 1) {
    return _.get(obj, path);
  }
  return arrayGet(_.get(obj, path[0]), path.slice(1));
}

// export function executeResolverOperationNodesWithDependenciesSequentially(
//   resolverOperationNodes: ExecutableResolverOperationNode[],
//   fieldDependencyMap: Map<string, ExecutableResolverOperationNode[]>,
//   inputVariableMap: Map<string, any>,
//   executorMap: Map<string, Executor>
// ) {
//   const dependencyPromises: PromiseLike<any>[] = [];

//   const outputVariableMap = new Map();

//   const obj = {};

//   for (const depOp of resolverOperationNodes) {
//     const depOpResult$ = executeResolverOperationNode(
//       depOp,
//       inputVariableMap,
//       executorMap,
//     );
//     function handleDepOpResult(depOpResult: { exported: any; outputVariableMap: Map<string, any> }) {
//       Object.assign(obj, depOpResult.exported);
//       for (const [key, value] of depOpResult.outputVariableMap) {
//         outputVariableMap.set(key, value);
//       }
//     }
//     if (isPromise(depOpResult$)) {
//       dependencyPromises.push(depOpResult$.then(handleDepOpResult));
//     } else {
//       handleDepOpResult(depOpResult$);
//     }
//   }

//   function handleDependencyPromises() {
//     const fieldDependencyPromises: PromiseLike<any>[] = [];
//     for (const [fieldName, fieldOperationNodes] of fieldDependencyMap) {
//       const fieldOpPromises: PromiseLike<any>[] = [];
//       const fieldOpResults: any[] = [];
//       for (const fieldOperationNode of fieldOperationNodes) {
//         const fieldOpResult$ = executeResolverOperationNode(
//           fieldOperationNode,
//           outputVariableMap,
//           executorMap,
//         );
//         function handleFieldOpResult(fieldOpResult: { exported: any }) {
//           fieldOpResults.push(fieldOpResult.exported);
//         }
//         if (isPromise(fieldOpResult$)) {
//           fieldOpPromises.push(fieldOpResult$.then(handleFieldOpResult));
//         } else {
//           handleFieldOpResult(fieldOpResult$);
//         }
//       }
//       function handleFieldOpResults() {
//         _.set(obj, fieldName, fieldOpResults.length > 1 ? Object.assign({}, ...fieldOpResults) : fieldOpResults[0]);
//       }
//       if (fieldOpPromises.length) {
//         fieldDependencyPromises.push(Promise.all(fieldOpPromises).then(handleFieldOpResults));
//       } else {
//         handleFieldOpResults();
//       }
//     }

//     function handleFieldDependencyPromises() {
//       return {
//         exported: obj,
//         outputVariableMap,
//       };
//     }

//     if (fieldDependencyPromises.length) {
//       return Promise.all(fieldDependencyPromises).then(handleFieldDependencyPromises);
//     }

//     return handleFieldDependencyPromises();
//   }

//   if (dependencyPromises.length) {
//     return Promise.all(dependencyPromises).then(handleDependencyPromises);
//   }

//   return handleDependencyPromises();
// }
