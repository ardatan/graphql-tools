import {
  GraphQLError,
  OperationDefinitionNode,
} from 'graphql';
import {
  addPath,
  inspect,
  isAsyncIterable,
  locatedError,
  pathToArray,
} from '@graphql-tools/utils';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import {
  fakePromise,
  handleMaybePromise,
  isPromise,
  mapAsyncIterator,
  type MaybePromise,
} from '@whatwg-node/promise-helpers';
import {
  buildExecutionContext,
  buildPerEventExecutionContext,
  buildResolveInfo,
  collectFieldsFromContext,
  executeImpl,
  getFieldArgumentValues,
  getFieldDef,
} from './execute.js';
import type {
  ExecutionArgs,
  ExecutionContext,
  IncrementalExecutionResults,
  InitialIncrementalExecutionResult,
  SingularExecutionResult,
  SubsequentIncrementalExecutionResult,
} from './executeTypes.js';
import { flattenAsyncIterable } from './flattenAsyncIterable.js';

/**
 * Implements the "Subscribe" algorithm described in the GraphQL specification,
 * including `@defer` and `@stream` as proposed in
 * https://github.com/graphql/graphql-spec/pull/742
 *
 * Returns a Promise which resolves to either an AsyncIterator (if successful)
 * or an ExecutionResult (error). The promise will be rejected if the schema or
 * other arguments to this function are invalid, or if the resolved event stream
 * is not an async iterable.
 *
 * If the client-provided arguments to this function do not result in a
 * compliant subscription, a GraphQL Response (ExecutionResult) with descriptive
 * errors and no data will be returned.
 *
 * If the source stream could not be created due to faulty subscription resolver
 * logic or underlying systems, the promise will resolve to a single
 * ExecutionResult containing `errors` and no `data`.
 *
 * If the operation succeeded, the promise resolves to an AsyncIterator, which
 * yields a stream of result representing the response stream.
 *
 * Each result may be an ExecutionResult with no `hasNext` (if executing the
 * event did not use `@defer` or `@stream`), or an
 * `InitialIncrementalExecutionResult` or `SubsequentIncrementalExecutionResult`
 * (if executing the event used `@defer` or `@stream`). In the case of
 * incremental execution results, each event produces a single
 * `InitialIncrementalExecutionResult` followed by one or more
 * `SubsequentIncrementalExecutionResult`s; all but the last have `hasNext: true`,
 * and the last has `hasNext: false`. There is no interleaving between results
 * generated from the same original event.
 *
 * Accepts an object with named arguments.
 */
export function subscribe<TData = any, TVariables = any, TContext = any>(
  args: ExecutionArgs<TData, TVariables, TContext>,
): MaybePromise<
  | AsyncGenerator<
      | SingularExecutionResult<TData>
      | InitialIncrementalExecutionResult<TData>
      | SubsequentIncrementalExecutionResult<TData>,
      void,
      void
    >
  | SingularExecutionResult<TData>
> {
  // If a valid execution context cannot be created due to incorrect arguments,
  // a "Response" with only errors is returned.
  const exeContext = buildExecutionContext(args);

  // Return early errors if execution context failed.
  if (!('schema' in exeContext)) {
    for (const error of exeContext) {
      // @ts-expect-error - We are intentionally modifying the errors
      const extensions = (error.extensions ||= {});
      const httpExtensions = (extensions['http'] ||= {});
      httpExtensions.status = 400;
      error.extensions['code'] = 'BAD_USER_INPUT';
    }
    return {
      errors: exeContext,
    };
  }

  const resultOrStream = createSourceEventStreamImpl(exeContext);

  if (isPromise(resultOrStream)) {
    return resultOrStream.then(resolvedResultOrStream =>
      mapSourceToResponse(exeContext, resolvedResultOrStream),
    );
  }

  return mapSourceToResponse(exeContext, resultOrStream);
}

export function isIncrementalResults<TData>(
  results: any,
): results is IncrementalExecutionResults<TData> {
  return results?.initialResult;
}

export function flattenIncrementalResults<TData>(
  incrementalResults: IncrementalExecutionResults<TData>,
): AsyncGenerator<
  SubsequentIncrementalExecutionResult<TData, Record<string, unknown>>,
  void,
  void
> {
  const subsequentIterator = incrementalResults.subsequentResults;
  let initialResultSent = false;
  let done = false;
  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      if (done) {
        return fakePromise({ value: undefined, done });
      }
      if (initialResultSent) {
        return subsequentIterator.next();
      }
      initialResultSent = true;
      return fakePromise({
        value: incrementalResults.initialResult,
        done,
      });
    },
    return() {
      done = true;
      return subsequentIterator.return();
    },
    throw(error: any) {
      done = true;
      return subsequentIterator.throw(error);
    },
    [DisposableSymbols.asyncDispose]() {
      done = true;
      return subsequentIterator?.[DisposableSymbols.asyncDispose]?.();
    },
  };
}

async function* ensureAsyncIterable(
  someExecutionResult: SingularExecutionResult | IncrementalExecutionResults,
): AsyncGenerator<
  | SingularExecutionResult
  | InitialIncrementalExecutionResult
  | SubsequentIncrementalExecutionResult,
  void,
  void
> {
  if ('initialResult' in someExecutionResult) {
    yield* flattenIncrementalResults(someExecutionResult);
  } else {
    yield someExecutionResult;
  }
}

function mapSourceToResponse(
  exeContext: ExecutionContext,
  resultOrStream: SingularExecutionResult | AsyncIterable<unknown>,
): MaybePromise<
  | AsyncGenerator<
      | SingularExecutionResult
      | InitialIncrementalExecutionResult
      | SubsequentIncrementalExecutionResult,
      void,
      void
    >
  | SingularExecutionResult
> {
  if (!isAsyncIterable(resultOrStream)) {
    return resultOrStream;
  }

  // For each payload yielded from a subscription, map it over the normal
  // GraphQL `execute` function, with `payload` as the rootValue.
  // This implements the "MapSourceToResponseEvent" algorithm described in
  // the GraphQL specification. The `execute` function provides the
  // "ExecuteSubscriptionEvent" algorithm, as it is nearly identical to the
  // "ExecuteQuery" algorithm, for which `execute` is also used.
  return flattenAsyncIterable(
    mapAsyncIterator(
      resultOrStream,
      (payload: unknown) =>
        handleMaybePromise(
          () => executeImpl(buildPerEventExecutionContext(exeContext, payload)),
          ensureAsyncIterable,
        ),
      (error: Error) => {
        if (error instanceof AggregateError) {
          throw new AggregateError(
            error.errors.map(e => wrapError(e, exeContext.operation)),
            error.message,
          );
        }
        throw wrapError(error, exeContext.operation);
      },
    ),
  );
}

function wrapError(error: Error, operation: OperationDefinitionNode) {
  return new GraphQLError(error.message, {
    originalError: error,
    nodes: [operation],
  });
}

function createSourceEventStreamImpl(
  exeContext: ExecutionContext,
): MaybePromise<AsyncIterable<unknown> | SingularExecutionResult> {
  try {
    const eventStream = executeSubscription(exeContext);
    if (isPromise(eventStream)) {
      return eventStream.then(undefined, error => ({ errors: [error] }));
    }

    return eventStream;
  } catch (error) {
    return { errors: [error as GraphQLError] };
  }
}

function executeSubscription(exeContext: ExecutionContext): MaybePromise<AsyncIterable<unknown>> {
  const { schema, operation, variableValues, rootValue } = exeContext;

  const rootType = schema.getSubscriptionType();
  if (rootType == null) {
    throw new GraphQLError('Schema is not configured to execute subscription operation.', {
      nodes: operation,
    });
  }

  const { fields: rootFields } = collectFieldsFromContext(
    exeContext,
    rootType,
    operation.selectionSet,
  );
  const [responseName, fieldNodes] = [...rootFields.entries()][0];
  const fieldName = fieldNodes[0].name.value;
  const fieldDef = getFieldDef(schema, rootType, fieldNodes[0]);

  if (!fieldDef) {
    throw new GraphQLError(`The subscription field "${fieldName}" is not defined.`, {
      nodes: fieldNodes,
    });
  }

  const path = addPath(undefined, responseName, rootType.name);
  const info = buildResolveInfo(exeContext, fieldDef, fieldNodes, rootType, path);

  try {
    // Implements the "ResolveFieldEventStream" algorithm from GraphQL specification.
    // It differs from "ResolveFieldValue" due to providing a different `resolveFn`.

    // Build a JS object of arguments from the field.arguments AST, using the
    // variables scope to fulfill any variable references.
    const args = getFieldArgumentValues(fieldDef, fieldNodes[0], variableValues);

    // The resolve function's optional third argument is a context value that
    // is provided to every resolve function within an execution. It is commonly
    // used to represent an authenticated user, or request-specific caches.
    const contextValue = exeContext.contextValue;

    // Call the `subscribe()` resolver or the default resolver to produce an
    // AsyncIterable yielding raw payloads.
    const resolveFn = fieldDef.subscribe ?? exeContext.subscribeFieldResolver;
    const result = resolveFn(rootValue, args, contextValue, info);

    if (isPromise(result)) {
      return result
        .then(result => assertEventStream(result, exeContext.signal, exeContext.onSignalAbort))
        .then(undefined, error => {
          throw locatedError(
            error,
            fieldNodes,
            pathToArray(path),
            exeContext.schemaCoordinateInErrors && info,
          );
        });
    }

    return assertEventStream(result, exeContext.signal, exeContext.onSignalAbort);
  } catch (error) {
    throw locatedError(
      error,
      fieldNodes,
      pathToArray(path),
      exeContext.schemaCoordinateInErrors && info,
    );
  }
}

function assertEventStream(
  result: unknown,
  signal?: AbortSignal,
  onSignalAbort?: (handler: () => void) => void,
): AsyncIterable<unknown> {
  signal?.throwIfAborted();
  if (result instanceof Error) {
    throw result;
  }

  // Assert field returned an event stream, otherwise yield an error.
  if (!isAsyncIterable(result)) {
    throw new GraphQLError(
      'Subscription field must return Async Iterable. ' + `Received: ${inspect(result)}.`,
    );
  }
  if (onSignalAbort) {
    return {
      [Symbol.asyncIterator]() {
        const asyncIterator = result[Symbol.asyncIterator]();

        if (asyncIterator.return) {
          onSignalAbort?.(() => {
            // Abort cleanup is best-effort: contain synchronous throws and rejected promises
            // without waiting for cleanup or preventing other abort handlers from running.
            handleMaybePromise(
              () => asyncIterator.return?.(),
              () => {},
              () => {},
            );
          });
        }

        return asyncIterator;
      },
    };
  }
  return result;
}
