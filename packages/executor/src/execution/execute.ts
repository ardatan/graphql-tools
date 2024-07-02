import {
  assertValidSchema,
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  getDirectiveValues,
  GraphQLAbstractType,
  GraphQLError,
  GraphQLField,
  GraphQLFieldResolver,
  GraphQLLeafType,
  GraphQLList,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLResolveInfo,
  GraphQLSchema,
  GraphQLTypeResolver,
  isAbstractType,
  isLeafType,
  isListType,
  isNonNullType,
  isObjectType,
  Kind,
  locatedError,
  OperationDefinitionNode,
  OperationTypeNode,
  SchemaMetaFieldDef,
  TypeMetaFieldDef,
  TypeNameMetaFieldDef,
  versionInfo,
} from 'graphql';
import {
  addPath,
  createGraphQLError,
  getArgumentValues,
  getDefinedRootType,
  GraphQLStreamDirective,
  inspect,
  isAsyncIterable,
  isIterableObject,
  isObjectLike,
  isPromise,
  mapAsyncIterator,
  Maybe,
  MaybePromise,
  memoize1,
  memoize3of4,
  Path,
  pathToArray,
  promiseReduce,
} from '@graphql-tools/utils';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { AccumulatorMap } from './AccumulatorMap.js';
import { BoxedPromiseOrValue } from './BoxedPromiseOrValue.js';
import type { DeferUsageSet, ExecutionPlan } from './buildExecutionPlan.js';
import { buildBranchingExecutionPlan, buildExecutionPlan } from './buildExecutionPlan.js';
import { coerceError } from './coerceError.js';
import type { FieldGroup, GroupedFieldSet } from './collectFields.js';
import { collectSubfields as _collectSubfields, collectFields } from './collectFields.js';
import { DeferredFragmentFactory } from './DeferredFragments.js';
import { flattenAsyncIterable } from './flattenAsyncIterable.js';
import { buildIncrementalResponse } from './IncrementalPublisher.js';
import { invariant } from './invariant.js';
import { promiseForObject } from './promiseForObject.js';
import type {
  CancellableStreamRecord,
  CompletedExecutionGroup,
  IncrementalDataRecord,
  IncrementalExecutionResults,
  InitialIncrementalExecutionResult,
  PendingExecutionGroup,
  SingularExecutionResult,
  StreamItemRecord,
  StreamItemResult,
  StreamRecord,
  SubsequentIncrementalExecutionResult,
} from './types.js';
import { getVariableValues } from './values.js';

/**
 * A memoized collection of relevant subfields with regard to the return
 * type. Memoizing ensures the subfields are not repeatedly calculated, which
 * saves overhead when resolving lists of values.
 */
const collectSubfields = memoize3of4(
  (
    exeContext: ExecutionContext,
    returnType: GraphQLObjectType,
    fieldGroup: FieldGroup,
    path: Path,
  ) =>
    _collectSubfields(
      exeContext.schema,
      exeContext.fragments,
      exeContext.variableValues,
      exeContext.errorOnSubscriptionWithIncrementalDelivery,
      returnType,
      fieldGroup,
      path,
    ),
);

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
  variableValues: TVariables;
  fieldResolver: GraphQLFieldResolver<any, TContext>;
  typeResolver: GraphQLTypeResolver<any, TContext>;
  subscribeFieldResolver: GraphQLFieldResolver<any, TContext>;
  enableEarlyExecution: boolean;
  deferWithoutDuplication: boolean;
  useIncrementalNotifications: boolean;
  errorOnSubscriptionWithIncrementalDelivery: boolean;
  signal: AbortSignal | undefined;
  errors: AccumulatorMap<Path | undefined, GraphQLError> | undefined;
  encounteredDefer: boolean;
  deferredFragmentFactory: DeferredFragmentFactory | undefined;
  cancellableStreams: Set<CancellableStreamRecord> | undefined;
  incrementalDataRecords: Array<IncrementalDataRecord> | undefined;
}

interface IncrementalContext {
  errors: AccumulatorMap<Path | undefined, GraphQLError> | undefined;
  deferUsageSet?: DeferUsageSet | undefined;
  incrementalDataRecords: Array<IncrementalDataRecord> | undefined;
}

export type IncrementalPreset = 'v17.0.0-alpha.2' | 'v17.0.0-alpha.3';

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
  enableEarlyExecution?: Maybe<boolean>;
  incrementalPreset?: Maybe<IncrementalPreset>;
  deferWithoutDuplication?: Maybe<boolean>;
  useIncrementalNotifications?: Maybe<boolean>;
  errorOnSubscriptionWithIncrementalDelivery?: Maybe<boolean>;
  signal?: AbortSignal;
}

interface StreamUsage {
  label: string | undefined;
  initialCount: number;
  fieldGroup: FieldGroup;
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
              ...e.extensions?.['http'],
              status: 400,
            },
          },
        });
        return e;
      }),
    };
  }

  return executeOperation(exeContext);
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
function buildDataResponse<TData = any>(
  exeContext: ExecutionContext,
  data: TData,
): SingularExecutionResult<TData> | IncrementalExecutionResults<TData> {
  const { errors, incrementalDataRecords } = exeContext;
  if (incrementalDataRecords === undefined) {
    return buildSingleResult(data, errors);
  }

  if (errors === undefined) {
    return buildIncrementalResponse(exeContext, data, undefined, incrementalDataRecords);
  }

  const filteredIncrementalDataRecords = filterIncrementalDataRecords(
    undefined,
    errors,
    incrementalDataRecords,
  );

  if (filteredIncrementalDataRecords.length === 0) {
    return buildSingleResult(data, errors);
  }

  return buildIncrementalResponse(
    exeContext,
    data,
    flattenErrors(errors),
    filteredIncrementalDataRecords,
  );
}

function buildSingleResult<TData = any>(
  data: TData,
  errors: ReadonlyMap<Path | undefined, ReadonlyArray<GraphQLError>> | undefined,
): SingularExecutionResult<TData> {
  return errors !== undefined ? { errors: Array.from(errors.values()).flat(), data } : { data };
}

function filterIncrementalDataRecords(
  initialPath: Path | undefined,
  errors: ReadonlyMap<Path | undefined, ReadonlyArray<GraphQLError>>,
  incrementalDataRecords: ReadonlyArray<IncrementalDataRecord>,
): ReadonlyArray<IncrementalDataRecord> {
  const filteredIncrementalDataRecords: Array<IncrementalDataRecord> = [];
  for (const incrementalDataRecord of incrementalDataRecords) {
    let currentPath = incrementalDataRecord.path;

    if (errors.has(currentPath)) {
      continue;
    }

    const paths: Array<Path | undefined> = [currentPath];
    let filtered = false;
    while (currentPath !== initialPath) {
      // Because currentPath leads to initialPath or is undefined, and the
      // loop will exit if initialPath is undefined, currentPath must be
      // defined.
      // TODO: Consider, however, adding an invariant.

      currentPath = currentPath!.prev;
      if (errors.has(currentPath)) {
        filtered = true;
        break;
      }
      paths.push(currentPath);
    }

    if (!filtered) {
      filteredIncrementalDataRecords.push(incrementalDataRecord);
    }
  }

  return filteredIncrementalDataRecords;
}

function flattenErrors(errors: ReadonlyMap<Path | undefined, ReadonlyArray<GraphQLError>>) {
  const errorsByPath = [...errors.values()];
  return errorsByPath.flat();
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

export const getFragmentsFromDocument = memoize1(function getFragmentsFromDocument(
  document: DocumentNode,
): Record<string, FragmentDefinitionNode> {
  const fragments: Record<string, FragmentDefinitionNode> = Object.create(null);
  for (const definition of document.definitions) {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      fragments[definition.name.value] = definition;
    }
  }
  return fragments;
});

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
    enableEarlyExecution,
    incrementalPreset,
    deferWithoutDuplication,
    useIncrementalNotifications,
    errorOnSubscriptionWithIncrementalDelivery,
    signal,
  } = args;

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
              createGraphQLError(
                'Must provide operation name if query contains multiple operations.',
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
      return [createGraphQLError(`Unknown operation named "${operationName}".`)];
    }
    return [createGraphQLError('Must provide an operation.')];
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
    },
  );

  if (coercedVariableValues.errors) {
    return coercedVariableValues.errors;
  }

  const latestPreset = incrementalPreset !== 'v17.0.0-alpha.2';

  return {
    schema,
    fragments,
    rootValue,
    contextValue,
    operation,
    variableValues: coercedVariableValues.coerced,
    fieldResolver: fieldResolver ?? defaultFieldResolver,
    typeResolver: typeResolver ?? defaultTypeResolver,
    subscribeFieldResolver: subscribeFieldResolver ?? defaultFieldResolver,
    enableEarlyExecution: enableEarlyExecution !== false,
    deferWithoutDuplication:
      deferWithoutDuplication != null ? deferWithoutDuplication : latestPreset,
    useIncrementalNotifications:
      useIncrementalNotifications != null ? useIncrementalNotifications : latestPreset,
    errorOnSubscriptionWithIncrementalDelivery:
      operation.operation === 'subscription' &&
      (errorOnSubscriptionWithIncrementalDelivery != null
        ? errorOnSubscriptionWithIncrementalDelivery
        : latestPreset),
    signal,
    errors: undefined,
    encounteredDefer: false,
    deferredFragmentFactory: undefined,
    cancellableStreams: undefined,
    incrementalDataRecords: undefined,
  };
}

function buildPerEventExecutionContext(
  exeContext: ExecutionContext,
  payload: unknown,
): ExecutionContext {
  return {
    ...exeContext,
    rootValue: payload,
    errors: undefined,
    encounteredDefer: false,
    deferredFragmentFactory: undefined,
    cancellableStreams: undefined,
    incrementalDataRecords: undefined,
  };
}

/**
 * Implements the "Executing operations" section of the spec.
 */
function executeOperation<TData = any, TVariables = any, TContext = any>(
  exeContext: ExecutionContext<TVariables, TContext>,
): MaybePromise<SingularExecutionResult<TData> | IncrementalExecutionResults<TData>> {
  if (exeContext.signal?.aborted) {
    throw exeContext.signal.reason;
  }

  try {
    const {
      operation,
      schema,
      fragments,
      variableValues,
      rootValue,
      deferWithoutDuplication,
      errorOnSubscriptionWithIncrementalDelivery,
    } = exeContext;
    const rootType = getDefinedRootType(schema, operation.operation, [operation]);
    if (rootType == null) {
      createGraphQLError(`Schema is not configured to execute ${operation.operation} operation.`, {
        nodes: operation,
      });
    }

    const originalGroupedFieldSet = collectFields(
      schema,
      fragments,
      variableValues,
      rootType,
      operation.selectionSet,
      errorOnSubscriptionWithIncrementalDelivery,
    );
    let data: MaybePromise<TData>;
    if (!originalGroupedFieldSet.encounteredDefer) {
      data = executeRootGroupedFieldSet(
        exeContext,
        operation.operation,
        rootType,
        rootValue,
        originalGroupedFieldSet,
      );
    } else {
      exeContext.encounteredDefer = true;
      const { groupedFieldSet, newGroupedFieldSets } = deferWithoutDuplication
        ? buildExecutionPlan(originalGroupedFieldSet)
        : buildBranchingExecutionPlan(originalGroupedFieldSet);

      data = executeRootGroupedFieldSet(
        exeContext,
        operation.operation,
        rootType,
        rootValue,
        groupedFieldSet,
      );

      if (newGroupedFieldSets.size > 0) {
        const newPendingExecutionGroups = collectExecutionGroups(
          exeContext,
          rootType,
          rootValue,
          undefined,
          undefined,
          newGroupedFieldSets,
        );

        addIncrementalDataRecords(exeContext, newPendingExecutionGroups);
      }
    }
    if (isPromise(data)) {
      return data.then(
        resolved => buildDataResponse(exeContext, resolved),
        error => {
          if (exeContext.signal?.aborted) {
            throw exeContext.signal.reason;
          }
          return {
            data: null,
            errors: withError(exeContext.errors, error),
          };
        },
      );
    }
    return buildDataResponse(exeContext, data);
  } catch (error: any) {
    if (exeContext.signal?.aborted) {
      throw exeContext.signal.reason;
    }
    return { data: null, errors: withError(exeContext.errors, error) };
  }
}

function executeRootGroupedFieldSet<TData = any>(
  exeContext: ExecutionContext,
  operation: OperationTypeNode,
  rootType: GraphQLObjectType,
  rootValue: unknown,
  groupedFieldSet: GroupedFieldSet,
): MaybePromise<TData> {
  let result: MaybePromise<TData>;
  if (operation === 'mutation') {
    result = executeFieldsSerially(
      exeContext,
      rootType,
      rootValue,
      undefined,
      groupedFieldSet,
      undefined,
    );
  } else {
    result = executeFields(
      exeContext,
      rootType,
      rootValue,
      undefined,
      groupedFieldSet,
      undefined,
    ) as MaybePromise<TData>;
  }
  return result;
}

function addIncrementalDataRecords(
  context: ExecutionContext | IncrementalContext,
  newIncrementalDataRecords: ReadonlyArray<IncrementalDataRecord>,
): void {
  const incrementalDataRecords = context.incrementalDataRecords;
  if (incrementalDataRecords === undefined) {
    context.incrementalDataRecords = [...newIncrementalDataRecords];
    return;
  }
  incrementalDataRecords.push(...newIncrementalDataRecords);
}

function withError(
  errors: ReadonlyMap<Path | undefined, ReadonlyArray<GraphQLError>> | undefined,
  error: GraphQLError | AggregateError,
): ReadonlyArray<GraphQLError> {
  const newErrors = 'errors' in error ? error.errors : [error];
  return errors === undefined ? newErrors : [...flattenErrors(errors), ...newErrors];
}

/**
 * Implements the "Executing selection sets" section of the spec
 * for fields that must be executed serially.
 */
function executeFieldsSerially<TData = any>(
  exeContext: ExecutionContext,
  parentType: GraphQLObjectType,
  sourceValue: unknown,
  path: Path | undefined,
  groupedFieldSet: GroupedFieldSet,
  incrementalContext: IncrementalContext | undefined,
): MaybePromise<TData> {
  return promiseReduce(
    groupedFieldSet,
    (results, [responseName, fieldGroup]) => {
      const fieldPath = addPath(path, responseName, parentType.name);
      if (exeContext.signal?.aborted) {
        throw exeContext.signal.reason;
      }

      const result = executeField(
        exeContext,
        parentType,
        sourceValue,
        fieldGroup,
        fieldPath,
        incrementalContext,
      );
      if (result === undefined) {
        return results;
      }
      if (isPromise(result)) {
        return result.then(resolved => {
          results[responseName] = resolved;
          return results;
        });
      }
      results[responseName] = result;
      return results;
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
  groupedFieldSet: GroupedFieldSet,
  incrementalContext: IncrementalContext | undefined,
): MaybePromise<Record<string, unknown>> {
  const results = Object.create(null);
  let containsPromise = false;

  try {
    for (const [responseName, fieldGroup] of groupedFieldSet) {
      if (exeContext.signal?.aborted) {
        throw exeContext.signal.reason;
      }

      const fieldPath = addPath(path, responseName, parentType.name);
      const result = executeField(
        exeContext,
        parentType,
        sourceValue,
        fieldGroup,
        fieldPath,
        incrementalContext,
      );

      if (result !== undefined) {
        results[responseName] = result;
        if (isPromise(result)) {
          containsPromise = true;
        }
      }
    }
  } catch (error) {
    if (containsPromise) {
      // Ensure that any promises returned by other fields are handled, as they may also reject.
      return promiseForObject(results, exeContext.signal).finally(() => {
        throw error;
      }) as never;
    }
    throw error;
  }

  // If there are no promises, we can just return the object and any incrementalDataRecords
  if (!containsPromise) {
    return results;
  }

  // Otherwise, results is a map from field name to the result of resolving that
  // field, which is possibly a promise. Return a promise that will return this
  // same map, but with any promises replaced with the values they resolved to.
  return promiseForObject(results, exeContext.signal);
}

function toNodes(fieldGroup: FieldGroup): Array<FieldNode> {
  return fieldGroup.map(fieldDetails => fieldDetails.node);
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
  fieldGroup: FieldGroup,
  path: Path,
  incrementalContext: IncrementalContext | undefined,
): MaybePromise<unknown> | undefined {
  const fieldDef = getFieldDef(exeContext.schema, parentType, fieldGroup[0].node);
  if (!fieldDef) {
    return;
  }

  const returnType = fieldDef.type;
  const resolveFn = fieldDef.resolve ?? exeContext.fieldResolver;

  const info = buildResolveInfo(exeContext, fieldDef, toNodes(fieldGroup), parentType, path);

  // Get the resolve function, regardless of if its result is normal or abrupt (error).
  try {
    // Build a JS object of arguments from the field.arguments AST, using the
    // variables scope to fulfill any variable references.
    // TODO: find a way to memoize, in case this field is within a List type.
    const args = getArgumentValues(fieldDef, fieldGroup[0].node, exeContext.variableValues);

    // The resolve function's optional third argument is a context value that
    // is provided to every resolve function within an execution. It is commonly
    // used to represent an authenticated user, or request-specific caches.
    const contextValue = exeContext.contextValue;

    const result = resolveFn(source, args, contextValue, info);

    if (isPromise(result)) {
      return completePromisedValue(
        exeContext,
        returnType,
        fieldGroup,
        info,
        path,
        result,
        incrementalContext,
      );
    }

    const completed = completeValue(
      exeContext,
      returnType,
      fieldGroup,
      info,
      path,
      result,
      incrementalContext,
    );

    if (isPromise(completed)) {
      // Note: we don't rely on a `catch` method, but we do expect "thenable"
      // to take a second callback for the error case.
      return completed.then(undefined, rawError => {
        handleFieldError(rawError, exeContext, returnType, fieldGroup, path, incrementalContext);
        return null;
      });
    }
    return completed;
  } catch (rawError) {
    handleFieldError(rawError, exeContext, returnType, fieldGroup, path, incrementalContext);
    return null;
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
    variableValues: exeContext.variableValues,
  };
}

export const CRITICAL_ERROR = 'CRITICAL_ERROR' as const;

function handleFieldError(
  rawError: unknown,
  exeContext: ExecutionContext,
  returnType: GraphQLOutputType,
  fieldGroup: FieldGroup,
  path: Path,
  incrementalContext: IncrementalContext | undefined,
): void {
  if (rawError instanceof AggregateError) {
    for (const rawErrorItem of rawError.errors) {
      handleFieldError(rawErrorItem, exeContext, returnType, fieldGroup, path, incrementalContext);
    }
    return;
  }

  const error = locatedError(coerceError(rawError), toNodes(fieldGroup), pathToArray(path));

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
  const context = incrementalContext ?? exeContext;
  let errors = context.errors;
  if (errors === undefined) {
    errors = new AccumulatorMap();
    context.errors = errors;
  }
  errors.add(path, error);
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
  fieldGroup: FieldGroup,
  info: GraphQLResolveInfo,
  path: Path,
  result: unknown,
  incrementalContext: IncrementalContext | undefined,
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
      fieldGroup,
      info,
      path,
      result,
      incrementalContext,
    );
    if (completed == null) {
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
      fieldGroup,
      info,
      path,
      result,
      incrementalContext,
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
      fieldGroup,
      info,
      path,
      result,
      incrementalContext,
    );
  }

  // If field type is Object, execute and complete all sub-selections.
  if (isObjectType(returnType)) {
    return completeObjectValue(
      exeContext,
      returnType,
      fieldGroup,
      info,
      path,
      result,
      incrementalContext,
    );
  }
  /* c8 ignore next 6 */
  // Not reachable, all possible output types have been considered.
  invariant(false, 'Cannot complete value of unexpected output type: ' + inspect(returnType));
}

async function completePromisedValue(
  exeContext: ExecutionContext,
  returnType: GraphQLOutputType,
  fieldGroup: FieldGroup,
  info: GraphQLResolveInfo,
  path: Path,
  result: PromiseLike<unknown>,
  incrementalContext: IncrementalContext | undefined,
): Promise<unknown> {
  try {
    const resolved = await result;
    let completed = completeValue(
      exeContext,
      returnType,
      fieldGroup,
      info,
      path,
      resolved,
      incrementalContext,
    );

    if (isPromise(completed)) {
      completed = await completed;
    }
    return completed;
  } catch (rawError) {
    handleFieldError(rawError, exeContext, returnType, fieldGroup, path, incrementalContext);
    return null;
  }
}

/**
 * Returns an object containing info for streaming if a field should be
 * streamed based on the experimental flag, stream directive present and
 * not disabled by the "if" argument.
 */
function getStreamUsage(
  exeContext: ExecutionContext,
  fieldGroup: FieldGroup,
  path: Path,
): StreamUsage | undefined {
  // do not stream inner lists of multi-dimensional lists
  if (typeof path.key === 'number') {
    return;
  }

  // TODO: add test for this case (a streamed list nested under a list).
  /* c8 ignore next 7 */
  if ((fieldGroup as unknown as { _streamUsage: StreamUsage })._streamUsage !== undefined) {
    return (fieldGroup as unknown as { _streamUsage: StreamUsage })._streamUsage;
  }

  // validation only allows equivalent streams on multiple fields, so it is
  // safe to only check the first fieldNode for the stream directive
  const stream = getDirectiveValues(
    GraphQLStreamDirective,
    fieldGroup[0].node,
    exeContext.variableValues,
  ) as {
    initialCount: number;
    label: string;
    if?: boolean;
  };

  if (!stream) {
    return;
  }

  if (stream.if === false) {
    return;
  }

  invariant(typeof stream['initialCount'] === 'number', 'initialCount must be a number');

  invariant(stream['initialCount'] >= 0, 'initialCount must be a positive integer');

  invariant(
    !exeContext.errorOnSubscriptionWithIncrementalDelivery,
    '`@stream` directive not supported on subscription operations. Disable `@stream` by setting the `if` argument to `false`.',
  );

  const streamedFieldGroup: FieldGroup = fieldGroup.map(fieldDetails => ({
    node: fieldDetails.node,
    deferUsage: undefined,
  }));

  const streamUsage = {
    initialCount: stream['initialCount'],
    label: typeof stream['label'] === 'string' ? stream['label'] : undefined,
    fieldGroup: streamedFieldGroup,
  };

  (fieldGroup as unknown as { _streamUsage: StreamUsage })._streamUsage = streamUsage;

  return streamUsage;
}

/**
 * Complete a async iterator value by completing the result and calling
 * recursively until all the results are completed.
 */
async function completeAsyncIteratorValue(
  exeContext: ExecutionContext,
  itemType: GraphQLOutputType,
  fieldGroup: FieldGroup,
  info: GraphQLResolveInfo,
  path: Path,
  asyncIterator: AsyncIterator<unknown>,
  incrementalContext: IncrementalContext | undefined,
): Promise<ReadonlyArray<unknown>> {
  exeContext.signal?.addEventListener('abort', () => {
    asyncIterator.return?.();
  });
  let containsPromise = false;
  const completedResults: Array<unknown> = [];
  let index = 0;
  const streamUsage = getStreamUsage(exeContext, fieldGroup, path);
  const earlyReturn =
    asyncIterator.return === undefined ? undefined : asyncIterator.return.bind(asyncIterator);
  try {
    while (true) {
      if (streamUsage && index >= streamUsage.initialCount) {
        const streamItemQueue = buildAsyncStreamItemQueue(
          index,
          path,
          asyncIterator,
          exeContext,
          streamUsage.fieldGroup,
          info,
          itemType,
        );

        let streamRecord: StreamRecord | CancellableStreamRecord;
        if (earlyReturn === undefined) {
          streamRecord = {
            label: streamUsage.label,
            path,
            index,
            streamItemQueue,
          };
        } else {
          streamRecord = {
            label: streamUsage.label,
            path,
            index,
            streamItemQueue,
            earlyReturn,
          };
          if (exeContext.cancellableStreams === undefined) {
            exeContext.cancellableStreams = new Set();
          }
          exeContext.cancellableStreams.add(streamRecord);
        }

        const context = incrementalContext ?? exeContext;
        addIncrementalDataRecords(context, [streamRecord]);
        break;
      }

      const itemPath = addPath(path, index, undefined);
      let iteration;
      try {
        iteration = await asyncIterator.next();
      } catch (rawError) {
        throw locatedError(coerceError(rawError), toNodes(fieldGroup), pathToArray(path));
      }

      // TODO: add test case for stream returning done before initialCount
      /* c8 ignore next 3 */
      if (iteration.done) {
        break;
      }

      const item = iteration.value;
      // TODO: add tests for stream backed by asyncIterator that returns a promise
      /* c8 ignore start */
      if (isPromise(item)) {
        completedResults.push(
          completePromisedListItemValue(
            item,
            exeContext,
            itemType,
            fieldGroup,
            info,
            itemPath,
            incrementalContext,
          ),
        );
        containsPromise = true;
      } else if (
        /* c8 ignore stop */
        completeListItemValue(
          item,
          completedResults,
          exeContext,
          itemType,
          fieldGroup,
          info,
          itemPath,
          incrementalContext,
        )
        // TODO: add tests for stream backed by asyncIterator that completes to a promise
        /* c8 ignore start */
      ) {
        containsPromise = true;
      }
      /* c8 ignore stop */
      index++;
    }
  } catch (error) {
    if (earlyReturn !== undefined) {
      earlyReturn().catch(() => {
        /* c8 ignore next 1 */
        // ignore error
      });
    }
    throw error;
  }

  return containsPromise
    ? /* c8 ignore start */ Promise.all(completedResults)
    : /* c8 ignore stop */ completedResults;
}

/**
 * Complete a list value by completing each item in the list with the
 * inner type
 */
function completeListValue(
  exeContext: ExecutionContext,
  returnType: GraphQLList<GraphQLOutputType>,
  fieldGroup: FieldGroup,
  info: GraphQLResolveInfo,
  path: Path,
  result: unknown,
  incrementalContext: IncrementalContext | undefined,
): MaybePromise<ReadonlyArray<unknown>> {
  const itemType = returnType.ofType;

  if (isAsyncIterable(result)) {
    const asyncIterator = result[Symbol.asyncIterator]();

    return completeAsyncIteratorValue(
      exeContext,
      itemType,
      fieldGroup,
      info,
      path,
      asyncIterator,
      incrementalContext,
    );
  }

  if (!isIterableObject(result)) {
    throw createGraphQLError(
      `Expected Iterable, but did not find one for field "${info.parentType.name}.${info.fieldName}".`,
    );
  }

  return completeIterableValue(
    exeContext,
    itemType,
    fieldGroup,
    info,
    path,
    result,
    incrementalContext,
  );
}

function completeIterableValue(
  exeContext: ExecutionContext,
  itemType: GraphQLOutputType,
  fieldGroup: FieldGroup,
  info: GraphQLResolveInfo,
  path: Path,
  items: Iterable<unknown>,
  incrementalContext: IncrementalContext | undefined,
): MaybePromise<ReadonlyArray<unknown>> {
  // This is specified as a simple map, however we're optimizing the path
  // where the list contains no Promises by avoiding creating another Promise.
  let containsPromise = false;
  const completedResults: Array<unknown> = [];
  let index = 0;
  const streamUsage = getStreamUsage(exeContext, fieldGroup, path);
  const iterator = items[Symbol.iterator]();
  let iteration = iterator.next();
  while (!iteration.done) {
    const item = iteration.value;

    if (streamUsage && index >= streamUsage.initialCount) {
      const streamRecord: StreamRecord = {
        label: streamUsage.label,
        path,
        index,
        streamItemQueue: buildSyncStreamItemQueue(
          item,
          index,
          path,
          iterator,
          exeContext,
          streamUsage.fieldGroup,
          info,
          itemType,
        ),
      };

      const context = incrementalContext ?? exeContext;
      addIncrementalDataRecords(context, [streamRecord]);
      break;
    }

    // No need to modify the info object containing the path,
    // since from here on it is not ever accessed by resolver functions.
    const itemPath = addPath(path, index, undefined);

    if (isPromise(item)) {
      completedResults.push(
        completePromisedListItemValue(
          item,
          exeContext,
          itemType,
          fieldGroup,
          info,
          itemPath,
          incrementalContext,
        ),
      );
      containsPromise = true;
    } else if (
      completeListItemValue(
        item,
        completedResults,
        exeContext,
        itemType,
        fieldGroup,
        info,
        itemPath,
        incrementalContext,
      )
    ) {
      containsPromise = true;
    }
    index++;

    iteration = iterator.next();
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
  exeContext: ExecutionContext,
  itemType: GraphQLOutputType,
  fieldGroup: FieldGroup,
  info: GraphQLResolveInfo,
  itemPath: Path,
  incrementalContext: IncrementalContext | undefined,
): boolean {
  try {
    const completedItem = completeValue(
      exeContext,
      itemType,
      fieldGroup,
      info,
      itemPath,
      item,
      incrementalContext,
    );

    if (isPromise(completedItem)) {
      // Note: we don't rely on a `catch` method, but we do expect "thenable"
      // to take a second callback for the error case.
      completedResults.push(
        completedItem.then(undefined, rawError => {
          handleFieldError(
            rawError,
            exeContext,
            itemType,
            fieldGroup,
            itemPath,
            incrementalContext,
          );
          return null;
        }),
      );
      return true;
    }

    completedResults.push(completedItem);
  } catch (rawError) {
    handleFieldError(rawError, exeContext, itemType, fieldGroup, itemPath, incrementalContext);
    completedResults.push(null);
  }
  return false;
}

async function completePromisedListItemValue(
  item: unknown,
  exeContext: ExecutionContext,
  itemType: GraphQLOutputType,
  fieldGroup: FieldGroup,
  info: GraphQLResolveInfo,
  itemPath: Path,
  incrementalContext: IncrementalContext | undefined,
): Promise<unknown> {
  try {
    const resolved = await item;
    let completed = completeValue(
      exeContext,
      itemType,
      fieldGroup,
      info,
      itemPath,
      resolved,
      incrementalContext,
    );
    if (isPromise(completed)) {
      completed = await completed;
    }
    return completed;
  } catch (rawError) {
    handleFieldError(rawError, exeContext, itemType, fieldGroup, itemPath, incrementalContext);
    return null;
  }
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
  fieldGroup: FieldGroup,
  info: GraphQLResolveInfo,
  path: Path,
  result: unknown,
  incrementalContext: IncrementalContext | undefined,
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
          fieldGroup,
          info,
          result,
        ),
        fieldGroup,
        info,
        path,
        result,
        incrementalContext,
      ),
    );
  }

  return completeObjectValue(
    exeContext,
    ensureValidRuntimeType(runtimeType, exeContext, returnType, fieldGroup, info, result),
    fieldGroup,
    info,
    path,
    result,
    incrementalContext,
  );
}

function ensureValidRuntimeType(
  runtimeTypeName: unknown,
  exeContext: ExecutionContext,
  returnType: GraphQLAbstractType,
  fieldGroup: FieldGroup,
  info: GraphQLResolveInfo,
  result: unknown,
): GraphQLObjectType {
  if (runtimeTypeName == null) {
    throw createGraphQLError(
      `Abstract type "${returnType.name}" must resolve to an Object type at runtime for field "${info.parentType.name}.${info.fieldName}". Either the "${returnType.name}" type should provide a "resolveType" function or each possible type should provide an "isTypeOf" function.`,
      { nodes: toNodes(fieldGroup) },
    );
  }

  // releases before 16.0.0 supported returning `GraphQLObjectType` from `resolveType`
  // TODO: remove in 17.0.0 release
  if (isObjectType(runtimeTypeName)) {
    if (versionInfo.major >= 16) {
      throw createGraphQLError(
        'Support for returning GraphQLObjectType from resolveType was removed in graphql-js@16.0.0 please return type name instead.',
      );
    }
    runtimeTypeName = runtimeTypeName.name;
  }

  if (typeof runtimeTypeName !== 'string') {
    throw createGraphQLError(
      `Abstract type "${returnType.name}" must resolve to an Object type at runtime for field "${info.parentType.name}.${info.fieldName}" with ` +
        `value ${inspect(result)}, received "${inspect(runtimeTypeName)}".`,
    );
  }

  const runtimeType = exeContext.schema.getType(runtimeTypeName);
  if (runtimeType == null) {
    throw createGraphQLError(
      `Abstract type "${returnType.name}" was resolved to a type "${runtimeTypeName}" that does not exist inside the schema.`,
      { nodes: toNodes(fieldGroup) },
    );
  }

  if (!isObjectType(runtimeType)) {
    throw createGraphQLError(
      `Abstract type "${returnType.name}" was resolved to a non-object type "${runtimeTypeName}".`,
      { nodes: toNodes(fieldGroup) },
    );
  }

  if (!exeContext.schema.isSubType(returnType, runtimeType)) {
    throw createGraphQLError(
      `Runtime Object type "${runtimeType.name}" is not a possible type for "${returnType.name}".`,
      { nodes: toNodes(fieldGroup) },
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
  fieldGroup: FieldGroup,
  info: GraphQLResolveInfo,
  path: Path,
  result: unknown,
  incrementalContext: IncrementalContext | undefined,
): MaybePromise<Record<string, unknown>> {
  // If there is an isTypeOf predicate function, call it with the
  // current result. If isTypeOf returns false, then raise an error rather
  // than continuing execution.
  if (returnType.isTypeOf) {
    const isTypeOf = returnType.isTypeOf(result, exeContext.contextValue, info);

    if (isPromise(isTypeOf)) {
      return isTypeOf.then(resolvedIsTypeOf => {
        if (!resolvedIsTypeOf) {
          throw invalidReturnTypeError(returnType, result, fieldGroup);
        }
        return collectAndExecuteSubfields(
          exeContext,
          returnType,
          fieldGroup,
          path,
          result,
          incrementalContext,
        );
      });
    }

    if (!isTypeOf) {
      throw invalidReturnTypeError(returnType, result, fieldGroup);
    }
  }

  return collectAndExecuteSubfields(
    exeContext,
    returnType,
    fieldGroup,
    path,
    result,
    incrementalContext,
  );
}

function invalidReturnTypeError(
  returnType: GraphQLObjectType,
  result: unknown,
  fieldGroup: FieldGroup,
): GraphQLError {
  return createGraphQLError(
    `Expected value of type "${returnType.name}" but got: ${inspect(result)}.`,
    { nodes: toNodes(fieldGroup) },
  );
}

function collectAndExecuteSubfields(
  exeContext: ExecutionContext,
  returnType: GraphQLObjectType,
  fieldGroup: FieldGroup,
  path: Path,
  result: unknown,
  incrementalContext: IncrementalContext | undefined,
): MaybePromise<Record<string, unknown>> {
  // Collect sub-fields to execute to complete this value.
  const originalGroupedFieldSet = collectSubfields(exeContext, returnType, fieldGroup, path);
  if (!exeContext.encounteredDefer && !originalGroupedFieldSet.encounteredDefer) {
    return executeFields(
      exeContext,
      returnType,
      result,
      path,
      originalGroupedFieldSet,
      incrementalContext,
    );
  }
  exeContext.encounteredDefer = true;
  const { groupedFieldSet, newGroupedFieldSets } = buildSubExecutionPlan(
    originalGroupedFieldSet,
    incrementalContext?.deferUsageSet,
    exeContext.deferWithoutDuplication,
  );

  const subFields = executeFields(
    exeContext,
    returnType,
    result,
    path,
    groupedFieldSet,
    incrementalContext,
  );

  if (newGroupedFieldSets.size > 0) {
    const newPendingExecutionGroups = collectExecutionGroups(
      exeContext,
      returnType,
      result,
      path,
      incrementalContext?.deferUsageSet,
      newGroupedFieldSets,
    );

    const context = incrementalContext ?? exeContext;
    addIncrementalDataRecords(context, newPendingExecutionGroups);
  }
  return subFields;
}

function buildSubExecutionPlan(
  originalGroupedFieldSet: GroupedFieldSet,
  deferUsageSet: DeferUsageSet | undefined,
  deferWithoutDuplication: boolean,
): ExecutionPlan {
  let executionPlan = (originalGroupedFieldSet as unknown as { _executionPlan: ExecutionPlan })
    ._executionPlan;
  if (executionPlan !== undefined) {
    return executionPlan;
  }
  executionPlan = deferWithoutDuplication
    ? buildExecutionPlan(originalGroupedFieldSet, deferUsageSet)
    : buildBranchingExecutionPlan(originalGroupedFieldSet, deferUsageSet);
  (originalGroupedFieldSet as unknown as { _executionPlan: ExecutionPlan })._executionPlan =
    executionPlan;
  return executionPlan;
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
  const promisedIsTypeOfResults = [];

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
  args: ExecutionArgs<TData, TVariables, TContext> & {
    errorOnSubscriptionWithIncrementalDelivery: true | undefined | null;
  },
): MaybePromise<
  AsyncGenerator<SingularExecutionResult<TData>, void, void> | SingularExecutionResult<TData>
>;
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
>;
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
    return {
      errors: exeContext.map(e => {
        Object.defineProperty(e, 'extensions', {
          value: {
            ...e.extensions,
            http: {
              ...e.extensions?.['http'],
              status: 400,
            },
          },
        });
        return e;
      }),
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
        return Promise.resolve({
          value: undefined,
          done,
        });
      }
      if (initialResultSent) {
        return subsequentIterator.next();
      }
      initialResultSent = true;
      return Promise.resolve({
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
      async (payload: unknown) =>
        ensureAsyncIterable(
          await executeOperation(buildPerEventExecutionContext(exeContext, payload)),
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
  return createGraphQLError(error.message, {
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
  const {
    schema,
    fragments,
    operation,
    variableValues,
    rootValue,
    errorOnSubscriptionWithIncrementalDelivery,
  } = exeContext;

  const rootType = schema.getSubscriptionType();
  if (rootType == null) {
    throw createGraphQLError('Schema is not configured to execute subscription operation.', {
      nodes: operation,
    });
  }

  const groupedFieldSet = collectFields(
    schema,
    fragments,
    variableValues,
    rootType,
    operation.selectionSet,
    errorOnSubscriptionWithIncrementalDelivery,
  );
  const firstRootField = [...groupedFieldSet.entries()][0] as [string, FieldGroup];
  const [responseName, fieldGroup] = firstRootField;
  const fieldName = fieldGroup[0].node.name.value;
  const fieldDef = getFieldDef(schema, rootType, fieldGroup[0].node);

  if (!fieldDef) {
    throw createGraphQLError(`The subscription field "${fieldName}" is not defined.`, {
      nodes: toNodes(fieldGroup),
    });
  }

  const path = addPath(undefined, responseName, rootType.name);
  const info = buildResolveInfo(exeContext, fieldDef, toNodes(fieldGroup), rootType, path);

  try {
    // Implements the "ResolveFieldEventStream" algorithm from GraphQL specification.
    // It differs from "ResolveFieldValue" due to providing a different `resolveFn`.

    // Build a JS object of arguments from the field.arguments AST, using the
    // variables scope to fulfill any variable references.
    const args = getArgumentValues(fieldDef, fieldGroup[0].node, variableValues);

    // The resolve function's optional third argument is a context value that
    // is provided to every resolve function within an execution. It is commonly
    // used to represent an authenticated user, or request-specific caches.
    const contextValue = exeContext.contextValue;

    // Call the `subscribe()` resolver or the default resolver to produce an
    // AsyncIterable yielding raw payloads.
    const resolveFn = fieldDef.subscribe ?? exeContext.subscribeFieldResolver;
    const result = resolveFn(rootValue, args, contextValue, info);

    if (isPromise(result)) {
      return result.then(assertEventStream).then(undefined, error => {
        throw locatedError(error, toNodes(fieldGroup), pathToArray(path));
      });
    }

    return assertEventStream(result, exeContext.signal);
  } catch (error) {
    throw locatedError(error, toNodes(fieldGroup), pathToArray(path));
  }
}

function assertEventStream(result: unknown, signal?: AbortSignal): AsyncIterable<unknown> {
  if (result instanceof Error) {
    throw result;
  }

  // Assert field returned an event stream, otherwise yield an error.
  if (!isAsyncIterable(result)) {
    throw createGraphQLError(
      'Subscription field must return Async Iterable. ' + `Received: ${inspect(result)}.`,
    );
  }
  return {
    [Symbol.asyncIterator]() {
      const asyncIterator = result[Symbol.asyncIterator]();
      signal?.addEventListener('abort', () => {
        asyncIterator.return?.();
      });
      return asyncIterator;
    },
  };
}

function collectExecutionGroups(
  exeContext: ExecutionContext,
  parentType: GraphQLObjectType,
  sourceValue: unknown,
  path: Path | undefined,
  parentDeferUsages: DeferUsageSet | undefined,
  newGroupedFieldSets: Map<DeferUsageSet, GroupedFieldSet>,
): ReadonlyArray<PendingExecutionGroup> {
  const newPendingExecutionGroups: Array<PendingExecutionGroup> = [];

  for (const [deferUsageSet, groupedFieldSet] of newGroupedFieldSets) {
    const pendingExecutionGroup: PendingExecutionGroup = {
      deferUsages: deferUsageSet,
      path,
      result: undefined as unknown as BoxedPromiseOrValue<CompletedExecutionGroup>,
    };

    const executor = () =>
      executeExecutionGroup(
        pendingExecutionGroup,
        exeContext,
        parentType,
        sourceValue,
        path,
        groupedFieldSet,
        {
          errors: undefined,
          deferUsageSet,
          incrementalDataRecords: undefined,
        },
      );

    if (exeContext.enableEarlyExecution) {
      pendingExecutionGroup.result = new BoxedPromiseOrValue(
        shouldDefer(parentDeferUsages, deferUsageSet)
          ? Promise.resolve().then(executor)
          : executor(),
      );
    } else {
      pendingExecutionGroup.result = () => new BoxedPromiseOrValue(executor());
      const resolveThunk = () => {
        const maybeThunk = pendingExecutionGroup.result;
        if (!(maybeThunk instanceof BoxedPromiseOrValue)) {
          pendingExecutionGroup.result = maybeThunk();
        }
      };
      let deferredFragmentFactory = exeContext.deferredFragmentFactory;
      if (deferredFragmentFactory === undefined) {
        exeContext.deferredFragmentFactory = deferredFragmentFactory =
          new DeferredFragmentFactory();
      }
      for (const deferUsage of deferUsageSet) {
        const deferredFragmentRecord = deferredFragmentFactory.get(deferUsage, path);
        deferredFragmentRecord.onPending(resolveThunk);
      }
    }

    newPendingExecutionGroups.push(pendingExecutionGroup);
  }

  return newPendingExecutionGroups;
}

function shouldDefer(
  parentDeferUsages: undefined | DeferUsageSet,
  deferUsages: DeferUsageSet,
): boolean {
  // If we have a new child defer usage, defer.
  // Otherwise, this defer usage was already deferred when it was initially
  // encountered, and is now in the midst of executing early, so the new
  // deferred grouped fields set can be executed immediately.
  return (
    parentDeferUsages === undefined ||
    !Array.from(deferUsages).every(deferUsage => parentDeferUsages.has(deferUsage))
  );
}

function executeExecutionGroup(
  pendingExecutionGroup: PendingExecutionGroup,
  exeContext: ExecutionContext,
  parentType: GraphQLObjectType,
  sourceValue: unknown,
  path: Path | undefined,
  groupedFieldSet: GroupedFieldSet,
  incrementalContext: IncrementalContext,
): MaybePromise<CompletedExecutionGroup> {
  let result;
  try {
    result = executeFields(
      exeContext,
      parentType,
      sourceValue,
      path,
      groupedFieldSet,
      incrementalContext,
    );
  } catch (error: any) {
    return {
      pendingExecutionGroup,
      path: pathToArray(path),
      errors: withError(incrementalContext.errors, error),
    };
  }

  if (isPromise(result)) {
    return result.then(
      resolved =>
        buildCompletedExecutionGroup(incrementalContext, pendingExecutionGroup, path, resolved),
      error => ({
        pendingExecutionGroup,
        path: pathToArray(path),
        errors: withError(incrementalContext.errors, error),
      }),
    );
  }

  return buildCompletedExecutionGroup(incrementalContext, pendingExecutionGroup, path, result);
}

function buildCompletedExecutionGroup(
  incrementalContext: IncrementalContext,
  pendingExecutionGroup: PendingExecutionGroup,
  path: Path | undefined,
  data: Record<string, unknown>,
): CompletedExecutionGroup {
  const { errors, incrementalDataRecords } = incrementalContext;
  if (incrementalDataRecords === undefined) {
    return {
      pendingExecutionGroup,
      path: pathToArray(path),
      result: errors === undefined ? { data } : { data, errors: [...flattenErrors(errors)] },
      incrementalDataRecords,
    };
  }

  if (errors === undefined) {
    return {
      pendingExecutionGroup,
      path: pathToArray(path),
      result: { data },
      incrementalDataRecords,
    };
  }

  return {
    pendingExecutionGroup,
    path: pathToArray(path),
    result: { data, errors: [...flattenErrors(errors)] },
    incrementalDataRecords: filterIncrementalDataRecords(path, errors, incrementalDataRecords),
  };
}

function buildSyncStreamItemQueue(
  initialItem: MaybePromise<unknown>,
  initialIndex: number,
  streamPath: Path,
  iterator: Iterator<unknown>,
  exeContext: ExecutionContext,
  fieldGroup: FieldGroup,
  info: GraphQLResolveInfo,
  itemType: GraphQLOutputType,
): Array<StreamItemRecord> {
  const streamItemQueue: Array<StreamItemRecord> = [];

  const enableEarlyExecution = exeContext.enableEarlyExecution;

  const firstExecutor = () => {
    const initialPath = addPath(streamPath, initialIndex, undefined);
    const firstStreamItem = new BoxedPromiseOrValue(
      completeStreamItem(
        streamPath,
        initialPath,
        initialItem,
        exeContext,
        { errors: undefined, incrementalDataRecords: undefined },
        fieldGroup,
        info,
        itemType,
      ),
    );

    let iteration = iterator.next();
    let currentIndex = initialIndex + 1;
    let currentStreamItem:
      | BoxedPromiseOrValue<StreamItemResult>
      | (() => BoxedPromiseOrValue<StreamItemResult>) = firstStreamItem;
    while (!iteration.done) {
      // TODO: add test case for early sync termination
      /* c8 ignore next 6 */
      if (currentStreamItem instanceof BoxedPromiseOrValue) {
        const result = currentStreamItem.value;
        if (!isPromise(result) && result.errors !== undefined) {
          break;
        }
      }

      const itemPath = addPath(streamPath, currentIndex, undefined);

      const value = iteration.value;

      const currentExecutor = () =>
        completeStreamItem(
          streamPath,
          itemPath,
          value,
          exeContext,
          { errors: undefined, incrementalDataRecords: undefined },
          fieldGroup,
          info,
          itemType,
        );

      currentStreamItem = enableEarlyExecution
        ? new BoxedPromiseOrValue(currentExecutor())
        : () => new BoxedPromiseOrValue(currentExecutor());

      streamItemQueue.push(currentStreamItem);

      iteration = iterator.next();
      currentIndex = initialIndex + 1;
    }

    streamItemQueue.push(new BoxedPromiseOrValue({ path: streamPath }));

    return firstStreamItem.value;
  };

  streamItemQueue.push(
    enableEarlyExecution
      ? new BoxedPromiseOrValue(Promise.resolve().then(firstExecutor))
      : () => new BoxedPromiseOrValue(firstExecutor()),
  );

  return streamItemQueue;
}

function buildAsyncStreamItemQueue(
  initialIndex: number,
  streamPath: Path,
  asyncIterator: AsyncIterator<unknown>,
  exeContext: ExecutionContext,
  fieldGroup: FieldGroup,
  info: GraphQLResolveInfo,
  itemType: GraphQLOutputType,
): Array<StreamItemRecord> {
  const streamItemQueue: Array<StreamItemRecord> = [];
  const executor = () =>
    getNextAsyncStreamItemResult(
      streamItemQueue,
      streamPath,
      initialIndex,
      asyncIterator,
      exeContext,
      fieldGroup,
      info,
      itemType,
    );

  streamItemQueue.push(
    exeContext.enableEarlyExecution
      ? new BoxedPromiseOrValue(executor())
      : () => new BoxedPromiseOrValue(executor()),
  );

  return streamItemQueue;
}

async function getNextAsyncStreamItemResult(
  streamItemQueue: Array<StreamItemRecord>,
  streamPath: Path,
  index: number,
  asyncIterator: AsyncIterator<unknown>,
  exeContext: ExecutionContext,
  fieldGroup: FieldGroup,
  info: GraphQLResolveInfo,
  itemType: GraphQLOutputType,
): Promise<StreamItemResult> {
  let iteration;
  try {
    iteration = await asyncIterator.next();
  } catch (error) {
    return {
      path: streamPath,
      errors: [locatedError(coerceError(error), toNodes(fieldGroup), pathToArray(streamPath))],
    };
  }

  if (iteration.done) {
    return { path: streamPath };
  }

  const itemPath = addPath(streamPath, index, undefined);

  const result = completeStreamItem(
    streamPath,
    itemPath,
    iteration.value,
    exeContext,
    { errors: undefined, incrementalDataRecords: undefined },
    fieldGroup,
    info,
    itemType,
  );

  const executor = () =>
    getNextAsyncStreamItemResult(
      streamItemQueue,
      streamPath,
      index,
      asyncIterator,
      exeContext,
      fieldGroup,
      info,
      itemType,
    );

  streamItemQueue.push(
    exeContext.enableEarlyExecution
      ? new BoxedPromiseOrValue(executor())
      : () => new BoxedPromiseOrValue(executor()),
  );

  return result;
}

function completeStreamItem(
  streamPath: Path,
  itemPath: Path,
  item: unknown,
  exeContext: ExecutionContext,
  incrementalContext: IncrementalContext,
  fieldGroup: FieldGroup,
  info: GraphQLResolveInfo,
  itemType: GraphQLOutputType,
): MaybePromise<StreamItemResult> {
  if (isPromise(item)) {
    return completePromisedValue(
      exeContext,
      itemType,
      fieldGroup,
      info,
      itemPath,
      item,
      incrementalContext,
    ).then(
      resolvedItem => buildStreamItemResult(incrementalContext, streamPath, resolvedItem),
      error => ({
        path: streamPath,
        errors: withError(incrementalContext.errors, error),
      }),
    );
  }

  let result: MaybePromise<unknown>;
  try {
    try {
      result = completeValue(
        exeContext,
        itemType,
        fieldGroup,
        info,
        itemPath,
        item,
        incrementalContext,
      );
    } catch (rawError) {
      handleFieldError(rawError, exeContext, itemType, fieldGroup, itemPath, incrementalContext);
      result = null;
    }
  } catch (error: any) {
    return {
      path: streamPath,
      errors: withError(incrementalContext.errors, error),
    };
  }

  if (isPromise(result)) {
    return result
      .then(undefined, rawError => {
        handleFieldError(rawError, exeContext, itemType, fieldGroup, itemPath, incrementalContext);
        return null;
      })
      .then(
        resolvedItem => buildStreamItemResult(incrementalContext, streamPath, resolvedItem),
        error => ({
          path: streamPath,
          errors: withError(incrementalContext.errors, error),
        }),
      );
  }

  return buildStreamItemResult(incrementalContext, streamPath, result);
}

function buildStreamItemResult(
  incrementalContext: IncrementalContext,
  streamPath: Path,
  item: unknown,
): StreamItemResult {
  const { errors, incrementalDataRecords } = incrementalContext;
  if (incrementalDataRecords === undefined) {
    return {
      path: streamPath,
      item,
      errors: errors === undefined ? undefined : [...flattenErrors(errors)],
      incrementalDataRecords,
    };
  }

  if (errors === undefined) {
    return {
      path: streamPath,
      item,
      errors,
      incrementalDataRecords,
    };
  }

  return {
    path: streamPath,
    item,
    errors: [...flattenErrors(errors)],
    incrementalDataRecords: filterIncrementalDataRecords(
      streamPath,
      errors,
      incrementalDataRecords,
    ),
  };
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
