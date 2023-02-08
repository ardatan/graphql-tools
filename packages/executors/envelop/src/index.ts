import { Plugin, ExecutionArgs } from '@envelop/core';
import { Executor } from '@graphql-tools/utils';

export function useExecutor(executor: Executor): Plugin {
  function executorToExecuteFn(executionArgs: ExecutionArgs) {
    return executor({
      document: executionArgs.document,
      rootValue: executionArgs.rootValue,
      context: executionArgs.contextValue,
      variables: executionArgs.variableValues,
      operationName: executionArgs.operationName,
    });
  }
  return {
    onExecute({ setExecuteFn }) {
      setExecuteFn(executorToExecuteFn);
    },
    onSubscribe({ setSubscribeFn }) {
      setSubscribeFn(executorToExecuteFn);
    },
  };
}
