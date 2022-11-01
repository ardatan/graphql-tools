import { MaybeAsyncIterable, ExecutionResult, isAsyncIterable } from '@graphql-tools/utils';
import { getOperationAST } from 'graphql';
import { execute, ExecutionArgs, subscribe } from './execute.js';
import { Repeater } from '@repeaterjs/repeater';

export async function normalizedExecutor<TData = any, TVariables = any, TContext = any>(
  args: ExecutionArgs<TData, TVariables, TContext>
): Promise<MaybeAsyncIterable<ExecutionResult<TData>>> {
  const operationAST = getOperationAST(args.document, args.operationName);
  if (operationAST == null) {
    throw new Error('Must provide an operation.');
  }
  if (operationAST.operation === 'subscription') {
    const result = await subscribe(args);
    if (isAsyncIterable(result)) {
      return new Repeater(async (push, stop) => {
        let stopped = false;
        stop.then(() => {
          stopped = true;
        });
        for await (const value of result) {
          if (stopped) {
            break;
          }
          if ('incremental' in value && value.incremental) {
            const incrementalLength = value.incremental.length;
            value.incremental.forEach((item, index) => {
              const hasNext = index === incrementalLength - 1;
              push({
                ...item,
                hasNext,
              });
            });
          } else {
            push(value);
          }
        }
      });
    }
    return result;
  }
  const result = await execute(args);
  if ('initialResult' in result) {
    return new Repeater(async (push, stop) => {
      let stopped = false;
      stop.then(() => {
        stopped = true;
      });
      push(result.initialResult);
      for await (const value of result.subsequentResults) {
        if (stopped) {
          break;
        }
        if (value.incremental) {
          const incrementalLength = value.incremental.length;
          value.incremental.forEach((item, index) => {
            const hasNext = index === incrementalLength - 1;
            push({
              ...item,
              hasNext,
            });
          });
        }
        push({
          hasNext: false,
        });
      }
    });
  }
  return result;
}
