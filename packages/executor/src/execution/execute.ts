import {
  assertValidSchema,
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  getArgumentValues,
  getVariableValues,
  GraphQLAbstractType,
  GraphQLError,
  GraphQLField,
  GraphQLFieldResolver,
  GraphQLFormattedError,
  GraphQLLeafType,
  GraphQLList,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLSchema,
  GraphQLTypeResolver,
  isAbstractType,
  isLeafType,
  isListType,
  isNonNullType,
  isObjectType,
  Kind,
  OperationDefinitionNode,
  SchemaMetaFieldDef,
  TypeMetaFieldDef,
  TypeNameMetaFieldDef,
  versionInfo,
} from 'graphql';
import {
  collectSubFields as _collectSubfields,
  addPath,
  collectFields,
  getDefinedRootType,
  getDirectiveValues,
  GraphQLResolveInfo,
  GraphQLStreamDirective,
  inspect,
  isAsyncIterable,
  isIterableObject,
  isObjectLike,
  locatedError,
  Maybe,
  memoize2,
  memoize3,
  Path,
  pathToArray,
  promiseReduce,
  VariableValues,
  type IncrementalSpec,
  type PatchFields,
} from '@graphql-tools/utils';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import {
  fakePromise,
  handleMaybePromise,
  isPromise,
  mapAsyncIterator,
  type MaybePromise,
} from '@whatwg-node/promise-helpers';
import { coerceError } from './coerceError.js';
import { flattenAsyncIterable } from './flattenAsyncIterable.js';
import {
  cancelAsyncPayload,
  collectInitialPending,
  createIncrementalPublisherState,
  createStreamGroupIfV02,
  DeferredFragmentRecord,
  isAtOrUnderNulledPath,
  pathStartsWith,
  StreamRecord,
  yieldSubsequentPayloads,
  type AsyncPayloadRecord,
  type CompletedResult,
  type IncrementalPublisherState,
  type PendingResult,
  type StreamGroup,
} from './incremental.js';
import {
  buildExecutionPlan,
  collectIncrementalFields,
  collectIncrementalSubfields,
  deferUsageForFieldNode,
  groupedFieldSetToFieldMap,
  labelForDeferUsageSet,
  rootDeferUsage,
  type DeferUsage,
  type DeferUsageSet,
  type GroupedFieldSet,
} from './incrementalCollect.js';
import { invariant } from './invariant.js';
import { promiseForObject } from './promiseForObject.js';

export type { CompletedResult, PendingResult } from './incremental.js';

const EMPTY_ARGS: { [argument: string]: unknown } = Object.freeze(Object.create(null));
const isGraphQL17 = versionInfo.major >= 17;

export interface SingularExecutionResult<TData = any, TExtensions = any> {
  errors?: ReadonlyArray<GraphQLError>;
  data?: TData | null;
  extensions?: TExtensions;
}

/**
 * A memoized collection of relevant subfields with regard to the return
 * type. Memoizing ensures the subfields are not repeatedly calculated, which
 * saves overhead when resolving lists of values.
 *
 * Single WeakMap stack (graphql-js style) via utils `memoize3`.
 */
const collectSubfields = memoize3(function collectSubfields(
  exeContext: ExecutionContext,
  returnType: GraphQLObjectType,
  fieldNodes: Array<FieldNode>,
) {
  return _collectSubfields(
    exeContext.schema,
    exeContext.fragments,
    exeContext.variableValues,
    returnType,
    fieldNodes,
  );
});

/**
 * Memoize argument coercion across list items that share the same field AST
 * and variable values (same identity within one execution).
 */
const getArgumentValuesMemo = memoize3(function getArgumentValuesMemo(
  fieldDef: GraphQLField<unknown, unknown>,
  fieldNode: FieldNode,
  variableValues: object,
) {
  return getArgumentValues(fieldDef, fieldNode, variableValues as any);
});

function getFieldArgumentValues(
  fieldDef: GraphQLField<unknown, unknown>,
  fieldNode: FieldNode,
  variableValues: VariableValues,
): { [argument: string]: unknown } {
  if (fieldDef.args.length === 0) {
    return EMPTY_ARGS;
  }
  // graphql@17 expects VariableValues; graphql@16 expects the flat coerced map.
  const valuesForArgs = isGraphQL17 ? variableValues : variableValues.coerced;
  return getArgumentValuesMemo(fieldDef, fieldNode, valuesForArgs as object);
}

/**
 * Memoize `@stream` directive parsing for repeated list completions.
 */
const getStreamUsageMemo = memoize2(function getStreamUsageMemo(
  fieldNode: FieldNode,
  variableValues: VariableValues,
):
  | undefined
  | {
      initialCount: number | undefined;
      label: string | undefined;
    } {
  const stream = getDirectiveValues(GraphQLStreamDirective, fieldNode, variableValues) as
    | {
        initialCount: number;
        label: string;
        if?: boolean;
      }
    | undefined;

  if (!stream || stream.if === false) {
    return;
  }

  invariant(typeof stream['initialCount'] === 'number', 'initialCount must be a number');
  invariant(stream['initialCount'] >= 0, 'initialCount must be a positive integer');

  return {
    initialCount: stream['initialCount'],
    label: typeof stream['label'] === 'string' ? stream['label'] : undefined,
  };
});

// This file contains a lot of such errors but we plan to refactor it anyway
// so just disable it for entire file.

/**
 * Terminology
 *
 * "Definitions" are the generic name for top-level statements in the document.
 * Examples of this include:
 * 1) Operations (such as a query)
 * 2) Fragments
 *
 * "Operations" are a generic name for requests in the document.
 * Examples of this include:
 * 1) query,
 * 2) mutation
 *
 * "Selections" are the definitions that can appear legally and at
 * single level of the query. These include:
 * 1) field references e.g `a`
 * 2) fragment "spreads" e.g. `...c`
 * 3) inline fragment "spreads" e.g. `...on Type { a }`
 */

/**
 * Data that must be available at all points during query execution.
 *
 * Namely, schema of the type system that is currently executing,
 * and the fragments defined in the query document
 */
export interface ExecutionContext<TVariables = any, TContext = any> {
  schema: GraphQLSchema;
  fragments: Record<string, FragmentDefinitionNode>;
  rootValue: unknown;
  contextValue: TContext;
  operation: OperationDefinitionNode;
  variableValues: VariableValues<TVariables>;
  /** Precomputed for GraphQLResolveInfo (GQL16 coerced map vs GQL17 VariableValues). */
  resolveInfoVariableValues: GraphQLResolveInfo['variableValues'];
  fieldResolver: GraphQLFieldResolver<any, TContext>;
  typeResolver: GraphQLTypeResolver<any, TContext>;
  subscribeFieldResolver: GraphQLFieldResolver<any, TContext>;
  errors: Array<GraphQLError>;
  subsequentPayloads: Set<AsyncPayloadRecord>;
  incrementalSpec: IncrementalSpec;
  publisher?: IncrementalPublisherState;
  /**
   * Allocated only when the operation actually uses @defer/@stream so
   * default execution does not pay for null-bubble bookkeeping.
   */
  nulledPaths?: Array<ReadonlyArray<string | number>>;
  signal?: AbortSignal;
  getAbortSignal: () => AbortSignal | undefined;
  getAsyncHelpers: () => {
    promiseAll: typeof Promise.all;
    track: (maybePromises: ReadonlyArray<unknown>) => void;
  };
  onSignalAbort?(handler: () => void): void;
  signalPromise?: Promise<never>;
  schemaCoordinateInErrors?: boolean;
}

export interface FormattedExecutionResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> {
  errors?: ReadonlyArray<GraphQLFormattedError>;
  data?: TData | null;
  extensions?: TExtensions;
}

export interface IncrementalExecutionResults<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> {
  initialResult: InitialIncrementalExecutionResult<TData, TExtensions>;
  subsequentResults: AsyncGenerator<
    SubsequentIncrementalExecutionResult<TData, TExtensions>,
    void,
    void
  >;
}

export interface InitialIncrementalExecutionResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> extends SingularExecutionResult<TData, TExtensions> {
  hasNext: boolean;
  pending?: ReadonlyArray<PendingResult>;
  incremental?: ReadonlyArray<IncrementalResult<TData, TExtensions>>;
  completed?: ReadonlyArray<CompletedResult>;
  extensions?: TExtensions;
}

export interface FormattedInitialIncrementalExecutionResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> extends FormattedExecutionResult<TData, TExtensions> {
  hasNext: boolean;
  pending?: ReadonlyArray<PendingResult>;
  incremental?: ReadonlyArray<FormattedIncrementalResult<TData, TExtensions>>;
  completed?: ReadonlyArray<CompletedResult>;
  extensions?: TExtensions;
}

export interface SubsequentIncrementalExecutionResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> {
  hasNext: boolean;
  pending?: ReadonlyArray<PendingResult>;
  incremental?: ReadonlyArray<IncrementalResult<TData, TExtensions>>;
  completed?: ReadonlyArray<CompletedResult>;
  extensions?: TExtensions;
}

export interface FormattedSubsequentIncrementalExecutionResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> {
  hasNext: boolean;
  pending?: ReadonlyArray<PendingResult>;
  incremental?: ReadonlyArray<FormattedIncrementalResult<TData, TExtensions>>;
  completed?: ReadonlyArray<CompletedResult>;
  extensions?: TExtensions;
}

export interface IncrementalDeferResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> extends SingularExecutionResult<TData, TExtensions> {
  path?: ReadonlyArray<string | number>;
  label?: string;
  id?: string;
  subPath?: ReadonlyArray<string | number>;
}

export interface FormattedIncrementalDeferResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> extends FormattedExecutionResult<TData, TExtensions> {
  path?: ReadonlyArray<string | number>;
  label?: string;
  id?: string;
  subPath?: ReadonlyArray<string | number>;
}

export interface IncrementalStreamResult<
  TData = Array<unknown>,
  TExtensions = Record<string, unknown>,
> {
  errors?: ReadonlyArray<GraphQLError>;
  items?: TData | null;
  path?: ReadonlyArray<string | number>;
  label?: string;
  id?: string;
  extensions?: TExtensions;
}

export interface FormattedIncrementalStreamResult<
  TData = Array<unknown>,
  TExtensions = Record<string, unknown>,
> {
  errors?: ReadonlyArray<GraphQLFormattedError>;
  items?: TData | null;
  path?: ReadonlyArray<string | number>;
  label?: string;
  id?: string;
  extensions?: TExtensions;
}

export type IncrementalResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> = IncrementalDeferResult<TData, TExtensions> | IncrementalStreamResult<TData, TExtensions>;

export type FormattedIncrementalResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> =
  | FormattedIncrementalDeferResult<TData, TExtensions>
  | FormattedIncrementalStreamResult<TData, TExtensions>;

export interface ExecutionArgs<TData = any, TVariables = any, TContext = any> {
  schema: GraphQLSchema;
  document: TypedDocumentNode<TData, TVariables>;
  rootValue?: unknown;
  contextValue?: TContext;
  variableValues?: TVariables;
  operationName?: Maybe<string>;
  fieldResolver?: Maybe<GraphQLFieldResolver<any, TContext>>;
  typeResolver?: Maybe<GraphQLTypeResolver<any, TContext>>;
  subscribeFieldResolver?: Maybe<GraphQLFieldResolver<any, TContext>>;
  signal?: AbortSignal;
  schemaCoordinateInErrors?: boolean;
  /**
   * When true, omit "Did you mean ...?" suggestion text from variable coercion
   * errors with GraphQL 17. GraphQL 16 ignores this option.
   * Matches `graphql@17`'s `ExecutionArgs.hideSuggestions`.
   */
  hideSuggestions?: Maybe<boolean>;
  /**
   * Incremental delivery payload format.
   *
   * HTTP mapping lives in `INCREMENTAL_DELIVERY_SPECS` from `@graphql-tools/utils`.
   * `'v0.1'` is the default.
   */
  incrementalSpec?: IncrementalSpec;
}

/**
 * Implements the "Executing requests" section of the GraphQL specification,
 * including `@defer` and `@stream` as proposed in
 * https://github.com/graphql/graphql-spec/pull/742
 *
 * This function returns a Promise of an IncrementalExecutionResults
 * object. This object either consists of a single ExecutionResult, or an
 * object containing an `initialResult` and a stream of `subsequentResults`.
 *
 * If the arguments to this function do not result in a legal execution context,
 * a GraphQLError will be thrown immediately explaining the invalid input.
 */
export function execute<TData = any, TVariables = any, TContext = any>(
  args: ExecutionArgs<TData, TVariables, TContext>,
): MaybePromise<SingularExecutionResult<TData> | IncrementalExecutionResults<TData>> {
  // If a valid execution context cannot be created due to incorrect arguments,
  // a "Response" with only errors is returned.
  const exeContext = buildExecutionContext(args);

  // Return early errors if execution context failed.
  if (!('schema' in exeContext)) {
    return {
      errors: exeContext.map(e => {
        Object.defineProperty(e, 'extensions', {
          value: {
            ...e.extensions,
            http: {
              ...(e.extensions?.['http'] || {}),
              status: 400,
            },
          },
        });
        return e;
      }),
    };
  }

  return executeImpl(exeContext);
}

function executeImpl<TData = any, TVariables = any, TContext = any>(
  exeContext: ExecutionContext<TVariables, TContext>,
): MaybePromise<SingularExecutionResult<TData> | IncrementalExecutionResults<TData>> {
  exeContext.signal?.throwIfAborted();

  // Return a Promise that will eventually resolve to the data described by
  // The "Response" section of the GraphQL specification.
  //
  // If errors are encountered while executing a GraphQL field, only that
  // field and its descendants will be omitted, and sibling fields will still
  // be executed. An execution which encounters errors will still result in a
  // resolved Promise.
  //
  // Errors from sub-fields of a NonNull type may propagate to the top level,
  // at which point we still log the error and null the parent field, which
  // in this case is the entire response.
  return handleMaybePromise(
    () => executeOperation<TData, TVariables, TContext>(exeContext),
    data => {
      const initialResult = buildResponse(data, exeContext.errors);
      if (exeContext.subsequentPayloads.size > 0) {
        const incrementalInitial: InitialIncrementalExecutionResult<TData> = {
          ...initialResult,
          hasNext: true,
        };
        if (exeContext.incrementalSpec === 'v0.2') {
          incrementalInitial.pending = collectInitialPending(exeContext);
        }
        return {
          initialResult: incrementalInitial,
          subsequentResults: yieldSubsequentPayloads(exeContext),
        };
      }

      return initialResult;
    },
    (error: any) => {
      exeContext.signal?.throwIfAborted();

      if (error.errors) {
        exeContext.errors.push(...error.errors);
      } else {
        exeContext.errors.push(error);
      }
      return buildResponse<TData>(null, exeContext.errors);
    },
  );
}

/**
 * Also implements the "Executing requests" section of the GraphQL specification.
 * However, it guarantees to complete synchronously (or throw an error) assuming
 * that all field resolvers are also synchronous.
 */
export function executeSync(args: ExecutionArgs): SingularExecutionResult {
  const result = execute(args);

  // Assert that the execution was synchronous.
  if (isPromise(result) || 'initialResult' in result) {
    throw new Error('GraphQL execution failed to complete synchronously.');
  }

  return result;
}

/**
 * Given a completed execution context and data, build the `{ errors, data }`
 * response defined by the "Response" section of the GraphQL specification.
 */
function buildResponse<TData>(
  data: TData | null,
  errors: ReadonlyArray<GraphQLError>,
): SingularExecutionResult<TData> {
  return errors.length === 0 ? { data } : { errors, data };
}

/**
 * Essential assertions before executing to provide developer feedback for
 * improper use of the GraphQL library.
 *
 * @internal
 */
export function assertValidExecutionArguments<TVariables>(
  schema: GraphQLSchema,
  document: TypedDocumentNode<any, TVariables>,
  rawVariableValues: Maybe<TVariables>,
): void {
  console.assert(!!document, 'Must provide document.');

  // If the schema used for execution is invalid, throw an error.
  assertValidSchema(schema);

  // Variables, if provided, must be an object.
  console.assert(
    rawVariableValues == null || isObjectLike(rawVariableValues),
    'Variables must be provided as an Object where each property is a variable value. Perhaps look to see if an unparsed JSON string was provided.',
  );
}

const fragmentsFromDocumentCache = new WeakMap<
  DocumentNode,
  Record<string, FragmentDefinitionNode>
>();

export function getFragmentsFromDocument(
  document: DocumentNode,
): Record<string, FragmentDefinitionNode> {
  let fragments = fragmentsFromDocumentCache.get(document);
  if (fragments === undefined) {
    fragments = Object.create(null) as Record<string, FragmentDefinitionNode>;
    for (const definition of document.definitions) {
      if (definition.kind === Kind.FRAGMENT_DEFINITION) {
        fragments[definition.name.value] = definition;
      }
    }
    fragmentsFromDocumentCache.set(document, fragments);
  }
  return fragments;
}

/**
 * Constructs a ExecutionContext object from the arguments passed to
 * execute, which we will pass throughout the other execution methods.
 *
 * Throws a GraphQLError if a valid execution context cannot be created.
 *
 * TODO: consider no longer exporting this function
 * @internal
 */
export function buildExecutionContext<TData = any, TVariables = any, TContext = any>(
  args: ExecutionArgs<TData, TVariables, TContext>,
): ReadonlyArray<GraphQLError> | ExecutionContext {
  const {
    schema,
    document,
    rootValue,
    contextValue,
    variableValues: rawVariableValues,
    operationName,
    fieldResolver,
    typeResolver,
    subscribeFieldResolver,
    signal,
    schemaCoordinateInErrors,
    hideSuggestions,
    incrementalSpec = 'v0.1',
  } = args;

  signal?.throwIfAborted();

  // If the schema used for execution is invalid, throw an error.
  assertValidSchema(schema);

  const fragments: Record<string, FragmentDefinitionNode> = getFragmentsFromDocument(document);

  let operation: OperationDefinitionNode | undefined;
  for (const definition of document.definitions) {
    switch (definition.kind) {
      case Kind.OPERATION_DEFINITION:
        if (operationName == null) {
          if (operation !== undefined) {
            return [
              new GraphQLError(
                'Must provide operation name if query contains multiple operations.',
                {
                  extensions: {
                    code: 'OPERATION_RESOLUTION_FAILURE',
                  },
                },
              ),
            ];
          }
          operation = definition;
        } else if (definition.name?.value === operationName) {
          operation = definition;
        }
        break;
      default:
      // ignore non-executable definitions
    }
  }

  if (operation == null) {
    if (operationName != null) {
      return [
        new GraphQLError(`Unknown operation named "${operationName}".`, {
          extensions: {
            code: 'OPERATION_RESOLUTION_FAILURE',
          },
        }),
      ];
    }
    return [
      new GraphQLError('Must provide an operation.', {
        extensions: {
          code: 'OPERATION_RESOLUTION_FAILURE',
        },
      }),
    ];
  }

  // FIXME: https://github.com/graphql/graphql-js/issues/2203
  /* c8 ignore next */
  const variableDefinitions = operation.variableDefinitions ?? [];

  const coercedVariableValues = getVariableValues(
    schema,
    variableDefinitions,
    rawVariableValues ?? {},
    {
      maxErrors: 50,
      hideSuggestions: hideSuggestions ?? undefined,
    } as { maxErrors?: number },
  );

  if (coercedVariableValues.errors) {
    return coercedVariableValues.errors;
  }

  signal?.throwIfAborted();

  // GraphQL 17 returns { variableValues }; GraphQL 16 returns { coerced }.
  // Cast through unknown: installed graphql typings match only one major.
  const variableValues: VariableValues = isGraphQL17
    ? (coercedVariableValues as unknown as { variableValues: VariableValues }).variableValues
    : {
        coerced: (coercedVariableValues as unknown as { coerced: Record<string, unknown> }).coerced,
        sources: Object.create(null),
      };
  const resolveInfoVariableValues = (
    isGraphQL17 ? variableValues : variableValues.coerced
  ) as GraphQLResolveInfo['variableValues'];

  let asyncHelpers:
    | {
        promiseAll: typeof Promise.all;
        track: (maybePromises: ReadonlyArray<unknown>) => void;
      }
    | undefined;
  const getAbortSignal = () => signal;
  const getAsyncHelpers = () =>
    (asyncHelpers ??= {
      promiseAll: Promise.all.bind(Promise),
      track: maybePromises => {
        const waitUntil = (contextValue as { waitUntil?: (p: PromiseLike<unknown>) => void } | null)
          ?.waitUntil;
        if (typeof waitUntil !== 'function') {
          return;
        }
        for (const value of maybePromises) {
          if (isPromise(value)) {
            waitUntil(value);
          }
        }
      },
    });

  // Lazily wire AbortSignal → Promise.withResolvers only when something races
  // against abort (async fields / streams), not for fully sync executions.
  let onSignalAbort: ExecutionContext['onSignalAbort'];
  let signalPromise: Promise<never> | undefined;
  let ensureSignalPlumbing: (() => void) | undefined;

  if (signal) {
    let listeners: Set<() => void> | undefined;
    ensureSignalPlumbing = () => {
      if (listeners) {
        return;
      }
      listeners = new Set();
      const signalDeferred = Promise.withResolvers<never>();
      signalPromise = signalDeferred.promise;
      // Attach cleanup before any possible immediate reject so already-aborted
      // signals still drain registered handlers.
      signalPromise.catch(() => {
        for (const listener of listeners!) {
          listener();
        }
        listeners!.clear();
      });
      if (signal.aborted) {
        signalDeferred.reject(signal.reason);
        return;
      }
      const sharedListener = () => {
        signalDeferred.reject(signal.reason);
        signal.removeEventListener('abort', sharedListener);
      };
      signal.addEventListener('abort', sharedListener, { once: true });
    };
    onSignalAbort = handler => {
      ensureSignalPlumbing!();
      if (signal.aborted) {
        handler();
      } else {
        listeners!.add(handler);
      }
    };
  }

  const exeContext: ExecutionContext = {
    schema,
    fragments,
    rootValue,
    contextValue,
    operation,
    variableValues,
    resolveInfoVariableValues,
    fieldResolver: fieldResolver ?? defaultFieldResolver,
    typeResolver: typeResolver ?? defaultTypeResolver,
    subscribeFieldResolver: subscribeFieldResolver ?? defaultFieldResolver,
    subsequentPayloads: new Set(),
    incrementalSpec,
    publisher: incrementalSpec === 'v0.2' ? createIncrementalPublisherState() : undefined,
    errors: [],
    signal,
    getAbortSignal,
    getAsyncHelpers,
    onSignalAbort,
    schemaCoordinateInErrors,
  };

  if (ensureSignalPlumbing) {
    Object.defineProperty(exeContext, 'signalPromise', {
      configurable: true,
      enumerable: true,
      get() {
        ensureSignalPlumbing!();
        return signalPromise;
      },
    });
  }

  return exeContext;
}

function buildPerEventExecutionContext(
  exeContext: ExecutionContext,
  payload: unknown,
): ExecutionContext {
  // Avoid object spread: it would invoke a lazy `signalPromise` getter and
  // eagerly install AbortSignal listeners for sync subscription events.
  const perEvent: ExecutionContext = {
    schema: exeContext.schema,
    fragments: exeContext.fragments,
    rootValue: payload,
    contextValue: exeContext.contextValue,
    operation: exeContext.operation,
    variableValues: exeContext.variableValues,
    resolveInfoVariableValues: exeContext.resolveInfoVariableValues,
    fieldResolver: exeContext.fieldResolver,
    typeResolver: exeContext.typeResolver,
    subscribeFieldResolver: exeContext.subscribeFieldResolver,
    subsequentPayloads: new Set(),
    incrementalSpec: exeContext.incrementalSpec,
    publisher:
      exeContext.incrementalSpec === 'v0.2' ? createIncrementalPublisherState() : undefined,
    errors: [],
    signal: exeContext.signal,
    getAbortSignal: exeContext.getAbortSignal,
    getAsyncHelpers: exeContext.getAsyncHelpers,
    onSignalAbort: exeContext.onSignalAbort,
    schemaCoordinateInErrors: exeContext.schemaCoordinateInErrors,
  };
  const parentDescriptor = Object.getOwnPropertyDescriptor(exeContext, 'signalPromise');
  if (parentDescriptor?.get) {
    Object.defineProperty(perEvent, 'signalPromise', parentDescriptor);
  } else if (parentDescriptor && 'value' in parentDescriptor) {
    perEvent.signalPromise = parentDescriptor.value;
  }
  return perEvent;
}

/**
 * Implements the "Executing operations" section of the spec.
 */
function executeOperation<TData = any, TVariables = any, TContext = any>(
  exeContext: ExecutionContext<TVariables, TContext>,
): MaybePromise<TData> {
  const { operation, schema, fragments, variableValues, rootValue } = exeContext;
  const rootType = getDefinedRootType(schema, operation.operation, [operation]);
  if (rootType == null) {
    throw new GraphQLError(
      `Schema is not configured to execute ${operation.operation} operation.`,
      {
        nodes: operation,
      },
    );
  }

  const { fields: rootFields, patches } = collectFields(
    schema,
    fragments,
    variableValues,
    rootType,
    operation.selectionSet,
  );
  const path = undefined;
  let result: MaybePromise<TData>;

  if (patches.length === 0) {
    if (operation.operation === 'mutation') {
      result = executeFieldsSerially(exeContext, rootType, rootValue, path, rootFields);
    } else {
      result = executeFields(exeContext, rootType, rootValue, path, rootFields) as TData;
    }
    return result;
  }

  exeContext.nulledPaths ??= [];

  const { groupedFieldSet } = collectIncrementalFields(
    schema,
    fragments,
    variableValues,
    rootType,
    operation.selectionSet,
  );
  const { groupedFieldSet: initialFields, newGroupedFieldSets } =
    buildExecutionPlan(groupedFieldSet);
  const plannedRootFields = groupedFieldSetToFieldMap(initialFields);

  if (operation.operation === 'mutation') {
    result = executeFieldsSerially(exeContext, rootType, rootValue, path, plannedRootFields);
  } else {
    result = executeFields(exeContext, rootType, rootValue, path, plannedRootFields) as TData;
  }

  executeDeferredGroups(exeContext, rootType, rootValue, path, newGroupedFieldSets, undefined);

  return result;
}

function executeDeferredGroups(
  exeContext: ExecutionContext,
  parentType: GraphQLObjectType,
  sourceValue: unknown,
  path: Path | undefined,
  newGroupedFieldSets: Map<DeferUsageSet, GroupedFieldSet>,
  parentContext: AsyncPayloadRecord | undefined,
): void {
  if (isAtOrUnderNulledPath(pathToArray(path), exeContext.nulledPaths)) {
    return;
  }
  const records = new Map<DeferUsage, DeferredFragmentRecord>();
  const groups = [...newGroupedFieldSets.entries()].sort(
    ([a], [b]) => deferUsageDepth(rootDeferUsage(a)) - deferUsageDepth(rootDeferUsage(b)),
  );
  for (const [deferUsageSet, groupedFieldSet] of groups) {
    const usage = rootDeferUsage(deferUsageSet);
    const deliveryParent =
      (usage?.parentDeferUsage && records.get(usage.parentDeferUsage)) ?? parentContext;
    const record = executeDeferredFragment(
      exeContext,
      parentType,
      sourceValue,
      groupedFieldSetToFieldMap(groupedFieldSet),
      labelForDeferUsageSet(deferUsageSet),
      path,
      parentContext,
      undefined,
      deliveryParent,
      usage,
    );
    if (usage) {
      records.set(usage, record);
    }
  }
}

function deferUsageDepth(usage: DeferUsage | undefined): number {
  let depth = 0;
  let current = usage;
  while (current?.parentDeferUsage) {
    depth++;
    current = current.parentDeferUsage;
  }
  return depth;
}

/**
 * Implements the "Executing selection sets" section of the spec
 * for fields that must be executed serially.
 */
function executeFieldsSerially<TData>(
  exeContext: ExecutionContext,
  parentType: GraphQLObjectType,
  sourceValue: unknown,
  path: Path | undefined,
  fields: Map<string, Array<FieldNode>>,
): MaybePromise<TData> {
  return promiseReduce(
    fields,
    (results, [responseName, fieldNodes]) => {
      const fieldPath = addPath(path, responseName, parentType.name);
      exeContext.signal?.throwIfAborted();

      return handleMaybePromise(
        () => executeField(exeContext, parentType, sourceValue, fieldNodes, fieldPath),
        result => {
          if (result === undefined) {
            return results;
          }

          results[responseName] = result;

          return results;
        },
      );
    },
    Object.create(null),
  );
}

/**
 * Implements the "Executing selection sets" section of the spec
 * for fields that may be executed in parallel.
 */
function executeFields(
  exeContext: ExecutionContext,
  parentType: GraphQLObjectType,
  sourceValue: unknown,
  path: Path | undefined,
  fields: Map<string, Array<FieldNode>>,
  asyncPayloadRecord?: AsyncPayloadRecord,
): MaybePromise<Record<string, unknown>> {
  const results = Object.create(null);
  let containsPromise = false;

  try {
    for (const [responseName, fieldNodes] of fields) {
      exeContext.signal?.throwIfAborted();

      const fieldPath = addPath(path, responseName, parentType.name);
      const result = executeField(
        exeContext,
        parentType,
        sourceValue,
        fieldNodes,
        fieldPath,
        asyncPayloadRecord,
      );

      if (result !== undefined) {
        results[responseName] = result;
        if (isPromise(result)) {
          containsPromise = true;
        }
      }
    }
  } catch (error) {
    if (error !== exeContext.signal?.reason && containsPromise) {
      // Ensure that any promises returned by other fields are handled, as they may also reject.
      return handleMaybePromise(
        () => promiseForObject(results, exeContext.signal),
        () => {
          throw error;
        },
        () => {
          throw error;
        },
      );
    }
    throw error;
  }

  // If there are no promises, we can just return the object
  if (!containsPromise) {
    return results;
  }

  // Otherwise, results is a map from field name to the result of resolving that
  // field, which is possibly a promise. Return a promise that will return this
  // same map, but with any promises replaced with the values they resolved to.
  return promiseForObject(results, exeContext.signal, exeContext.signalPromise);
}

/**
 * Implements the "Executing fields" section of the spec
 * In particular, this function figures out the value that the field returns by
 * calling its resolve function, then calls completeValue to complete promises,
 * serialize scalars, or execute the sub-selection-set for objects.
 */
function executeField(
  exeContext: ExecutionContext,
  parentType: GraphQLObjectType,
  source: unknown,
  fieldNodes: Array<FieldNode>,
  path: Path,
  asyncPayloadRecord?: AsyncPayloadRecord,
): MaybePromise<unknown> {
  const errors = asyncPayloadRecord?.errors ?? exeContext.errors;
  const fieldDef = getFieldDef(exeContext.schema, parentType, fieldNodes[0]);
  if (!fieldDef) {
    return;
  }

  const returnType = fieldDef.type;
  const resolveFn = fieldDef.resolve ?? exeContext.fieldResolver;

  const info = buildResolveInfo(exeContext, fieldDef, fieldNodes, parentType, path);

  // Get the resolve function, regardless of if its result is normal or abrupt (error).
  try {
    exeContext.signal?.throwIfAborted();
    // Build a JS object of arguments from the field.arguments AST, using the
    // variables scope to fulfill any variable references. Empty-arg fields skip
    // coercion; list items reuse a memo keyed by fieldDef/fieldNode/variables.
    const args = getFieldArgumentValues(fieldDef, fieldNodes[0], exeContext.variableValues);

    // The resolve function's optional third argument is a context value that
    // is provided to every resolve function within an execution. It is commonly
    // used to represent an authenticated user, or request-specific caches.
    const contextValue = exeContext.contextValue;

    const result = resolveFn(source, args, contextValue, info);

    let completed;
    if (isPromise(result)) {
      completed = result.then(resolved =>
        completeValue(exeContext, returnType, fieldNodes, info, path, resolved, asyncPayloadRecord),
      );
    } else {
      completed = completeValue(
        exeContext,
        returnType,
        fieldNodes,
        info,
        path,
        result,
        asyncPayloadRecord,
      );
    }

    if (isPromise(completed)) {
      // Note: we don't rely on a `catch` method, but we do expect "thenable"
      // to take a second callback for the error case.
      return completed.then(undefined, rawError => {
        if (rawError instanceof AggregateError) {
          let result: unknown;
          for (let rawErrorItem of rawError.errors) {
            rawErrorItem = coerceError(rawErrorItem);
            const error = locatedError(
              rawErrorItem,
              fieldNodes,
              pathToArray(path),
              exeContext.schemaCoordinateInErrors && info,
            );
            result = handleFieldError(error, returnType, errors);
            filterSubsequentPayloads(exeContext, path, asyncPayloadRecord);
          }
          return result;
        }
        rawError = coerceError(rawError);
        const error = locatedError(
          rawError,
          fieldNodes,
          pathToArray(path),
          exeContext.schemaCoordinateInErrors && info,
        );
        const handledError = handleFieldError(error, returnType, errors);
        filterSubsequentPayloads(exeContext, path, asyncPayloadRecord);
        return handledError;
      });
    }
    return completed;
  } catch (rawError) {
    if (rawError instanceof AggregateError) {
      let result: unknown;
      for (let rawErrorItem of rawError.errors) {
        rawErrorItem = coerceError(rawErrorItem);
        const error = locatedError(
          rawErrorItem,
          fieldNodes,
          pathToArray(path),
          exeContext.schemaCoordinateInErrors && info,
        );
        result = handleFieldError(error, returnType, errors);
        filterSubsequentPayloads(exeContext, path, asyncPayloadRecord);
      }
      return result;
    }
    const coercedError = coerceError(rawError);
    const error = locatedError(
      coercedError,
      fieldNodes,
      pathToArray(path),
      exeContext.schemaCoordinateInErrors && info,
    );
    const handledError = handleFieldError(error, returnType, errors);
    filterSubsequentPayloads(exeContext, path, asyncPayloadRecord);
    return handledError;
  }
}

/**
 * TODO: consider no longer exporting this function
 * @internal
 */
export function buildResolveInfo(
  exeContext: ExecutionContext,
  fieldDef: GraphQLField<unknown, unknown>,
  fieldNodes: Array<FieldNode>,
  parentType: GraphQLObjectType,
  path: Path,
): GraphQLResolveInfo {
  // The resolve function's optional fourth argument is a collection of
  // information about the current execution state.
  // GraphQL.js v17 requires getAbortSignal / getAsyncHelpers on GraphQLResolveInfo —
  // those helpers are shared for the whole execution (not rebuilt per field).
  return {
    fieldName: fieldDef.name,
    fieldNodes,
    returnType: fieldDef.type,
    parentType,
    path,
    schema: exeContext.schema,
    fragments: exeContext.fragments,
    rootValue: exeContext.rootValue,
    operation: exeContext.operation,
    variableValues: exeContext.resolveInfoVariableValues,
    signal: exeContext.signal,
    getAbortSignal: exeContext.getAbortSignal,
    getAsyncHelpers: exeContext.getAsyncHelpers,
  };
}

export const CRITICAL_ERROR = 'CRITICAL_ERROR' as const;

function handleFieldError(
  error: GraphQLError,
  returnType: GraphQLOutputType,
  errors: Array<GraphQLError>,
): null {
  // If the field type is non-nullable, then it is resolved without any
  // protection from errors, however it still properly locates the error.
  if (isNonNullType(returnType)) {
    throw error;
  }

  if (error.extensions?.[CRITICAL_ERROR]) {
    throw error;
  }

  // Otherwise, error protection is applied, logging the error and resolving
  // a null value for this field if one is encountered.
  errors.push(error);
  return null;
}

/**
 * Implements the instructions for completeValue as defined in the
 * "Value Completion" section of the spec.
 *
 * If the field type is Non-Null, then this recursively completes the value
 * for the inner type. It throws a field error if that completion returns null,
 * as per the "Nullability" section of the spec.
 *
 * If the field type is a List, then this recursively completes the value
 * for the inner type on each item in the list.
 *
 * If the field type is a Scalar or Enum, ensures the completed value is a legal
 * value of the type by calling the `serialize` method of GraphQL type
 * definition.
 *
 * If the field is an abstract type, determine the runtime type of the value
 * and then complete based on that type
 *
 * Otherwise, the field type expects a sub-selection set, and will complete the
 * value by executing all sub-selections.
 */
function completeValue(
  exeContext: ExecutionContext,
  returnType: GraphQLOutputType,
  fieldNodes: Array<FieldNode>,
  info: GraphQLResolveInfo,
  path: Path,
  result: unknown,
  asyncPayloadRecord?: AsyncPayloadRecord,
): MaybePromise<unknown> {
  // If result is an Error, throw a located error.
  if (result instanceof Error) {
    throw result;
  }

  // If field type is NonNull, complete for inner type, and throw field error
  // if result is null.
  if (isNonNullType(returnType)) {
    const completed = completeValue(
      exeContext,
      returnType.ofType,
      fieldNodes,
      info,
      path,
      result,
      asyncPayloadRecord,
    );
    if (completed === null) {
      throw new Error(
        `Cannot return null for non-nullable field ${info.parentType.name}.${info.fieldName}.`,
      );
    }
    return completed;
  }

  // If result value is null or undefined then return null.
  if (result == null) {
    return null;
  }

  // If field type is List, complete each item in the list with the inner type
  if (isListType(returnType)) {
    return completeListValue(
      exeContext,
      returnType,
      fieldNodes,
      info,
      path,
      result,
      asyncPayloadRecord,
    );
  }

  // If field type is a leaf type, Scalar or Enum, serialize to a valid value,
  // returning null if serialization is not possible.
  if (isLeafType(returnType)) {
    return completeLeafValue(returnType, result);
  }

  // If field type is an abstract type, Interface or Union, determine the
  // runtime Object type and complete for that type.
  if (isAbstractType(returnType)) {
    return completeAbstractValue(
      exeContext,
      returnType,
      fieldNodes,
      info,
      path,
      result,
      asyncPayloadRecord,
    );
  }

  // If field type is Object, execute and complete all sub-selections.
  if (isObjectType(returnType)) {
    return completeObjectValue(
      exeContext,
      returnType,
      fieldNodes,
      info,
      path,
      result,
      asyncPayloadRecord,
    );
  }
  /* c8 ignore next 6 */
  // Not reachable, all possible output types have been considered.
  console.assert(false, 'Cannot complete value of unexpected output type: ' + inspect(returnType));
}

/**
 * Returns an object containing the `@stream` arguments if a field should be
 * streamed based on the experimental flag, stream directive present and
 * not disabled by the "if" argument.
 */
function getStreamValues(
  exeContext: ExecutionContext,
  fieldNodes: Array<FieldNode>,
  path: Path,
):
  | undefined
  | {
      initialCount: number | undefined;
      label: string | undefined;
    } {
  // do not stream inner lists of multi-dimensional lists
  if (typeof path.key === 'number') {
    return;
  }

  // validation only allows equivalent streams on multiple fields, so it is
  // safe to only check the first fieldNode for the stream directive
  const fieldNode = fieldNodes[0];
  // Fast path: no directives ⇒ cannot be @stream
  if (!fieldNode.directives?.length) {
    return;
  }
  return getStreamUsageMemo(fieldNode, exeContext.variableValues);
}

/**
 * Complete a async iterator value by completing the result and calling
 * recursively until all the results are completed.
 */
async function completeAsyncIteratorValue(
  exeContext: ExecutionContext,
  itemType: GraphQLOutputType,
  fieldNodes: Array<FieldNode>,
  info: GraphQLResolveInfo,
  path: Path,
  iterator: AsyncIterator<unknown>,
  asyncPayloadRecord?: AsyncPayloadRecord,
): Promise<ReadonlyArray<unknown>> {
  // Register cleanup before throwIfAborted so an already-aborted signal still
  // closes the iterator instead of skipping registration.
  if (iterator.return) {
    exeContext.onSignalAbort?.(() => {
      iterator.return?.();
    });
  }
  exeContext.signal?.throwIfAborted();

  const errors = asyncPayloadRecord?.errors ?? exeContext.errors;
  const stream = getStreamValues(exeContext, fieldNodes, path);
  let containsPromise = false;
  const completedResults: Array<unknown> = [];
  let index = 0;

  while (true) {
    if (stream && typeof stream.initialCount === 'number' && index >= stream.initialCount) {
      executeStreamIterator(
        index,
        iterator,
        exeContext,
        fieldNodes,
        info,
        itemType,
        path,
        stream.label,
        asyncPayloadRecord,
        createStreamGroupIfV02(exeContext, {
          path,
          label: stream.label,
          parentContext: asyncPayloadRecord,
          hasIterator: true,
        }),
      );
      break;
    }

    const itemPath = addPath(path, index, undefined);
    let iteration;
    try {
      iteration = await iterator.next();
      if (iteration.done) {
        break;
      }
    } catch (rawError) {
      const coercedError = coerceError(rawError);
      const error = locatedError(
        coercedError,
        fieldNodes,
        pathToArray(itemPath),
        exeContext.schemaCoordinateInErrors && info,
      );
      completedResults.push(handleFieldError(error, itemType, errors));
      break;
    }

    if (
      completeListItemValue(
        iteration.value,
        completedResults,
        errors,
        exeContext,
        itemType,
        fieldNodes,
        info,
        itemPath,
        asyncPayloadRecord,
      )
    ) {
      containsPromise = true;
    }
    index += 1;
  }
  return containsPromise ? Promise.all(completedResults) : completedResults;
}

/**
 * Complete a list value by completing each item in the list with the
 * inner type
 */
function completeListValue(
  exeContext: ExecutionContext,
  returnType: GraphQLList<GraphQLOutputType>,
  fieldNodes: Array<FieldNode>,
  info: GraphQLResolveInfo,
  path: Path,
  result: unknown,
  asyncPayloadRecord?: AsyncPayloadRecord,
): MaybePromise<ReadonlyArray<unknown>> {
  const itemType = returnType.ofType;
  const errors = asyncPayloadRecord?.errors ?? exeContext.errors;

  if (isAsyncIterable(result)) {
    const iterator = result[Symbol.asyncIterator]();

    return completeAsyncIteratorValue(
      exeContext,
      itemType,
      fieldNodes,
      info,
      path,
      iterator,
      asyncPayloadRecord,
    );
  }

  if (!isIterableObject(result)) {
    throw new GraphQLError(
      `Expected Iterable, but did not find one for field "${info.parentType.name}.${info.fieldName}".`,
    );
  }

  const stream = getStreamValues(exeContext, fieldNodes, path);
  let streamGroup: StreamGroup | undefined;

  // This is specified as a simple map, however we're optimizing the path
  // where the list contains no Promises by avoiding creating another Promise.
  let containsPromise = false;
  let previousAsyncPayloadRecord = asyncPayloadRecord;
  const completedResults: Array<unknown> = [];
  let index = 0;
  for (const item of result) {
    // No need to modify the info object containing the path,
    // since from here on it is not ever accessed by resolver functions.
    const itemPath = addPath(path, index, undefined);

    if (stream && typeof stream.initialCount === 'number' && index >= stream.initialCount) {
      streamGroup ??= createStreamGroupIfV02(exeContext, {
        path,
        label: stream.label,
        parentContext: asyncPayloadRecord,
      });
      previousAsyncPayloadRecord = executeStreamField(
        path,
        itemPath,
        item,
        exeContext,
        fieldNodes,
        info,
        itemType,
        stream.label,
        previousAsyncPayloadRecord,
        streamGroup,
      );
      index++;
      continue;
    }

    if (
      completeListItemValue(
        item,
        completedResults,
        errors,
        exeContext,
        itemType,
        fieldNodes,
        info,
        itemPath,
        asyncPayloadRecord,
      )
    ) {
      containsPromise = true;
    }

    index++;
  }

  return containsPromise ? Promise.all(completedResults) : completedResults;
}

/**
 * Complete a list item value by adding it to the completed results.
 *
 * Returns true if the value is a Promise.
 */
function completeListItemValue(
  item: unknown,
  completedResults: Array<unknown>,
  errors: Array<GraphQLError>,
  exeContext: ExecutionContext,
  itemType: GraphQLOutputType,
  fieldNodes: Array<FieldNode>,
  info: GraphQLResolveInfo,
  itemPath: Path,
  asyncPayloadRecord?: AsyncPayloadRecord,
): boolean {
  try {
    let completedItem;
    if (isPromise(item)) {
      completedItem = item.then(resolved =>
        completeValue(
          exeContext,
          itemType,
          fieldNodes,
          info,
          itemPath,
          resolved,
          asyncPayloadRecord,
        ),
      );
    } else {
      completedItem = completeValue(
        exeContext,
        itemType,
        fieldNodes,
        info,
        itemPath,
        item,
        asyncPayloadRecord,
      );
    }

    if (isPromise(completedItem)) {
      // Note: we don't rely on a `catch` method, but we do expect "thenable"
      // to take a second callback for the error case.
      completedResults.push(
        completedItem.then(undefined, rawError => {
          rawError = coerceError(rawError);
          const error = locatedError(
            rawError,
            fieldNodes,
            pathToArray(itemPath),
            exeContext.schemaCoordinateInErrors && info,
          );
          const handledError = handleFieldError(error, itemType, errors);
          filterSubsequentPayloads(exeContext, itemPath, asyncPayloadRecord);
          return handledError;
        }),
      );

      return true;
    }

    completedResults.push(completedItem);
  } catch (rawError) {
    const coercedError = coerceError(rawError);
    const error = locatedError(
      coercedError,
      fieldNodes,
      pathToArray(itemPath),
      exeContext.schemaCoordinateInErrors && info,
    );
    const handledError = handleFieldError(error, itemType, errors);
    filterSubsequentPayloads(exeContext, itemPath, asyncPayloadRecord);
    completedResults.push(handledError);
  }

  return false;
}

/**
 * Complete a Scalar or Enum by serializing to a valid value, returning
 * null if serialization is not possible.
 */
function completeLeafValue(returnType: GraphQLLeafType, result: unknown): unknown {
  let serializedResult: unknown;

  // Note: We transform GraphQLError to Error in order to be consistent with
  // how non-null checks work later on.
  // See https://github.com/kamilkisiela/graphql-hive/pull/2299
  // See https://github.com/n1ru4l/envelop/issues/1808
  try {
    serializedResult = returnType.serialize(result);
  } catch (err) {
    if (err instanceof GraphQLError) {
      throw new Error(err.message);
    }
    throw err;
  }

  if (serializedResult == null) {
    throw new Error(
      `Expected \`${inspect(returnType)}.serialize(${inspect(result)})\` to ` +
        `return non-nullable value, returned: ${inspect(serializedResult)}`,
    );
  }
  return serializedResult;
}

/**
 * Complete a value of an abstract type by determining the runtime object type
 * of that value, then complete the value for that type.
 */
function completeAbstractValue(
  exeContext: ExecutionContext,
  returnType: GraphQLAbstractType,
  fieldNodes: Array<FieldNode>,
  info: GraphQLResolveInfo,
  path: Path,
  result: unknown,
  asyncPayloadRecord?: AsyncPayloadRecord,
): MaybePromise<Record<string, unknown>> {
  const resolveTypeFn = returnType.resolveType ?? exeContext.typeResolver;
  const contextValue = exeContext.contextValue;
  const runtimeType = resolveTypeFn(result, contextValue, info, returnType);

  if (isPromise(runtimeType)) {
    return runtimeType.then(resolvedRuntimeType =>
      completeObjectValue(
        exeContext,
        ensureValidRuntimeType(
          resolvedRuntimeType,
          exeContext,
          returnType,
          fieldNodes,
          info,
          result,
        ),
        fieldNodes,
        info,
        path,
        result,
        asyncPayloadRecord,
      ),
    );
  }

  return completeObjectValue(
    exeContext,
    ensureValidRuntimeType(runtimeType, exeContext, returnType, fieldNodes, info, result),
    fieldNodes,
    info,
    path,
    result,
    asyncPayloadRecord,
  );
}

function ensureValidRuntimeType(
  runtimeTypeName: unknown,
  exeContext: ExecutionContext,
  returnType: GraphQLAbstractType,
  fieldNodes: Array<FieldNode>,
  info: GraphQLResolveInfo,
  result: unknown,
): GraphQLObjectType {
  if (runtimeTypeName == null) {
    throw new GraphQLError(
      `Abstract type "${returnType.name}" must resolve to an Object type at runtime for field "${info.parentType.name}.${info.fieldName}". Either the "${returnType.name}" type should provide a "resolveType" function or each possible type should provide an "isTypeOf" function.`,
      { nodes: fieldNodes },
    );
  }

  if (isObjectType(runtimeTypeName)) {
    throw new GraphQLError(
      'Support for returning GraphQLObjectType from resolveType was removed in graphql-js@16.0.0 please return type name instead.',
    );
  }

  if (typeof runtimeTypeName !== 'string') {
    throw new GraphQLError(
      `Abstract type "${returnType.name}" must resolve to an Object type at runtime for field "${info.parentType.name}.${info.fieldName}" with ` +
        `value ${inspect(result)}, received "${inspect(runtimeTypeName)}".`,
    );
  }

  const runtimeType = exeContext.schema.getType(runtimeTypeName);
  if (runtimeType == null) {
    throw new GraphQLError(
      `Abstract type "${returnType.name}" was resolved to a type "${runtimeTypeName}" that does not exist inside the schema.`,
      { nodes: fieldNodes },
    );
  }

  if (!isObjectType(runtimeType)) {
    throw new GraphQLError(
      `Abstract type "${returnType.name}" was resolved to a non-object type "${runtimeTypeName}".`,
      { nodes: fieldNodes },
    );
  }

  if (!exeContext.schema.isSubType(returnType, runtimeType)) {
    throw new GraphQLError(
      `Runtime Object type "${runtimeType.name}" is not a possible type for "${returnType.name}".`,
      { nodes: fieldNodes },
    );
  }

  return runtimeType;
}

/**
 * Complete an Object value by executing all sub-selections.
 */
function completeObjectValue(
  exeContext: ExecutionContext,
  returnType: GraphQLObjectType,
  fieldNodes: Array<FieldNode>,
  info: GraphQLResolveInfo,
  path: Path,
  result: unknown,
  asyncPayloadRecord?: AsyncPayloadRecord,
): MaybePromise<Record<string, unknown>> {
  // If there is an isTypeOf predicate function, call it with the
  // current result. If isTypeOf returns false, then raise an error rather
  // than continuing execution.
  if (returnType.isTypeOf) {
    const isTypeOf = returnType.isTypeOf(result, exeContext.contextValue, info);

    if (isPromise(isTypeOf)) {
      return isTypeOf.then(resolvedIsTypeOf => {
        if (!resolvedIsTypeOf) {
          throw invalidReturnTypeError(returnType, result, fieldNodes);
        }
        return collectAndExecuteSubfields(
          exeContext,
          returnType,
          fieldNodes,
          path,
          result,
          asyncPayloadRecord,
        );
      });
    }

    if (!isTypeOf) {
      throw invalidReturnTypeError(returnType, result, fieldNodes);
    }
  }

  return collectAndExecuteSubfields(
    exeContext,
    returnType,
    fieldNodes,
    path,
    result,
    asyncPayloadRecord,
  );
}

function invalidReturnTypeError(
  returnType: GraphQLObjectType,
  result: unknown,
  fieldNodes: Array<FieldNode>,
): GraphQLError {
  return new GraphQLError(
    `Expected value of type "${returnType.name}" but got: ${inspect(result)}.`,
    {
      nodes: fieldNodes,
    },
  );
}

function collectAndExecuteSubfields(
  exeContext: ExecutionContext,
  returnType: GraphQLObjectType,
  fieldNodes: Array<FieldNode>,
  path: Path,
  result: unknown,
  asyncPayloadRecord?: AsyncPayloadRecord,
): MaybePromise<Record<string, unknown>> {
  // Collect sub-fields to execute to complete this value.
  const { fields: subFieldNodes, patches: subPatches } = collectSubfields(
    exeContext,
    returnType,
    fieldNodes,
  );

  if (subPatches.length === 0 && exeContext.nulledPaths == null) {
    return executeFields(exeContext, returnType, result, path, subFieldNodes, asyncPayloadRecord);
  }

  exeContext.nulledPaths ??= [];

  const parentDeferUsage =
    asyncPayloadRecord?.type === 'defer' ? asyncPayloadRecord.deferUsage : undefined;
  const { groupedFieldSet } = collectIncrementalSubfields(
    exeContext.schema,
    exeContext.fragments,
    exeContext.variableValues,
    returnType,
    fieldNodes,
    parentDeferUsage,
  );
  const parentDeferUsages = new Set<DeferUsage>();
  if (parentDeferUsage) {
    parentDeferUsages.add(parentDeferUsage);
  } else if (asyncPayloadRecord?.type === 'stream') {
    for (const node of fieldNodes) {
      const usage = deferUsageForFieldNode(node);
      if (usage) {
        parentDeferUsages.add(usage);
      }
    }
  }
  const { groupedFieldSet: initialFields, newGroupedFieldSets } = buildExecutionPlan(
    groupedFieldSet,
    parentDeferUsages,
  );

  const subFields = executeFields(
    exeContext,
    returnType,
    result,
    path,
    groupedFieldSetToFieldMap(initialFields),
    asyncPayloadRecord,
  );

  executeDeferredGroups(
    exeContext,
    returnType,
    result,
    path,
    newGroupedFieldSets,
    asyncPayloadRecord,
  );

  return subFields;
}

/**
 * If a resolveType function is not given, then a default resolve behavior is
 * used which attempts two strategies:
 *
 * First, See if the provided value has a `__typename` field defined, if so, use
 * that value as name of the resolved type.
 *
 * Otherwise, test each possible type for the abstract type by calling
 * isTypeOf for the object being coerced, returning the first type that matches.
 */
export const defaultTypeResolver: GraphQLTypeResolver<unknown, unknown> = function (
  value,
  contextValue,
  info,
  abstractType,
) {
  // First, look for `__typename`.
  if (isObjectLike(value) && typeof value['__typename'] === 'string') {
    return value['__typename'];
  }

  // Otherwise, test each possible type.
  const possibleTypes = info.schema.getPossibleTypes(abstractType);
  const promisedIsTypeOfResults: any[] = [];

  for (let i = 0; i < possibleTypes.length; i++) {
    const type = possibleTypes[i];

    if (type.isTypeOf) {
      const isTypeOfResult = type.isTypeOf(value, contextValue, info);

      if (isPromise(isTypeOfResult)) {
        promisedIsTypeOfResults[i] = isTypeOfResult;
      } else if (isTypeOfResult) {
        return type.name;
      }
    }
  }

  if (promisedIsTypeOfResults.length) {
    return Promise.all(promisedIsTypeOfResults).then(isTypeOfResults => {
      for (let i = 0; i < isTypeOfResults.length; i++) {
        if (isTypeOfResults[i]) {
          return possibleTypes[i].name;
        }
      }
    });
  }
};

/**
 * If a resolve function is not given, then a default resolve behavior is used
 * which takes the property of the source object of the same name as the field
 * and returns it as the result, or if it's a function, returns the result
 * of calling that function while passing along args and context value.
 */
export const defaultFieldResolver: GraphQLFieldResolver<unknown, unknown> = function (
  source: any,
  args,
  contextValue,
  info,
) {
  // ensure source is a value for which property access is acceptable.
  if (isObjectLike(source) || typeof source === 'function') {
    const property = source[info.fieldName];
    if (typeof property === 'function') {
      return source[info.fieldName](args, contextValue, info);
    }
    return property;
  }
};

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
  const { schema, fragments, operation, variableValues, rootValue } = exeContext;

  const rootType = schema.getSubscriptionType();
  if (rootType == null) {
    throw new GraphQLError('Schema is not configured to execute subscription operation.', {
      nodes: operation,
    });
  }

  const { fields: rootFields } = collectFields(
    schema,
    fragments,
    variableValues,
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
            asyncIterator.return?.();
          });
        }

        return asyncIterator;
      },
    };
  }
  return result;
}

function executeDeferredFragment(
  exeContext: ExecutionContext,
  parentType: GraphQLObjectType,
  sourceValue: unknown,
  fields: Map<string, Array<FieldNode>>,
  label?: string,
  path?: Path,
  parentContext?: AsyncPayloadRecord,
  nestedPatches?: ReadonlyArray<PatchFields>,
  deliveryParent?: AsyncPayloadRecord,
  deferUsage?: DeferUsage,
): DeferredFragmentRecord {
  const asyncPayloadRecord = new DeferredFragmentRecord({
    label,
    path,
    parentContext,
    deliveryParent: deliveryParent ?? parentContext,
    exeContext,
    deferUsage,
  });
  let promiseOrData;
  try {
    promiseOrData = executeFields(
      exeContext,
      parentType,
      sourceValue,
      path,
      fields,
      asyncPayloadRecord,
    );

    if (isPromise(promiseOrData)) {
      promiseOrData = promiseOrData.then(null, e => {
        asyncPayloadRecord.errors.push(e);
        return null;
      });
    }
  } catch (e) {
    asyncPayloadRecord.errors.push(e as GraphQLError);
    promiseOrData = null;
  }
  asyncPayloadRecord.addData(promiseOrData);

  if (nestedPatches) {
    for (const nested of nestedPatches) {
      executeDeferredFragment(
        exeContext,
        parentType,
        sourceValue,
        nested.fields,
        nested.label,
        path,
        // Keep v0.1 sibling completion; v0.2 pending still nests via deliveryParent.
        parentContext,
        nested.patches,
        asyncPayloadRecord,
      );
    }
  }
  return asyncPayloadRecord;
}

function executeStreamField(
  path: Path,
  itemPath: Path,
  item: MaybePromise<unknown>,
  exeContext: ExecutionContext,
  fieldNodes: Array<FieldNode>,
  info: GraphQLResolveInfo,
  itemType: GraphQLOutputType,
  label: string | undefined,
  parentContext: AsyncPayloadRecord | undefined,
  streamGroup: StreamGroup | undefined,
): AsyncPayloadRecord {
  const asyncPayloadRecord = new StreamRecord({
    label,
    path: itemPath,
    parentContext,
    exeContext,
    streamGroup,
  });
  if (isAtOrUnderNulledPath(asyncPayloadRecord.path, exeContext.nulledPaths)) {
    cancelAsyncPayload(exeContext, asyncPayloadRecord);
    return asyncPayloadRecord;
  }
  let completedItem: MaybePromise<unknown>;
  try {
    try {
      if (isPromise(item)) {
        completedItem = item.then(resolved =>
          completeValue(
            exeContext,
            itemType,
            fieldNodes,
            info,
            itemPath,
            resolved,
            asyncPayloadRecord,
          ),
        );
      } else {
        completedItem = completeValue(
          exeContext,
          itemType,
          fieldNodes,
          info,
          itemPath,
          item,
          asyncPayloadRecord,
        );
      }

      if (isPromise(completedItem)) {
        // Note: we don't rely on a `catch` method, but we do expect "thenable"
        // to take a second callback for the error case.
        completedItem = completedItem.then(undefined, rawError => {
          rawError = coerceError(rawError);
          const error = locatedError(
            rawError,
            fieldNodes,
            pathToArray(itemPath),
            exeContext.schemaCoordinateInErrors && info,
          );
          const handledError = handleFieldError(error, itemType, asyncPayloadRecord.errors);
          filterSubsequentPayloads(exeContext, itemPath, asyncPayloadRecord);
          return handledError;
        });
      }
    } catch (rawError) {
      const coercedError = coerceError(rawError);
      const error = locatedError(
        coercedError,
        fieldNodes,
        pathToArray(itemPath),
        exeContext.schemaCoordinateInErrors && info,
      );
      completedItem = handleFieldError(error, itemType, asyncPayloadRecord.errors);
      filterSubsequentPayloads(exeContext, itemPath, asyncPayloadRecord);
    }
  } catch (error) {
    asyncPayloadRecord.errors.push(error as GraphQLError);
    filterSubsequentPayloads(exeContext, path, asyncPayloadRecord);
    asyncPayloadRecord.addItems(null);
    return asyncPayloadRecord;
  }

  let completedItems: MaybePromise<Array<unknown> | null>;
  if (isPromise(completedItem)) {
    completedItems = completedItem.then(
      value => [value],
      error => {
        asyncPayloadRecord.errors.push(error);
        filterSubsequentPayloads(exeContext, path, asyncPayloadRecord);
        return null;
      },
    );
  } else {
    completedItems = [completedItem];
  }

  asyncPayloadRecord.addItems(completedItems);
  return asyncPayloadRecord;
}

async function executeStreamIteratorItem(
  iterator: AsyncIterator<unknown>,
  exeContext: ExecutionContext,
  fieldNodes: Array<FieldNode>,
  info: GraphQLResolveInfo,
  itemType: GraphQLOutputType,
  asyncPayloadRecord: StreamRecord,
  itemPath: Path,
): Promise<IteratorResult<unknown>> {
  let item;
  try {
    const { value, done } = await iterator.next();
    if (done) {
      asyncPayloadRecord.setIsCompletedIterator();
      return { done, value: undefined };
    }
    item = value;
  } catch (rawError) {
    const coercedError = coerceError(rawError);
    const error = locatedError(
      coercedError,
      fieldNodes,
      pathToArray(itemPath),
      exeContext.schemaCoordinateInErrors && info,
    );
    const value = handleFieldError(error, itemType, asyncPayloadRecord.errors);
    // Mark the group complete without isCompletedIterator, so the error item
    // is still published. Don't continue if iterator throws.
    if (asyncPayloadRecord.streamGroup) {
      asyncPayloadRecord.streamGroup.iteratorCompleted = true;
    }
    return { done: true, value };
  }
  let completedItem;
  try {
    completedItem = completeValue(
      exeContext,
      itemType,
      fieldNodes,
      info,
      itemPath,
      item,
      asyncPayloadRecord,
    );

    if (isPromise(completedItem)) {
      completedItem = completedItem.then(undefined, rawError => {
        const error = locatedError(
          rawError,
          fieldNodes,
          pathToArray(itemPath),
          exeContext.schemaCoordinateInErrors && info,
        );
        const handledError = handleFieldError(error, itemType, asyncPayloadRecord.errors);
        filterSubsequentPayloads(exeContext, itemPath, asyncPayloadRecord);
        return handledError;
      });
    }
    return { done: false, value: completedItem };
  } catch (rawError) {
    const error = locatedError(
      rawError,
      fieldNodes,
      pathToArray(itemPath),
      exeContext.schemaCoordinateInErrors && info,
    );
    const value = handleFieldError(error, itemType, asyncPayloadRecord.errors);
    filterSubsequentPayloads(exeContext, itemPath, asyncPayloadRecord);
    return { done: false, value };
  }
}

async function executeStreamIterator(
  initialIndex: number,
  iterator: AsyncIterator<unknown>,
  exeContext: ExecutionContext,
  fieldNodes: Array<FieldNode>,
  info: GraphQLResolveInfo,
  itemType: GraphQLOutputType,
  path: Path,
  label: string | undefined,
  parentContext: AsyncPayloadRecord | undefined,
  streamGroup: StreamGroup | undefined,
): Promise<void> {
  let index = initialIndex;
  let previousAsyncPayloadRecord = parentContext ?? undefined;
  while (true) {
    const itemPath = addPath(path, index, undefined);
    const asyncPayloadRecord = new StreamRecord({
      label,
      path: itemPath,
      parentContext: previousAsyncPayloadRecord,
      iterator,
      exeContext,
      streamGroup,
    });
    if (isAtOrUnderNulledPath(asyncPayloadRecord.path, exeContext.nulledPaths)) {
      cancelAsyncPayload(exeContext, asyncPayloadRecord);
      if (iterator.return) {
        iterator.return().catch(() => {
          // ignore errors
        });
      }
      break;
    }

    let iteration;
    try {
      iteration = await executeStreamIteratorItem(
        iterator,
        exeContext,
        fieldNodes,
        info,
        itemType,
        asyncPayloadRecord,
        itemPath,
      );
    } catch (error) {
      asyncPayloadRecord.errors.push(error as GraphQLError);
      if (streamGroup) {
        streamGroup.iteratorCompleted = true;
      }
      filterSubsequentPayloads(exeContext, path, asyncPayloadRecord);
      asyncPayloadRecord.addItems(null);
      // entire stream has errored and bubbled upwards
      if (iterator?.return) {
        iterator.return().catch(() => {
          // ignore errors
        });
      }
      return;
    }

    const { done, value: completedItem } = iteration;

    let completedItems: MaybePromise<Array<unknown> | null>;
    if (isPromise(completedItem)) {
      completedItems = completedItem.then(
        value => [value],
        error => {
          asyncPayloadRecord.errors.push(error);
          filterSubsequentPayloads(exeContext, path, asyncPayloadRecord);
          return null;
        },
      );
    } else {
      completedItems = [completedItem];
    }

    asyncPayloadRecord.addItems(completedItems);

    if (done) {
      break;
    }
    previousAsyncPayloadRecord = asyncPayloadRecord;
    index++;
  }
}

function filterSubsequentPayloads(
  exeContext: ExecutionContext,
  nullPath: Path,
  currentAsyncRecord: AsyncPayloadRecord | undefined,
): void {
  const nullPathArray = pathToArray(nullPath);
  if (exeContext.nulledPaths) {
    exeContext.nulledPaths.push(nullPathArray);
  } else if (exeContext.subsequentPayloads.size === 0) {
    return;
  }
  exeContext.subsequentPayloads.forEach(asyncRecord => {
    if (asyncRecord === currentAsyncRecord || asyncRecord.cancelled) {
      // don't remove payload from where error originates
      return;
    }
    if (!pathStartsWith(asyncRecord.path, nullPathArray)) {
      // ancestor or a different branch: ancestor patches are pruned at yield
      return;
    }
    cancelAsyncPayload(exeContext, asyncRecord);
  });
}

/**
 * This method looks up the field on the given type definition.
 * It has special casing for the three introspection fields,
 * __schema, __type and __typename. __typename is special because
 * it can always be queried as a field, even in situations where no
 * other fields are allowed, like on a Union. __schema and __type
 * could get automatically added to the query type, but that would
 * require mutating type definitions, which would cause issues.
 *
 * @internal
 */
export function getFieldDef(
  schema: GraphQLSchema,
  parentType: GraphQLObjectType,
  fieldNode: FieldNode,
): Maybe<GraphQLField<unknown, unknown>> {
  const fieldName = fieldNode.name.value;

  if (fieldName === SchemaMetaFieldDef.name && schema.getQueryType() === parentType) {
    return SchemaMetaFieldDef;
  } else if (fieldName === TypeMetaFieldDef.name && schema.getQueryType() === parentType) {
    return TypeMetaFieldDef;
  } else if (fieldName === TypeNameMetaFieldDef.name) {
    return TypeNameMetaFieldDef;
  }
  return parentType.getFields()[fieldName];
}

export function isIncrementalResult<TData>(
  result: SingularExecutionResult<TData> | IncrementalExecutionResults<TData>,
): result is IncrementalExecutionResults<TData> {
  return 'incremental' in result;
}
