import {
  GraphQLFormattedError,
  locatedError,
  FieldNode,
  FragmentDefinitionNode,
  OperationDefinitionNode,
  Kind,
  GraphQLAbstractType,
  GraphQLField,
  GraphQLFieldResolver,
  GraphQLLeafType,
  GraphQLList,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLResolveInfo,
  GraphQLTypeResolver,
  isAbstractType,
  isLeafType,
  isListType,
  isNonNullType,
  isObjectType,
  assertValidSchema,
  GraphQLSchema,
  getDirectiveValues,
  SchemaMetaFieldDef,
  TypeMetaFieldDef,
  TypeNameMetaFieldDef,
} from 'graphql';
import type { GraphQLError } from 'graphql';
import {
  createGraphQLError,
  inspect,
  isAsyncIterable,
  isIterableObject,
  isObjectLike,
  isPromise,
  Path,
  pathToArray,
  addPath,
  getArgumentValues,
  promiseReduce,
  Maybe,
  memoize3,
  getDefinedRootType,
  MaybePromise,
  mapAsyncIterator,
  GraphQLStreamDirective,
  collectFields,
  collectSubFields as _collectSubfields,
} from '@graphql-tools/utils';
import { getVariableValues } from './values.js';
import { promiseForObject } from './promiseForObject.js';
import { flattenAsyncIterable } from './flattenAsyncIterable.js';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { invariant } from './invariant.js';
import { ValueOrPromise } from 'value-or-promise';

export interface SingularExecutionResult<TData = any, TExtensions = any> {
  errors?: ReadonlyArray<GraphQLError>;
  data?: TData | null;
  extensions?: TExtensions;
}

/**
 * A memoized collection of relevant subfields with regard to the return
 * type. Memoizing ensures the subfields are not repeatedly calculated, which
 * saves overhead when resolving lists of values.
 */
const collectSubfields = memoize3(
  (exeContext: ExecutionContext, returnType: GraphQLObjectType, fieldNodes: Array<FieldNode>) =>
    _collectSubfields(exeContext.schema, exeContext.fragments, exeContext.variableValues, returnType, fieldNodes)
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
  errors: Array<GraphQLError>;
  subsequentPayloads: Set<AsyncPayloadRecord>;
}

export interface FormattedExecutionResult<TData = Record<string, unknown>, TExtensions = Record<string, unknown>> {
  errors?: ReadonlyArray<GraphQLFormattedError>;
  data?: TData | null;
  extensions?: TExtensions;
}

export interface IncrementalExecutionResults<TData = Record<string, unknown>, TExtensions = Record<string, unknown>> {
  initialResult: InitialIncrementalExecutionResult<TData, TExtensions>;
  subsequentResults: AsyncGenerator<SubsequentIncrementalExecutionResult<TData, TExtensions>, void, void>;
}

export interface InitialIncrementalExecutionResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>
> extends SingularExecutionResult<TData, TExtensions> {
  hasNext: boolean;
  incremental?: ReadonlyArray<IncrementalResult<TData, TExtensions>>;
  extensions?: TExtensions;
}

export interface FormattedInitialIncrementalExecutionResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>
> extends FormattedExecutionResult<TData, TExtensions> {
  hasNext: boolean;
  incremental?: ReadonlyArray<FormattedIncrementalResult<TData, TExtensions>>;
  extensions?: TExtensions;
}

export interface SubsequentIncrementalExecutionResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>
> {
  hasNext: boolean;
  incremental?: ReadonlyArray<IncrementalResult<TData, TExtensions>>;
  extensions?: TExtensions;
}

export interface FormattedSubsequentIncrementalExecutionResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>
> {
  hasNext: boolean;
  incremental?: ReadonlyArray<FormattedIncrementalResult<TData, TExtensions>>;
  extensions?: TExtensions;
}

export interface IncrementalDeferResult<TData = Record<string, unknown>, TExtensions = Record<string, unknown>>
  extends SingularExecutionResult<TData, TExtensions> {
  path?: ReadonlyArray<string | number>;
  label?: string;
}

export interface FormattedIncrementalDeferResult<TData = Record<string, unknown>, TExtensions = Record<string, unknown>>
  extends FormattedExecutionResult<TData, TExtensions> {
  path?: ReadonlyArray<string | number>;
  label?: string;
}

export interface IncrementalStreamResult<TData = Array<unknown>, TExtensions = Record<string, unknown>> {
  errors?: ReadonlyArray<GraphQLError>;
  items?: TData | null;
  path?: ReadonlyArray<string | number>;
  label?: string;
  extensions?: TExtensions;
}

export interface FormattedIncrementalStreamResult<TData = Array<unknown>, TExtensions = Record<string, unknown>> {
  errors?: ReadonlyArray<GraphQLFormattedError>;
  items?: TData | null;
  path?: ReadonlyArray<string | number>;
  label?: string;
  extensions?: TExtensions;
}

export type IncrementalResult<TData = Record<string, unknown>, TExtensions = Record<string, unknown>> =
  | IncrementalDeferResult<TData, TExtensions>
  | IncrementalStreamResult<TData, TExtensions>;

export type FormattedIncrementalResult<TData = Record<string, unknown>, TExtensions = Record<string, unknown>> =
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
  args: ExecutionArgs<TData, TVariables, TContext>
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

  return executeImpl(exeContext);
}

function executeImpl<TData = any, TVariables = any, TContext = any>(
  exeContext: ExecutionContext<TVariables, TContext>
): MaybePromise<SingularExecutionResult<TData> | IncrementalExecutionResults<TData>> {
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
  return new ValueOrPromise(() => executeOperation<TData, TVariables, TContext>(exeContext))
    .then(
      data => {
        const initialResult = buildResponse(data, exeContext.errors);
        if (exeContext.subsequentPayloads.size > 0) {
          return {
            initialResult: {
              ...initialResult,
              hasNext: true,
            },
            subsequentResults: yieldSubsequentPayloads(exeContext),
          };
        }
        return initialResult;
      },
      (error: any) => {
        exeContext.errors.push(error);
        return buildResponse<TData>(null, exeContext.errors);
      }
    )
    .resolve()!;
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
function buildResponse<TData>(data: TData | null, errors: ReadonlyArray<GraphQLError>): SingularExecutionResult<TData> {
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
  rawVariableValues: Maybe<TVariables>
): void {
  console.assert(!!document, 'Must provide document.');

  // If the schema used for execution is invalid, throw an error.
  assertValidSchema(schema);

  // Variables, if provided, must be an object.
  console.assert(
    rawVariableValues == null || isObjectLike(rawVariableValues),
    'Variables must be provided as an Object where each property is a variable value. Perhaps look to see if an unparsed JSON string was provided.'
  );
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
  args: ExecutionArgs<TData, TVariables, TContext>
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
  } = args;

  // If the schema used for execution is invalid, throw an error.
  assertValidSchema(schema);

  let operation: OperationDefinitionNode | undefined;
  const fragments: Record<string, FragmentDefinitionNode> = Object.create(null);
  for (const definition of document.definitions) {
    switch (definition.kind) {
      case Kind.OPERATION_DEFINITION:
        if (operationName == null) {
          if (operation !== undefined) {
            return [createGraphQLError('Must provide operation name if query contains multiple operations.')];
          }
          operation = definition;
        } else if (definition.name?.value === operationName) {
          operation = definition;
        }
        break;
      case Kind.FRAGMENT_DEFINITION:
        fragments[definition.name.value] = definition;
        break;
      default:
      // ignore non-executable definitions
    }
  }

  if (!operation) {
    if (operationName != null) {
      return [createGraphQLError(`Unknown operation named "${operationName}".`)];
    }
    return [createGraphQLError('Must provide an operation.')];
  }

  // FIXME: https://github.com/graphql/graphql-js/issues/2203
  /* c8 ignore next */
  const variableDefinitions = operation.variableDefinitions ?? [];

  const coercedVariableValues = getVariableValues(schema, variableDefinitions, rawVariableValues ?? {}, {
    maxErrors: 50,
  });

  if (coercedVariableValues.errors) {
    return coercedVariableValues.errors;
  }

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
    subsequentPayloads: new Set(),
    errors: [],
  };
}

function buildPerEventExecutionContext(exeContext: ExecutionContext, payload: unknown): ExecutionContext {
  return {
    ...exeContext,
    rootValue: payload,
    subsequentPayloads: new Set(),
    errors: [],
  };
}

/**
 * Implements the "Executing operations" section of the spec.
 */
function executeOperation<TData = any, TVariables = any, TContext = any>(
  exeContext: ExecutionContext<TVariables, TContext>
): MaybePromise<TData> {
  const { operation, schema, fragments, variableValues, rootValue } = exeContext;
  const rootType = getDefinedRootType(schema, operation.operation, [operation]);
  if (rootType == null) {
    createGraphQLError(`Schema is not configured to execute ${operation.operation} operation.`, {
      nodes: operation,
    });
  }

  const { fields: rootFields, patches } = collectFields(
    schema,
    fragments,
    variableValues,
    rootType,
    operation.selectionSet
  );
  const path = undefined;
  let result: MaybePromise<TData>;

  if (operation.operation === 'mutation') {
    result = executeFieldsSerially(exeContext, rootType, rootValue, path, rootFields);
  } else {
    result = executeFields(exeContext, rootType, rootValue, path, rootFields) as TData;
  }

  for (const patch of patches) {
    const { label, fields: patchFields } = patch;
    executeDeferredFragment(exeContext, rootType, rootValue, patchFields, label, path);
  }

  return result;
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
  fields: Map<string, Array<FieldNode>>
): MaybePromise<TData> {
  return promiseReduce(
    fields,
    (results, [responseName, fieldNodes]) => {
      const fieldPath = addPath(path, responseName, parentType.name);
      return new ValueOrPromise(() => executeField(exeContext, parentType, sourceValue, fieldNodes, fieldPath))
        .then(result => {
          if (result === undefined) {
            return results;
          }

          results[responseName] = result;
          return results;
        })
        .resolve();
    },
    Object.create(null)
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
  asyncPayloadRecord?: AsyncPayloadRecord
): MaybePromise<Record<string, unknown>> {
  const results = Object.create(null);
  let containsPromise = false;

  try {
    for (const [responseName, fieldNodes] of fields) {
      const fieldPath = addPath(path, responseName, parentType.name);
      const result = executeField(exeContext, parentType, sourceValue, fieldNodes, fieldPath, asyncPayloadRecord);

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
      return promiseForObject(results).finally(() => {
        throw error;
      });
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
  return promiseForObject(results);
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
  asyncPayloadRecord?: AsyncPayloadRecord
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
    // Build a JS object of arguments from the field.arguments AST, using the
    // variables scope to fulfill any variable references.
    // TODO: find a way to memoize, in case this field is within a List type.
    const args = getArgumentValues(fieldDef, fieldNodes[0], exeContext.variableValues);

    // The resolve function's optional third argument is a context value that
    // is provided to every resolve function within an execution. It is commonly
    // used to represent an authenticated user, or request-specific caches.
    const contextValue = exeContext.contextValue;

    const result = resolveFn(source, args, contextValue, info);

    let completed;
    if (isPromise(result)) {
      completed = result.then(resolved =>
        completeValue(exeContext, returnType, fieldNodes, info, path, resolved, asyncPayloadRecord)
      );
    } else {
      completed = completeValue(exeContext, returnType, fieldNodes, info, path, result, asyncPayloadRecord);
    }

    if (isPromise(completed)) {
      // Note: we don't rely on a `catch` method, but we do expect "thenable"
      // to take a second callback for the error case.
      return completed.then(undefined, rawError => {
        const error = locatedError(rawError, fieldNodes, pathToArray(path));
        const handledError = handleFieldError(error, returnType, errors);
        filterSubsequentPayloads(exeContext, path, asyncPayloadRecord);
        return handledError;
      });
    }
    return completed;
  } catch (rawError) {
    const error = locatedError(rawError, fieldNodes, pathToArray(path));
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
  path: Path
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

function handleFieldError(error: GraphQLError, returnType: GraphQLOutputType, errors: Array<GraphQLError>): null {
  // If the field type is non-nullable, then it is resolved without any
  // protection from errors, however it still properly locates the error.
  if (isNonNullType(returnType)) {
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
  asyncPayloadRecord?: AsyncPayloadRecord
): MaybePromise<unknown> {
  // If result is an Error, throw a located error.
  if (result instanceof Error) {
    throw result;
  }

  // If field type is NonNull, complete for inner type, and throw field error
  // if result is null.
  if (isNonNullType(returnType)) {
    const completed = completeValue(exeContext, returnType.ofType, fieldNodes, info, path, result, asyncPayloadRecord);
    if (completed === null) {
      throw new Error(`Cannot return null for non-nullable field ${info.parentType.name}.${info.fieldName}.`);
    }
    return completed;
  }

  // If result value is null or undefined then return null.
  if (result == null) {
    return null;
  }

  // If field type is List, complete each item in the list with the inner type
  if (isListType(returnType)) {
    return completeListValue(exeContext, returnType, fieldNodes, info, path, result, asyncPayloadRecord);
  }

  // If field type is a leaf type, Scalar or Enum, serialize to a valid value,
  // returning null if serialization is not possible.
  if (isLeafType(returnType)) {
    return completeLeafValue(returnType, result);
  }

  // If field type is an abstract type, Interface or Union, determine the
  // runtime Object type and complete for that type.
  if (isAbstractType(returnType)) {
    return completeAbstractValue(exeContext, returnType, fieldNodes, info, path, result, asyncPayloadRecord);
  }

  // If field type is Object, execute and complete all sub-selections.
  if (isObjectType(returnType)) {
    return completeObjectValue(exeContext, returnType, fieldNodes, info, path, result, asyncPayloadRecord);
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
  path: Path
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
  const stream = getDirectiveValues(GraphQLStreamDirective, fieldNodes[0], exeContext.variableValues) as {
    initialCount: number;
    label: string;
  };

  if (!stream) {
    return;
  }

  if (stream['if'] === false) {
    return;
  }

  invariant(typeof stream['initialCount'] === 'number', 'initialCount must be a number');

  invariant(stream['initialCount'] >= 0, 'initialCount must be a positive integer');

  return {
    initialCount: stream['initialCount'],
    label: typeof stream['label'] === 'string' ? stream['label'] : undefined,
  };
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
  asyncPayloadRecord?: AsyncPayloadRecord
): Promise<ReadonlyArray<unknown>> {
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
        asyncPayloadRecord
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
      const error = locatedError(rawError, fieldNodes, pathToArray(itemPath));
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
        asyncPayloadRecord
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
  asyncPayloadRecord?: AsyncPayloadRecord
): MaybePromise<ReadonlyArray<unknown>> {
  const itemType = returnType.ofType;
  const errors = asyncPayloadRecord?.errors ?? exeContext.errors;

  if (isAsyncIterable(result)) {
    const iterator = result[Symbol.asyncIterator]();

    return completeAsyncIteratorValue(exeContext, itemType, fieldNodes, info, path, iterator, asyncPayloadRecord);
  }

  if (!isIterableObject(result)) {
    throw createGraphQLError(
      `Expected Iterable, but did not find one for field "${info.parentType.name}.${info.fieldName}".`
    );
  }

  const stream = getStreamValues(exeContext, fieldNodes, path);

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
      previousAsyncPayloadRecord = executeStreamField(
        path,
        itemPath,
        item,
        exeContext,
        fieldNodes,
        info,
        itemType,
        stream.label,
        previousAsyncPayloadRecord
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
        asyncPayloadRecord
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
  asyncPayloadRecord?: AsyncPayloadRecord
): boolean {
  try {
    let completedItem;
    if (isPromise(item)) {
      completedItem = item.then(resolved =>
        completeValue(exeContext, itemType, fieldNodes, info, itemPath, resolved, asyncPayloadRecord)
      );
    } else {
      completedItem = completeValue(exeContext, itemType, fieldNodes, info, itemPath, item, asyncPayloadRecord);
    }

    if (isPromise(completedItem)) {
      // Note: we don't rely on a `catch` method, but we do expect "thenable"
      // to take a second callback for the error case.
      completedResults.push(
        completedItem.then(undefined, rawError => {
          const error = locatedError(rawError, fieldNodes, pathToArray(itemPath));
          const handledError = handleFieldError(error, itemType, errors);
          filterSubsequentPayloads(exeContext, itemPath, asyncPayloadRecord);
          return handledError;
        })
      );

      return true;
    }

    completedResults.push(completedItem);
  } catch (rawError) {
    const error = locatedError(rawError, fieldNodes, pathToArray(itemPath));
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
  const serializedResult = returnType.serialize(result);
  if (serializedResult == null) {
    throw new Error(
      `Expected \`${inspect(returnType)}.serialize(${inspect(result)})\` to ` +
        `return non-nullable value, returned: ${inspect(serializedResult)}`
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
  asyncPayloadRecord?: AsyncPayloadRecord
): MaybePromise<Record<string, unknown>> {
  const resolveTypeFn = returnType.resolveType ?? exeContext.typeResolver;
  const contextValue = exeContext.contextValue;
  const runtimeType = resolveTypeFn(result, contextValue, info, returnType);

  if (isPromise(runtimeType)) {
    return runtimeType.then(resolvedRuntimeType =>
      completeObjectValue(
        exeContext,
        ensureValidRuntimeType(resolvedRuntimeType, exeContext, returnType, fieldNodes, info, result),
        fieldNodes,
        info,
        path,
        result,
        asyncPayloadRecord
      )
    );
  }

  return completeObjectValue(
    exeContext,
    ensureValidRuntimeType(runtimeType, exeContext, returnType, fieldNodes, info, result),
    fieldNodes,
    info,
    path,
    result,
    asyncPayloadRecord
  );
}

function ensureValidRuntimeType(
  runtimeTypeName: unknown,
  exeContext: ExecutionContext,
  returnType: GraphQLAbstractType,
  fieldNodes: Array<FieldNode>,
  info: GraphQLResolveInfo,
  result: unknown
): GraphQLObjectType {
  if (runtimeTypeName == null) {
    throw createGraphQLError(
      `Abstract type "${returnType.name}" must resolve to an Object type at runtime for field "${info.parentType.name}.${info.fieldName}". Either the "${returnType.name}" type should provide a "resolveType" function or each possible type should provide an "isTypeOf" function.`,
      { nodes: fieldNodes }
    );
  }

  // releases before 16.0.0 supported returning `GraphQLObjectType` from `resolveType`
  // TODO: remove in 17.0.0 release
  if (isObjectType(runtimeTypeName)) {
    throw createGraphQLError(
      'Support for returning GraphQLObjectType from resolveType was removed in graphql-js@16.0.0 please return type name instead.'
    );
  }

  if (typeof runtimeTypeName !== 'string') {
    throw createGraphQLError(
      `Abstract type "${returnType.name}" must resolve to an Object type at runtime for field "${info.parentType.name}.${info.fieldName}" with ` +
        `value ${inspect(result)}, received "${inspect(runtimeTypeName)}".`
    );
  }

  const runtimeType = exeContext.schema.getType(runtimeTypeName);
  if (runtimeType == null) {
    throw createGraphQLError(
      `Abstract type "${returnType.name}" was resolved to a type "${runtimeTypeName}" that does not exist inside the schema.`,
      { nodes: fieldNodes }
    );
  }

  if (!isObjectType(runtimeType)) {
    throw createGraphQLError(
      `Abstract type "${returnType.name}" was resolved to a non-object type "${runtimeTypeName}".`,
      { nodes: fieldNodes }
    );
  }

  if (!exeContext.schema.isSubType(returnType, runtimeType)) {
    throw createGraphQLError(
      `Runtime Object type "${runtimeType.name}" is not a possible type for "${returnType.name}".`,
      { nodes: fieldNodes }
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
  asyncPayloadRecord?: AsyncPayloadRecord
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
        return collectAndExecuteSubfields(exeContext, returnType, fieldNodes, path, result, asyncPayloadRecord);
      });
    }

    if (!isTypeOf) {
      throw invalidReturnTypeError(returnType, result, fieldNodes);
    }
  }

  return collectAndExecuteSubfields(exeContext, returnType, fieldNodes, path, result, asyncPayloadRecord);
}

function invalidReturnTypeError(
  returnType: GraphQLObjectType,
  result: unknown,
  fieldNodes: Array<FieldNode>
): GraphQLError {
  return createGraphQLError(`Expected value of type "${returnType.name}" but got: ${inspect(result)}.`, {
    nodes: fieldNodes,
  });
}

function collectAndExecuteSubfields(
  exeContext: ExecutionContext,
  returnType: GraphQLObjectType,
  fieldNodes: Array<FieldNode>,
  path: Path,
  result: unknown,
  asyncPayloadRecord?: AsyncPayloadRecord
): MaybePromise<Record<string, unknown>> {
  // Collect sub-fields to execute to complete this value.
  const { fields: subFieldNodes, patches: subPatches } = collectSubfields(exeContext, returnType, fieldNodes);

  const subFields = executeFields(exeContext, returnType, result, path, subFieldNodes, asyncPayloadRecord);

  for (const subPatch of subPatches) {
    const { label, fields: subPatchFieldNodes } = subPatch;
    executeDeferredFragment(exeContext, returnType, result, subPatchFieldNodes, label, path, asyncPayloadRecord);
  }

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
  abstractType
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
  info
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
  args: ExecutionArgs<TData, TVariables, TContext>
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
    return resultOrStream.then(resolvedResultOrStream => mapSourceToResponse(exeContext, resolvedResultOrStream));
  }

  return mapSourceToResponse(exeContext, resultOrStream);
}

export function flattenIncrementalResults<TData>(
  incrementalResults: IncrementalExecutionResults<TData>
): AsyncGenerator<SubsequentIncrementalExecutionResult<TData, Record<string, unknown>>, void, void> {
  const subsequentIterator = incrementalResults.subsequentResults;
  let initialResultSent = false;
  let done = false;
  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    async next() {
      if (done) {
        return {
          value: undefined,
          done,
        };
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
  someExecutionResult: SingularExecutionResult | IncrementalExecutionResults
): AsyncGenerator<
  SingularExecutionResult | InitialIncrementalExecutionResult | SubsequentIncrementalExecutionResult,
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
  resultOrStream: SingularExecutionResult | AsyncIterable<unknown>
): MaybePromise<
  | AsyncGenerator<
      SingularExecutionResult | InitialIncrementalExecutionResult | SubsequentIncrementalExecutionResult,
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
    mapAsyncIterator(resultOrStream[Symbol.asyncIterator](), async (payload: unknown) =>
      ensureAsyncIterable(await executeImpl(buildPerEventExecutionContext(exeContext, payload)))
    )
  );
}

/**
 * Implements the "CreateSourceEventStream" algorithm described in the
 * GraphQL specification, resolving the subscription source event stream.
 *
 * Returns a Promise which resolves to either an AsyncIterable (if successful)
 * or an ExecutionResult (error). The promise will be rejected if the schema or
 * other arguments to this function are invalid, or if the resolved event stream
 * is not an async iterable.
 *
 * If the client-provided arguments to this function do not result in a
 * compliant subscription, a GraphQL Response (ExecutionResult) with
 * descriptive errors and no data will be returned.
 *
 * If the the source stream could not be created due to faulty subscription
 * resolver logic or underlying systems, the promise will resolve to a single
 * ExecutionResult containing `errors` and no `data`.
 *
 * If the operation succeeded, the promise resolves to the AsyncIterable for the
 * event stream returned by the resolver.
 *
 * A Source Event Stream represents a sequence of events, each of which triggers
 * a GraphQL execution for that event.
 *
 * This may be useful when hosting the stateful subscription service in a
 * different process or machine than the stateless GraphQL execution engine,
 * or otherwise separating these two steps. For more on this, see the
 * "Supporting Subscriptions at Scale" information in the GraphQL specification.
 */
export function createSourceEventStream(
  args: ExecutionArgs
): MaybePromise<AsyncIterable<unknown> | SingularExecutionResult> {
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

  return createSourceEventStreamImpl(exeContext);
}

function createSourceEventStreamImpl(
  exeContext: ExecutionContext
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
    throw createGraphQLError('Schema is not configured to execute subscription operation.', { nodes: operation });
  }

  const { fields: rootFields } = collectFields(schema, fragments, variableValues, rootType, operation.selectionSet);
  const [responseName, fieldNodes] = [...rootFields.entries()][0];
  const fieldName = fieldNodes[0].name.value;
  const fieldDef = getFieldDef(schema, rootType, fieldNodes[0]);

  if (!fieldDef) {
    throw createGraphQLError(`The subscription field "${fieldName}" is not defined.`, { nodes: fieldNodes });
  }

  const path = addPath(undefined, responseName, rootType.name);
  const info = buildResolveInfo(exeContext, fieldDef, fieldNodes, rootType, path);

  try {
    // Implements the "ResolveFieldEventStream" algorithm from GraphQL specification.
    // It differs from "ResolveFieldValue" due to providing a different `resolveFn`.

    // Build a JS object of arguments from the field.arguments AST, using the
    // variables scope to fulfill any variable references.
    const args = getArgumentValues(fieldDef, fieldNodes[0], variableValues);

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
        throw locatedError(error, fieldNodes, pathToArray(path));
      });
    }

    return assertEventStream(result);
  } catch (error) {
    throw locatedError(error, fieldNodes, pathToArray(path));
  }
}

function assertEventStream(result: unknown): AsyncIterable<unknown> {
  if (result instanceof Error) {
    throw result;
  }

  // Assert field returned an event stream, otherwise yield an error.
  if (!isAsyncIterable(result)) {
    throw createGraphQLError('Subscription field must return Async Iterable. ' + `Received: ${inspect(result)}.`);
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
  parentContext?: AsyncPayloadRecord
): void {
  const asyncPayloadRecord = new DeferredFragmentRecord({
    label,
    path,
    parentContext,
    exeContext,
  });
  let promiseOrData;
  try {
    promiseOrData = executeFields(exeContext, parentType, sourceValue, path, fields, asyncPayloadRecord);

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
}

function executeStreamField(
  path: Path,
  itemPath: Path,
  item: MaybePromise<unknown>,
  exeContext: ExecutionContext,
  fieldNodes: Array<FieldNode>,
  info: GraphQLResolveInfo,
  itemType: GraphQLOutputType,
  label?: string,
  parentContext?: AsyncPayloadRecord
): AsyncPayloadRecord {
  const asyncPayloadRecord = new StreamRecord({
    label,
    path: itemPath,
    parentContext,
    exeContext,
  });
  let completedItem: MaybePromise<unknown>;
  try {
    try {
      if (isPromise(item)) {
        completedItem = item.then(resolved =>
          completeValue(exeContext, itemType, fieldNodes, info, itemPath, resolved, asyncPayloadRecord)
        );
      } else {
        completedItem = completeValue(exeContext, itemType, fieldNodes, info, itemPath, item, asyncPayloadRecord);
      }

      if (isPromise(completedItem)) {
        // Note: we don't rely on a `catch` method, but we do expect "thenable"
        // to take a second callback for the error case.
        completedItem = completedItem.then(undefined, rawError => {
          const error = locatedError(rawError, fieldNodes, pathToArray(itemPath));
          const handledError = handleFieldError(error, itemType, asyncPayloadRecord.errors);
          filterSubsequentPayloads(exeContext, itemPath, asyncPayloadRecord);
          return handledError;
        });
      }
    } catch (rawError) {
      const error = locatedError(rawError, fieldNodes, pathToArray(itemPath));
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
      }
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
  itemPath: Path
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
    const error = locatedError(rawError, fieldNodes, pathToArray(itemPath));
    const value = handleFieldError(error, itemType, asyncPayloadRecord.errors);
    // don't continue if iterator throws
    return { done: true, value };
  }
  let completedItem;
  try {
    completedItem = completeValue(exeContext, itemType, fieldNodes, info, itemPath, item, asyncPayloadRecord);

    if (isPromise(completedItem)) {
      completedItem = completedItem.then(undefined, rawError => {
        const error = locatedError(rawError, fieldNodes, pathToArray(itemPath));
        const handledError = handleFieldError(error, itemType, asyncPayloadRecord.errors);
        filterSubsequentPayloads(exeContext, itemPath, asyncPayloadRecord);
        return handledError;
      });
    }
    return { done: false, value: completedItem };
  } catch (rawError) {
    const error = locatedError(rawError, fieldNodes, pathToArray(itemPath));
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
  label?: string,
  parentContext?: AsyncPayloadRecord
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
    });

    let iteration;
    try {
      iteration = await executeStreamIteratorItem(
        iterator,
        exeContext,
        fieldNodes,
        info,
        itemType,
        asyncPayloadRecord,
        itemPath
      );
    } catch (error) {
      asyncPayloadRecord.errors.push(error as GraphQLError);
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
        }
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
  currentAsyncRecord: AsyncPayloadRecord | undefined
): void {
  const nullPathArray = pathToArray(nullPath);
  exeContext.subsequentPayloads.forEach(asyncRecord => {
    if (asyncRecord === currentAsyncRecord) {
      // don't remove payload from where error originates
      return;
    }
    for (let i = 0; i < nullPathArray.length; i++) {
      if (asyncRecord.path[i] !== nullPathArray[i]) {
        // asyncRecord points to a path unaffected by this payload
        return;
      }
    }
    // asyncRecord path points to nulled error field
    if (isStreamPayload(asyncRecord) && asyncRecord.iterator?.return) {
      asyncRecord.iterator.return().catch(() => {
        // ignore error
      });
    }
    exeContext.subsequentPayloads.delete(asyncRecord);
  });
}

function getCompletedIncrementalResults(exeContext: ExecutionContext): Array<IncrementalResult> {
  const incrementalResults: Array<IncrementalResult> = [];
  for (const asyncPayloadRecord of exeContext.subsequentPayloads) {
    const incrementalResult: IncrementalResult = {};
    if (!asyncPayloadRecord.isCompleted) {
      continue;
    }
    exeContext.subsequentPayloads.delete(asyncPayloadRecord);
    if (isStreamPayload(asyncPayloadRecord)) {
      const items = asyncPayloadRecord.items;
      if (asyncPayloadRecord.isCompletedIterator) {
        // async iterable resolver just finished but there may be pending payloads
        continue;
      }
      (incrementalResult as IncrementalStreamResult).items = items;
    } else {
      const data = asyncPayloadRecord.data;
      (incrementalResult as IncrementalDeferResult).data = data ?? null;
    }

    incrementalResult.path = asyncPayloadRecord.path;
    if (asyncPayloadRecord.label) {
      incrementalResult.label = asyncPayloadRecord.label;
    }
    if (asyncPayloadRecord.errors.length > 0) {
      incrementalResult.errors = asyncPayloadRecord.errors;
    }
    incrementalResults.push(incrementalResult);
  }
  return incrementalResults;
}

function yieldSubsequentPayloads(
  exeContext: ExecutionContext
): AsyncGenerator<SubsequentIncrementalExecutionResult, void, void> {
  let isDone = false;

  async function next(): Promise<IteratorResult<SubsequentIncrementalExecutionResult, void>> {
    if (isDone) {
      return { value: undefined, done: true };
    }

    await Promise.race(Array.from(exeContext.subsequentPayloads).map(p => p.promise));

    if (isDone) {
      // a different call to next has exhausted all payloads
      return { value: undefined, done: true };
    }

    const incremental = getCompletedIncrementalResults(exeContext);
    const hasNext = exeContext.subsequentPayloads.size > 0;

    if (!incremental.length && hasNext) {
      return next();
    }

    if (!hasNext) {
      isDone = true;
    }

    return {
      value: incremental.length ? { incremental, hasNext } : { hasNext },
      done: false,
    };
  }

  function returnStreamIterators() {
    const promises: Array<Promise<IteratorResult<unknown>>> = [];
    exeContext.subsequentPayloads.forEach(asyncPayloadRecord => {
      if (isStreamPayload(asyncPayloadRecord) && asyncPayloadRecord.iterator?.return) {
        promises.push(asyncPayloadRecord.iterator.return());
      }
    });
    return Promise.all(promises);
  }

  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    next,
    async return(): Promise<IteratorResult<SubsequentIncrementalExecutionResult, void>> {
      await returnStreamIterators();
      isDone = true;
      return { value: undefined, done: true };
    },
    async throw(error?: unknown): Promise<IteratorResult<SubsequentIncrementalExecutionResult, void>> {
      await returnStreamIterators();
      isDone = true;
      return Promise.reject(error);
    },
  };
}

class DeferredFragmentRecord {
  type: 'defer';
  errors: Array<GraphQLError>;
  label: string | undefined;
  path: Array<string | number>;
  promise: Promise<void>;
  data: Record<string, unknown> | null;
  parentContext: AsyncPayloadRecord | undefined;
  isCompleted: boolean;
  _exeContext: ExecutionContext;
  _resolve?: (arg: MaybePromise<Record<string, unknown> | null>) => void;
  constructor(opts: {
    label: string | undefined;
    path: Path | undefined;
    parentContext: AsyncPayloadRecord | undefined;
    exeContext: ExecutionContext;
  }) {
    this.type = 'defer';
    this.label = opts.label;
    this.path = pathToArray(opts.path);
    this.parentContext = opts.parentContext;
    this.errors = [];
    this._exeContext = opts.exeContext;
    this._exeContext.subsequentPayloads.add(this);
    this.isCompleted = false;
    this.data = null;
    this.promise = new Promise<Record<string, unknown> | null>(resolve => {
      this._resolve = MaybePromise => {
        resolve(MaybePromise);
      };
    }).then(data => {
      this.data = data;
      this.isCompleted = true;
    });
  }

  addData(data: MaybePromise<Record<string, unknown> | null>) {
    const parentData = this.parentContext?.promise;
    if (parentData) {
      this._resolve?.(parentData.then(() => data));
      return;
    }
    this._resolve?.(data);
  }
}

class StreamRecord {
  type: 'stream';
  errors: Array<GraphQLError>;
  label: string | undefined;
  path: Array<string | number>;
  items: Array<unknown> | null;
  promise: Promise<void>;
  parentContext: AsyncPayloadRecord | undefined;
  iterator: AsyncIterator<unknown> | undefined;
  isCompletedIterator?: boolean;
  isCompleted: boolean;
  _exeContext: ExecutionContext;
  _resolve?: (arg: MaybePromise<Array<unknown> | null>) => void;
  constructor(opts: {
    label: string | undefined;
    path: Path | undefined;
    iterator?: AsyncIterator<unknown>;
    parentContext: AsyncPayloadRecord | undefined;
    exeContext: ExecutionContext;
  }) {
    this.type = 'stream';
    this.items = null;
    this.label = opts.label;
    this.path = pathToArray(opts.path);
    this.parentContext = opts.parentContext;
    this.iterator = opts.iterator;
    this.errors = [];
    this._exeContext = opts.exeContext;
    this._exeContext.subsequentPayloads.add(this);
    this.isCompleted = false;
    this.items = null;
    this.promise = new Promise<Array<unknown> | null>(resolve => {
      this._resolve = MaybePromise => {
        resolve(MaybePromise);
      };
    }).then(items => {
      this.items = items;
      this.isCompleted = true;
    });
  }

  addItems(items: MaybePromise<Array<unknown> | null>) {
    const parentData = this.parentContext?.promise;
    if (parentData) {
      this._resolve?.(parentData.then(() => items));
      return;
    }
    this._resolve?.(items);
  }

  setIsCompletedIterator() {
    this.isCompletedIterator = true;
  }
}

type AsyncPayloadRecord = DeferredFragmentRecord | StreamRecord;

function isStreamPayload(asyncPayload: AsyncPayloadRecord): asyncPayload is StreamRecord {
  return asyncPayload.type === 'stream';
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
  fieldNode: FieldNode
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
  result: SingularExecutionResult<TData> | IncrementalExecutionResults<TData>
): result is IncrementalExecutionResults<TData> {
  return 'incremental' in result;
}
