import { BatchDelegateOptions } from './types';

import { AsyncExecutionResult, ExecutionResult, getNullableType, GraphQLList } from 'graphql';

import {
  DelegationContext,
  createRequestFromInfo,
  externalValueFromResult,
  getDelegationContext,
  getDelegatingOperation,
  Receiver,
} from '@graphql-tools/delegate';

import { isAsyncIterable, relocatedError } from '@graphql-tools/utils';

import { getLoader } from './getLoader';

export async function batchDelegateToSchema(options: BatchDelegateOptions): Promise<any> {
  const key = options.key;
  if (key == null) {
    return null;
  } else if (Array.isArray(key) && !key.length) {
    return [];
  }

  const {
    info,
    operationName,
    operation = getDelegatingOperation(info.parentType, info.schema),
    fieldName = info.fieldName,
    returnType = info.returnType,
    selectionSet,
    fieldNodes,
  } = options;

  if (operation !== 'query' && operation !== 'mutation') {
    throw new Error(`Batch delegation not possible for operation '${operation}'.`);
  }

  const request = createRequestFromInfo({
    info,
    operation,
    fieldName,
    selectionSet,
    fieldNodes,
    operationName,
  });

  const delegationContext = getDelegationContext({
    request,
    onLocatedError: originalError => relocatedError(originalError, originalError.path.slice(1)),
    ...options,
    operation,
    fieldName,
    returnType,
  });

  const loader = getLoader(options, request, delegationContext);

  if (Array.isArray(key)) {
    const results = await loader.loadMany(key);

    return results.map(result =>
      onResult(result, {
        ...delegationContext,
        returnType: (getNullableType(delegationContext.returnType) as GraphQLList<any>).ofType,
      })
    );
  }

  const result = await loader.load(key);
  return onResult(result, delegationContext);
}

function onResult(
  result: Error | ExecutionResult | AsyncIterableIterator<AsyncExecutionResult>,
  delegationContext: DelegationContext
): any {
  if (result instanceof Error) {
    return result;
  }

  if (isAsyncIterable(result)) {
    const receiver = new Receiver(result, delegationContext);
    return receiver.getInitialValue();
  }

  return externalValueFromResult(result, delegationContext);
}
