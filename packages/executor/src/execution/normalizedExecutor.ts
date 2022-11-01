import { MaybeAsyncIterable, ExecutionResult, isAsyncIterable, MaybePromise } from '@graphql-tools/utils';
import { getOperationAST } from 'graphql';
import { execute, ExecutionArgs, subscribe } from './execute.js';
import { Repeater } from '@repeaterjs/repeater';
import { ValueOrPromise } from 'value-or-promise';

export function normalizedExecutor<TData = any, TVariables = any, TContext = any>(
  args: ExecutionArgs<TData, TVariables, TContext>
): MaybePromise<MaybeAsyncIterable<ExecutionResult<TData>>> {
  const operationAST = getOperationAST(args.document, args.operationName);
  if (operationAST == null) {
    throw new Error('Must provide an operation.');
  }
  if (operationAST.operation === 'subscription') {
    return new ValueOrPromise(() => subscribe(args))
      .then((result): MaybeAsyncIterable<ExecutionResult<TData>> => {
        if (isAsyncIterable(result)) {
          return new Repeater(async (push, stop) => {
            let stopped = false;
            stop.then(() => {
              stopped = true;
            });
            let err: any;
            try {
              for await (const value of result) {
                if (stopped) {
                  break;
                }
                await push(value);
              }
            } catch (e) {
              err = e;
            }
            stop(err);
          });
        }
        return result;
      })
      .resolve()!;
  }
  return new ValueOrPromise(() => execute(args))
    .then((result): MaybeAsyncIterable<ExecutionResult<TData>> => {
      if ('initialResult' in result) {
        return new Repeater(async (push, stop) => {
          let stopped = false;
          stop.then(() => {
            stopped = true;
          });
          let err: any;
          try {
            await push(result.initialResult);
            for await (const value of result.subsequentResults) {
              if (stopped) {
                break;
              }
              await push(value);
            }
          } catch (e) {
            err = e;
          }
          stop(err);
        });
      }
      return result;
    })
    .resolve()!;
}
