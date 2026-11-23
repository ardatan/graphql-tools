import {
  assertValidSchema,
  defaultFieldResolver,
  defaultTypeResolver,
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  getArgumentValues,
  getVariableValues,
  GraphQLAbstractType,
  GraphQLError,
  GraphQLField,
  GraphQLLeafType,
  GraphQLList,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLSchema,
  isAbstractType,
  isLeafType,
  isListType,
  isNonNullType,
  isObjectType,
  Kind,
  OperationDefinitionNode,
  SchemaMetaFieldDef,
  SelectionSetNode,
  TypeMetaFieldDef,
  TypeNameMetaFieldDef,
} from 'graphql';
import {
  collectFields as _collectFields,
  collectSubFields as _collectSubfields,
  addPath,
  collectFieldsDependsOnVariables,
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
  memoize4,
  Path,
  pathToArray,
  promiseReduce,
  VariableValues,
  type FieldsAndPatches,
} from '@graphql-tools/utils';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { handleMaybePromise, isPromise, type MaybePromise } from '@whatwg-node/promise-helpers';
import { coerceError } from './coerceError.js';
import { CompactExecutionResultMap } from './compactExecutionResultMap.js';
import {
  compileConditionalSelectionSet,
  type ConditionalCollectProgram,
  type ConditionalFieldEntry,
} from './conditionalCollect.js';
import type {
  ExecutionArgs,
  ExecutionContext,
  ExecutionPlan,
  IncrementalExecutionResults,
  InitialIncrementalExecutionResult,
  SingularExecutionResult,
} from './executeTypes.js';
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
  type StreamGroup,
} from './incremental.js';
import {
  buildExecutionPlan,
  collectIncrementalFields,
  collectIncrementalSubfields,
  groupedFieldSetToFieldMap,
  rootDeferUsage,
  type DeferUsage,
  type DeferUsageSet,
  type GroupedFieldSet,
} from './incrementalCollect.js';
import { invariant } from './invariant.js';
import {
  compileExecutionPlan as compileInternalExecutionPlan,
  filterPlannedExecutions,
  getPlannedFieldPlan,
  getPlannedSubfieldExecutions,
  getPlannedSubfields,
  isExecutionPlan as isCompiledExecutionPlan,
  resolvePlanForExecute,
  type ArgumentReader,
  type CompileExecutionPlanArgs,
  type FieldPlan,
  type LeafListFieldPlan,
  type ListFieldPlan,
  type PlannedFieldExecution,
} from './plan.js';
import { PlannedWorkRunner } from './plannedWorkRunner.js';
import { EMPTY_ARGS, EMPTY_VARIABLE_VALUES, isGraphQL17 } from './planShared.js';
import { promiseForObject } from './promiseForObject.js';
import { ALWAYS_INCLUDE } from './skipIncludePredicates.js';

export { defaultFieldResolver, defaultTypeResolver };
/** Drop cached plans for a document (schema mutation / tests / benches). */
export { clearExecutionPlanCache } from './plan.js';

export type { CompletedResult, PendingResult } from './incremental.js';

export type {
  ExecutionArgs,
  ExecutionContext,
  ExecutionPlan,
  FormattedExecutionResult,
  FormattedIncrementalDeferResult,
  FormattedIncrementalResult,
  FormattedIncrementalStreamResult,
  FormattedInitialIncrementalExecutionResult,
  FormattedSubsequentIncrementalExecutionResult,
  IncrementalDeferResult,
  IncrementalExecutionResults,
  IncrementalResult,
  IncrementalStreamResult,
  InitialIncrementalExecutionResult,
  SingularExecutionResult,
  SubsequentIncrementalExecutionResult,
} from './executeTypes.js';

export { flattenIncrementalResults, isIncrementalResults, subscribe } from './executeSubscribe.js';

/**
 * Compile a cacheable {@link ExecutionPlan}.
 *
 * Variable `@skip` / `@include` use union collection + FieldNode keys.
 * `@defer` / `@stream` set `hasIncremental`; runtime keeps the incremental
 * interpreter while still using per-field plan facts. Pass the result to
 * `execute({ plan })` for warm reuse.
 */
export function compileExecutionPlan(
  args: CompileExecutionPlanArgs,
): ExecutionPlan | ReadonlyArray<GraphQLError> | undefined {
  return compileInternalExecutionPlan(args);
}

/** True when `compileExecutionPlan` returned a usable plan. */
export function isExecutionPlan(
  value: ExecutionPlan | ReadonlyArray<GraphQLError> | undefined | null,
): value is ExecutionPlan {
  return isCompiledExecutionPlan(value);
}

function formatContextBuildErrors(errors: ReadonlyArray<GraphQLError>): SingularExecutionResult {
  return {
    errors: errors.map(e => {
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

/**
 * Cross-execution collectFields cache for documents whose `@skip` /
 * `@include` / `@defer` args that affect collection are not variables.
 * Keyed by schema, document fragments, runtime type and selection set —
 * not variableValues.
 */
const collectFieldsStable = memoize4(function collectFieldsStable(
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  runtimeType: GraphQLObjectType,
  selectionSet: SelectionSetNode,
): FieldsAndPatches {
  return _collectFields(schema, fragments, EMPTY_VARIABLE_VALUES, runtimeType, selectionSet);
});

/**
 * Cross-execution collectSubfields cache for the same class of documents.
 * Reuses results across requests when the document AST (and thus fieldNodes
 * arrays from a cached root collect) is shared.
 */
const collectSubfieldsStable = memoize4(function collectSubfieldsStable(
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  returnType: GraphQLObjectType,
  fieldNodes: Array<FieldNode>,
): FieldsAndPatches {
  return _collectSubfields(schema, fragments, EMPTY_VARIABLE_VALUES, returnType, fieldNodes);
});

/**
 * Per-execution collectSubfields when collected fields can change with
 * variableValues (`@skip` / `@include` / `@defer` with variable `if`/`label`).
 */
const collectSubfieldsWithVariables = memoize3(function collectSubfieldsWithVariables(
  exeContext: ExecutionContext,
  returnType: GraphQLObjectType,
  fieldNodes: Array<FieldNode>,
): FieldsAndPatches {
  return _collectSubfields(
    exeContext.schema,
    exeContext.fragments,
    exeContext.variableValues,
    returnType,
    fieldNodes,
  );
});

/**
 * Root/selection-set field collection with optional cross-execution memoization
 * when the document has no variable-conditional `@skip` / `@include` / `@defer`.
 *
 * When collection *does* depend on variables, try a compiled predicate program
 * (field + fragment `@skip`/`@include`): walk the AST once, then filter with
 * cheap closures instead of re-collecting. `@defer`/`@stream` → classic collect.
 *
 * @internal
 */
export function collectFieldsFromContext(
  exeContext: ExecutionContext,
  runtimeType: GraphQLObjectType,
  selectionSet: SelectionSetNode,
): FieldsAndPatches {
  if (exeContext.collectFieldsDependsOnVariables) {
    // Incremental docs: predicate programs omit @defer/@stream patches — use
    // classic collect (#7). Non-incremental keeps path-aware skip/include.
    if (exeContext.skipIncludeFieldPredicates && !exeContext.plan?.hasIncremental) {
      const filtered = filterConditionalCollect(
        getConditionalCollectProgram(
          exeContext.schema,
          exeContext.fragments,
          runtimeType,
          selectionSet,
        ),
        exeContext.variableValues as VariableValues,
      );
      if (filtered != null) {
        return filtered;
      }
    }
    return _collectFields(
      exeContext.schema,
      exeContext.fragments,
      exeContext.variableValues,
      runtimeType,
      selectionSet,
    );
  }
  return collectFieldsStable(exeContext.schema, exeContext.fragments, runtimeType, selectionSet);
}

/**
 * A memoized collection of relevant subfields with regard to the return
 * type. Memoizing ensures the subfields are not repeatedly calculated, which
 * saves overhead when resolving lists of values.
 *
 * When the document has no variable-conditional `@skip` / `@include` /
 * `@defer`, results are shared across executions for the same document AST.
 *
 * @internal
 */
export function collectSubfieldsFromContext(
  exeContext: ExecutionContext,
  returnType: GraphQLObjectType,
  fieldNodes: Array<FieldNode>,
): FieldsAndPatches {
  if (exeContext.collectFieldsDependsOnVariables) {
    if (exeContext.skipIncludeFieldPredicates && !exeContext.plan?.hasIncremental) {
      return collectSubfieldsWithPredicates(exeContext, returnType, fieldNodes);
    }
    return collectSubfieldsWithVariables(exeContext, returnType, fieldNodes);
  }
  return collectSubfieldsStable(exeContext.schema, exeContext.fragments, returnType, fieldNodes);
}

/**
 * Per-execution memo of predicate-filtered subfields so list items reuse the
 * same Map (classic collectSubfieldsWithVariables identity) instead of
 * rebuilding on every item.
 */
const collectSubfieldsWithPredicates = memoize3(function collectSubfieldsWithPredicates(
  exeContext: ExecutionContext,
  returnType: GraphQLObjectType,
  fieldNodes: Array<FieldNode>,
): FieldsAndPatches {
  const filtered = filterConditionalCollect(
    getConditionalSubfieldProgram(exeContext.schema, exeContext.fragments, returnType, fieldNodes),
    exeContext.variableValues as VariableValues,
  );
  if (filtered != null) {
    return filtered;
  }
  return _collectSubfields(
    exeContext.schema,
    exeContext.fragments,
    exeContext.variableValues,
    returnType,
    fieldNodes,
  );
});

/**
 * Compile a selection set into field entries with path-aware `@skip`/`@include`
 * predicates (field + enclosing fragment directives). Returns `null` when the
 * shape needs classic collect (`@defer` / `@stream`).
 */
const getConditionalCollectProgram = memoize4(function getConditionalCollectProgram(
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  runtimeType: GraphQLObjectType,
  selectionSet: SelectionSetNode,
): ConditionalCollectProgram {
  const entries: ConditionalFieldEntry[] = [];
  const visitedFragmentNames = new Set<string>();
  if (
    !compileConditionalSelectionSet(
      schema,
      fragments,
      runtimeType,
      selectionSet,
      entries,
      visitedFragmentNames,
    )
  ) {
    return null;
  }
  return entries;
});

const getConditionalSubfieldProgram = memoize4(function getConditionalSubfieldProgram(
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  returnType: GraphQLObjectType,
  fieldNodes: Array<FieldNode>,
): ConditionalCollectProgram {
  const entries: ConditionalFieldEntry[] = [];
  const visitedFragmentNames = new Set<string>();
  // Shared across merged field nodes so a conditional then unconditional
  // spread of the same fragment bails to classic collect (spec merge).
  const conditionalVisits = new Set<string>();
  for (const fieldNode of fieldNodes) {
    if (fieldNode.selectionSet == null) {
      continue;
    }
    if (
      !compileConditionalSelectionSet(
        schema,
        fragments,
        returnType,
        fieldNode.selectionSet,
        entries,
        visitedFragmentNames,
        ALWAYS_INCLUDE,
        conditionalVisits,
      )
    ) {
      return null;
    }
  }
  return entries;
});

function filterConditionalCollect(
  program: ConditionalCollectProgram,
  variableValues: VariableValues,
): FieldsAndPatches | null {
  if (program == null) {
    return null;
  }
  const fields = new Map<string, Array<FieldNode>>();
  for (const entry of program) {
    if (!entry.include(variableValues)) {
      continue;
    }
    const existing = fields.get(entry.responseName);
    if (existing != null) {
      existing.push(entry.fieldNode);
    } else {
      fields.set(entry.responseName, [entry.fieldNode]);
    }
  }
  return { fields, patches: [] };
}

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

export function getFieldArgumentValues(
  fieldDef: GraphQLField<unknown, unknown>,
  fieldNode: FieldNode,
  variableValues: VariableValues,
  argumentReader?: ArgumentReader,
  readArguments?: (variableValues: VariableValues) => { [argument: string]: unknown },
): { [argument: string]: unknown } {
  if (readArguments !== undefined) {
    return readArguments(variableValues);
  }
  if (argumentReader !== undefined) {
    switch (argumentReader.kind) {
      case 'empty':
        return EMPTY_ARGS;
      case 'static':
        return argumentReader.args;
      case 'coercer':
        return argumentReader.read(variableValues);
    }
  }
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
 *
 * Eligible documents use `args.plan` when provided, otherwise get-or-compile a
 * plan from the WeakMap cache. When compile is unavailable, falls back to the
 * classic interpreter path.
 */
export function execute<TData = any, TVariables = any, TContext = any>(
  args: ExecutionArgs<TData, TVariables, TContext>,
): MaybePromise<SingularExecutionResult<TData> | IncrementalExecutionResults<TData>> {
  // Honor abort before cold plan compile (custom scalar literal work).
  args.signal?.throwIfAborted();

  let knownPlan: ExecutionPlan | null = null;
  if (args.plan != null) {
    knownPlan = planMatchesExecuteArgs(args.plan, args)
      ? args.plan
      : (resolvePlanForExecute({
          schema: args.schema,
          document: args.document,
          operationName: args.operationName,
        }) ?? null);
  } else {
    knownPlan =
      resolvePlanForExecute({
        schema: args.schema,
        document: args.document,
        operationName: args.operationName,
      }) ?? null;
  }

  const exeContext = buildExecutionContext(args, knownPlan);
  if (!('schema' in exeContext)) {
    return formatContextBuildErrors(exeContext);
  }
  return executeImpl(exeContext);
}

/** True when a caller-supplied plan is for this schema/document/operation. */
function planMatchesExecuteArgs(
  plan: ExecutionPlan,
  args: {
    schema: GraphQLSchema;
    document: DocumentNode;
    operationName?: string | null;
  },
): boolean {
  if (plan.schema !== args.schema || plan.document !== args.document) {
    return false;
  }
  const requested = args.operationName ?? null;
  if (requested == null) {
    return true;
  }
  return (plan.operation.name?.value ?? null) === requested;
}

export function executeImpl<TData = any, TVariables = any, TContext = any>(
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

      exeContext.detachSignalListener?.();
      return initialResult;
    },
    (error: any) => {
      exeContext.signal?.throwIfAborted();
      // A non-null bubble through the root returns `{ data: null }` and
      // never yields subsequent payloads. Cancel root defers/streams
      // (path `[]`) so their resolvers and iterators do not keep running.
      // Stream-only operations never call ensureIncrementalCollectState
      // (`@stream` is not a collect patch). Record the root so a stream
      // that starts after this error still hits the nulled-path guard.
      exeContext.nulledPaths ??= [];
      filterSubsequentPayloads(exeContext, undefined, undefined);

      if (error.errors) {
        exeContext.errors.push(...error.errors);
      } else {
        exeContext.errors.push(error);
      }
      exeContext.detachSignalListener?.();
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

const collectFieldsDependsOnVariablesCache = new WeakMap<DocumentNode, boolean>();

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

function getCollectFieldsDependsOnVariables(document: DocumentNode): boolean {
  let depends = collectFieldsDependsOnVariablesCache.get(document);
  if (depends === undefined) {
    depends = collectFieldsDependsOnVariables(document);
    collectFieldsDependsOnVariablesCache.set(document, depends);
  }
  return depends;
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
/**
 * @param knownPlan When an {@link ExecutionPlan} is passed, use it.
 *   Pass `null` to skip plan resolve (classic fallback). Omit to
 *   resolve/compile from the WeakMap cache (or `args.plan` when set).
 */
export function buildExecutionContext<TData = any, TVariables = any, TContext = any>(
  args: ExecutionArgs<TData, TVariables, TContext>,
  knownPlan?: ExecutionPlan | null,
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

  // Planned path: use the known plan. Classic fallback: `null` skips resolve.
  // Direct callers that omit knownPlan use `args.plan` or get-or-compile.
  // Explicit knownPlan is validated like args.plan (mismatched schema/document
  // /operation must not reuse another request's coercer or field maps).
  const planMatchArgs = { schema, document, operationName };
  const plan =
    knownPlan === undefined
      ? args.plan != null
        ? planMatchesExecuteArgs(args.plan, planMatchArgs)
          ? args.plan
          : resolvePlanForExecute(planMatchArgs)
        : resolvePlanForExecute(planMatchArgs)
      : knownPlan == null
        ? undefined
        : planMatchesExecuteArgs(knownPlan, planMatchArgs)
          ? knownPlan
          : resolvePlanForExecute(planMatchArgs);

  // FIXME: https://github.com/graphql/graphql-js/issues/2203
  /* c8 ignore next */
  const variableDefinitions = operation.variableDefinitions ?? [];

  let variableValues: VariableValues;
  if (plan != null) {
    const coerced = plan.coerceVariables(rawVariableValues as { readonly [key: string]: unknown }, {
      hideSuggestions,
    });
    if ('errors' in coerced) {
      return coerced.errors;
    }
    variableValues = coerced.variableValues;
  } else {
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

    // GraphQL 17 returns { variableValues }; GraphQL 16 returns { coerced }.
    variableValues = isGraphQL17
      ? (coercedVariableValues as unknown as { variableValues: VariableValues }).variableValues
      : {
          coerced: (coercedVariableValues as unknown as { coerced: Record<string, unknown> })
            .coerced,
          sources: Object.create(null),
        };
  }

  signal?.throwIfAborted();

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
  let detachSignalListener: (() => void) | undefined;

  if (signal) {
    let listeners: Set<() => void> | undefined;
    let sharedListener: (() => void) | undefined;
    const removeAbortListener = () => {
      if (sharedListener) {
        signal.removeEventListener('abort', sharedListener);
        sharedListener = undefined;
      }
    };
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
      sharedListener = () => {
        signalDeferred.reject(signal.reason);
        removeAbortListener();
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
    detachSignalListener = removeAbortListener;
  }

  const collectDepends = getCollectFieldsDependsOnVariables(document);
  const exeContext: ExecutionContext = {
    schema,
    fragments,
    rootValue,
    contextValue,
    operation,
    variableValues,
    collectFieldsDependsOnVariables: collectDepends,
    // Try predicate collect whenever vars affect collection; program is null
    // on @defer/@stream and falls back to classic collect.
    skipIncludeFieldPredicates: collectDepends,
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
    detachSignalListener,
    schemaCoordinateInErrors,
    plan,
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

export function buildPerEventExecutionContext(
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
    collectFieldsDependsOnVariables: exeContext.collectFieldsDependsOnVariables,
    skipIncludeFieldPredicates: exeContext.skipIncludeFieldPredicates,
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
    plan: exeContext.plan,
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
  const { operation, schema, fragments, variableValues, rootValue, plan } = exeContext;
  const rootType = plan?.rootType ?? getDefinedRootType(schema, operation.operation, [operation]);
  if (rootType == null) {
    throw new GraphQLError(
      `Schema is not configured to execute ${operation.operation} operation.`,
      {
        nodes: operation,
      },
    );
  }

  // Warm plan path: reuse pre-collected root fields when bound executions exist.
  // Incremental plans leave `rootExecutions` unset (classic collect + patches);
  // avoid a `hasIncremental` read on the stable/skip warm path.
  if (
    plan &&
    plan.operation === operation &&
    plan.rootType === rootType &&
    plan.rootExecutions != null
  ) {
    if (!plan.collectionDependsOnVariables) {
      const path = undefined;
      if (operation.operation === 'mutation') {
        return executeFieldsSerially(
          exeContext,
          rootType,
          rootValue,
          path,
          plan.rootFields,
          plan.rootExecutions,
        );
      }
      return executeFields(
        exeContext,
        rootType,
        rootValue,
        path,
        plan.rootFields,
        undefined,
        plan.rootExecutions,
      ) as TData;
    }
    if (plan.skipIncludePredicates) {
      const path = undefined;
      const filtered = filterPlannedExecutions(
        plan.rootExecutions,
        variableValues as VariableValues,
      );
      if (operation.operation === 'mutation') {
        // Serial path: thin field map from filtered + bound executions.
        const fields = new Map<string, Array<FieldNode>>();
        for (const execution of filtered) {
          fields.set(execution.responseName, execution.fieldNodes);
        }
        return executeFieldsSerially(exeContext, rootType, rootValue, path, fields, filtered);
      }
      return executeFields(
        exeContext,
        rootType,
        rootValue,
        path,
        plan.rootFields,
        undefined,
        filtered,
      ) as TData;
    }
  }

  const { fields: rootFields, patches } = collectFieldsFromContext(
    exeContext,
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

  ensureIncrementalCollectState(exeContext);

  const { groupedFieldSet } = collectIncrementalFields(
    schema,
    fragments,
    variableValues,
    rootType,
    operation.selectionSet,
  );
  const { groupedFieldSet: initialFields, newGroupedFieldSets } =
    buildExecutionPlan(groupedFieldSet);
  const plannedRootFields = groupedFieldSetToFieldMap(
    initialFields,
    exeContext.deferUsageByFieldNode,
  );

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
  const remainingGroups = new Map<DeferUsage, number>();
  const parts = new Map<DeferUsage, Array<MaybePromise<Record<string, unknown> | null>>>();
  const groups = [...newGroupedFieldSets.entries()].sort(
    ([a], [b]) => deferUsageDepth(rootDeferUsage(a)) - deferUsageDepth(rootDeferUsage(b)),
  );
  for (const [deferUsageSet] of groups) {
    for (const usage of deferUsageSet) {
      remainingGroups.set(usage, (remainingGroups.get(usage) ?? 0) + 1);
    }
  }
  const usages = [...remainingGroups.keys()].sort(
    (a, b) => deferUsageDepth(a) - deferUsageDepth(b),
  );
  for (const usage of usages) {
    const deliveryParent =
      (usage.parentDeferUsage && records.get(usage.parentDeferUsage)) ?? parentContext;
    records.set(
      usage,
      new DeferredFragmentRecord({
        label: usage.label,
        path,
        parentContext,
        deliveryParent,
        exeContext,
        deferUsage: usage,
      }),
    );
  }
  for (const [deferUsageSet, groupedFieldSet] of groups) {
    const fields = groupedFieldSetToFieldMap(groupedFieldSet, exeContext.deferUsageByFieldNode);
    const fieldUsageStore = (exeContext.deferUsagesForFieldNodes ??= new WeakMap());
    for (const fieldNodes of fields.values()) {
      fieldUsageStore.set(fieldNodes, deferUsageSet);
    }
    const primaryUsage = rootDeferUsage(deferUsageSet);
    const primaryRecord = primaryUsage ? records.get(primaryUsage) : undefined;
    const data = executeDeferredGroupedFields(
      exeContext,
      parentType,
      sourceValue,
      path,
      fields,
      primaryRecord,
      [...deferUsageSet].map(usage => records.get(usage)).filter(record => record != null),
    );
    for (const usage of deferUsageSet) {
      const list = parts.get(usage) ?? [];
      list.push(data);
      parts.set(usage, list);
      const left = (remainingGroups.get(usage) ?? 1) - 1;
      remainingGroups.set(usage, left);
      if (left === 0) {
        records.get(usage)?.addData(mergeDeferredParts(list));
      }
    }
  }
}

function executeDeferredGroupedFields(
  exeContext: ExecutionContext,
  parentType: GraphQLObjectType,
  sourceValue: unknown,
  path: Path | undefined,
  fields: Map<string, Array<FieldNode>>,
  primaryRecord: DeferredFragmentRecord | undefined,
  records: Array<DeferredFragmentRecord>,
): MaybePromise<Record<string, unknown> | null> {
  try {
    const data = executeFields(exeContext, parentType, sourceValue, path, fields, primaryRecord);
    if (isPromise(data)) {
      return data.then(null, e => {
        for (const record of records) {
          record.errors.push(e);
        }
        return null;
      });
    }
    return data;
  } catch (e) {
    for (const record of records) {
      record.errors.push(e as GraphQLError);
    }
    return null;
  }
}

function mergeDeferredParts(
  parts: Array<MaybePromise<Record<string, unknown> | null>>,
): MaybePromise<Record<string, unknown> | null> {
  if (parts.some(isPromise)) {
    return Promise.all(parts).then(mergeDeferredObjects);
  }
  return mergeDeferredObjects(parts as Array<Record<string, unknown> | null>);
}

function mergeDeferredObjects(
  parts: ReadonlyArray<Record<string, unknown> | null>,
): Record<string, unknown> | null {
  const result: Record<string, unknown> = Object.create(null);
  let sawObject = false;
  for (const part of parts) {
    if (part == null) {
      continue;
    }
    sawObject = true;
    Object.assign(result, part);
  }
  return sawObject ? result : null;
}

function ensureIncrementalCollectState(exeContext: ExecutionContext): void {
  exeContext.nulledPaths ??= [];
  exeContext.deferUsageByFieldNode ??= new WeakMap();
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
  plannedExecutions?: ReadonlyArray<PlannedFieldExecution>,
): MaybePromise<TData> {
  if (plannedExecutions != null) {
    // Bound execution list: same order as parallel warm path; serial reduce.
    return promiseReduce(
      plannedExecutions,
      (results, { responseName, fieldNodes, fieldPlan }) => {
        const fieldPath = addPath(path, responseName, parentType.name);
        exeContext.signal?.throwIfAborted();

        return handleMaybePromise(
          () =>
            executeField(
              exeContext,
              parentType,
              sourceValue,
              fieldNodes,
              fieldPath,
              undefined,
              fieldPlan,
            ),
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
  plannedExecutions?: ReadonlyArray<PlannedFieldExecution>,
): MaybePromise<Record<string, unknown>> {
  // Nested / dense-skip stay on classic bound loop + promiseForObject.
  // Root only: lazily attach a PlannedWorkRunner when a field returns a
  // thenable (asyncRoot) — sync roots (denseSkip) never allocate a runner.
  const results = Object.setPrototypeOf(new CompactExecutionResultMap(), null);
  let containsPromise = false;
  const rootAsync =
    path === undefined &&
    asyncPayloadRecord == null &&
    exeContext.plan != null &&
    !exeContext.plan.hasIncremental;
  let rootRunner: PlannedWorkRunner | undefined;
  try {
    if (plannedExecutions != null) {
      for (const execution of plannedExecutions) {
        exeContext.signal?.throwIfAborted();
        const { responseName, fieldNodes, fieldPlan } = execution;
        const fieldPath = addPath(path, responseName, parentType.name);
        // Leaf-list: thin completer + field-local runner.
        // Object-list (skipIsTypeOf items): thin nested walk (nested bench).
        if (
          exeContext.plan != null &&
          !exeContext.plan.hasIncremental &&
          asyncPayloadRecord == null
        ) {
          if (fieldPlan.kind === 'leafList') {
            const leafResult = executeLeafListFieldWithLocalRunner(
              exeContext,
              parentType,
              sourceValue,
              fieldNodes,
              fieldPath,
              fieldPlan,
              results,
              responseName,
            );
            if (leafResult !== undefined) {
              // Field-local settle already produced the field Promise in results;
              // promiseForObject awaits it. Avoid a second root-runner hop.
              if (isPromise(leafResult)) {
                containsPromise = true;
              }
              continue;
            }
          } else if (fieldPlan.kind === 'list' && fieldPlan.objectType != null) {
            const objectListResult = executeObjectListFieldThin(
              exeContext,
              parentType,
              sourceValue,
              fieldNodes,
              fieldPath,
              fieldPlan,
            );
            if (objectListResult !== undefined) {
              results[responseName] = objectListResult;
              if (isPromise(objectListResult)) {
                if (rootAsync) {
                  rootRunner ??= new PlannedWorkRunner();
                  const slot = responseName;
                  // Placeholder before awaitValue: inline-fulfilled thenables
                  // write the slot inside registration; a trailing undefined
                  // would clobber that value.
                  results[slot] = undefined;
                  rootRunner.awaitValue(
                    objectListResult,
                    value => {
                      results[slot] = value;
                    },
                    reason => {
                      throw coerceError(reason);
                    },
                  );
                } else {
                  containsPromise = true;
                }
              }
              continue;
            }
          }
        }
        // Root leaf default-property: one property read, sync serialize or
        // awaitValue — avoids executeField frame (asyncRoot + property-bag).
        // Only when the effective resolver is defaultFieldResolver (custom
        // fieldResolver must win — see execution-plan-edges-test).
        let rootLeafHandled = false;
        if (
          rootAsync &&
          isLiveDefaultPropertyResolve(fieldPlan, exeContext) &&
          fieldPlan.kind === 'leaf' &&
          fieldPlan.leafType != null &&
          !fieldPlan.hasArgs &&
          (isObjectLike(sourceValue) || typeof sourceValue === 'function')
        ) {
          let property: unknown;
          try {
            property = (sourceValue as Record<string, unknown>)[fieldPlan.fieldDef.name];
          } catch (rawError) {
            const error = locatedError(
              coerceError(rawError),
              fieldNodes,
              pathToArray(fieldPath),
              exeContext.schemaCoordinateInErrors &&
                schemaCoordinateInfo(fieldPlan.fieldDef, parentType),
            );
            results[responseName] = handleFieldError(
              error,
              fieldPlan.returnType,
              exeContext.errors,
            );
            rootLeafHandled = true;
            continue;
          }
          const leafType = fieldPlan.leafType;
          const completeRootLeafValue = (value: unknown, slot: string): void => {
            try {
              if (value instanceof Error) {
                throw value;
              }
              if (value == null) {
                if (fieldPlan.nonNull) {
                  throw new Error(
                    `Cannot return null for non-nullable field ${parentType.name}.${fieldPlan.fieldDef.name}.`,
                  );
                }
                results[slot] = null;
                return;
              }
              const serialized = leafType.serialize(value);
              if (isPromise(serialized)) {
                rootRunner ??= new PlannedWorkRunner();
                results[slot] = undefined;
                rootRunner.awaitValue(
                  serialized,
                  resolved => {
                    results[slot] = resolved;
                  },
                  reason => {
                    const error = locatedError(
                      coerceError(reason),
                      fieldNodes,
                      pathToArray(fieldPath),
                      exeContext.schemaCoordinateInErrors &&
                        schemaCoordinateInfo(fieldPlan.fieldDef, parentType),
                    );
                    results[slot] = handleFieldError(
                      error,
                      fieldPlan.returnType,
                      exeContext.errors,
                    );
                  },
                );
                return;
              }
              if (serialized == null) {
                throw new Error(
                  `Expected \`${inspect(leafType)}.serialize(${inspect(value)})\` to ` +
                    `return non-nullable value, returned: ${inspect(serialized)}`,
                );
              }
              results[slot] = serialized;
            } catch (rawError) {
              const error = locatedError(
                coerceError(rawError),
                fieldNodes,
                pathToArray(fieldPath),
                exeContext.schemaCoordinateInErrors &&
                  schemaCoordinateInfo(fieldPlan.fieldDef, parentType),
              );
              results[slot] = handleFieldError(error, fieldPlan.returnType, exeContext.errors);
            }
          };
          if (typeof property === 'function') {
            let raw: unknown;
            try {
              // Always pass the resolver signature — `Function.length === 0`
              // includes rest-parameter methods that still read `arguments`.
              const info = buildPlannedResolveInfo(exeContext, fieldPlan, fieldPath, fieldNodes);
              raw = (
                property as (
                  this: unknown,
                  fieldArgs: typeof EMPTY_ARGS,
                  contextValue: unknown,
                  resolveInfo: GraphQLResolveInfo,
                ) => unknown
              ).call(sourceValue, EMPTY_ARGS, exeContext.contextValue, info);
            } catch (rawError) {
              const error = locatedError(
                coerceError(rawError),
                fieldNodes,
                pathToArray(fieldPath),
                exeContext.schemaCoordinateInErrors &&
                  schemaCoordinateInfo(fieldPlan.fieldDef, parentType),
              );
              results[responseName] = handleFieldError(
                error,
                fieldPlan.returnType,
                exeContext.errors,
              );
              rootLeafHandled = true;
              raw = undefined;
            }
            if (!rootLeafHandled) {
              if (isPromise(raw)) {
                rootRunner ??= new PlannedWorkRunner();
                const slot = responseName;
                results[slot] = undefined;
                rootRunner.awaitValue(
                  raw,
                  value => {
                    completeRootLeafValue(value, slot);
                  },
                  reason => {
                    const error = locatedError(
                      coerceError(reason),
                      fieldNodes,
                      pathToArray(fieldPath),
                      exeContext.schemaCoordinateInErrors &&
                        schemaCoordinateInfo(fieldPlan.fieldDef, parentType),
                    );
                    results[slot] = handleFieldError(
                      error,
                      fieldPlan.returnType,
                      exeContext.errors,
                    );
                  },
                );
                rootLeafHandled = true;
              } else {
                completeRootLeafValue(raw, responseName);
                rootLeafHandled = true;
              }
            }
          } else if (isPromise(property)) {
            rootRunner ??= new PlannedWorkRunner();
            const slot = responseName;
            results[slot] = undefined;
            rootRunner.awaitValue(
              property,
              value => {
                completeRootLeafValue(value, slot);
              },
              reason => {
                const error = locatedError(
                  coerceError(reason),
                  fieldNodes,
                  pathToArray(fieldPath),
                  exeContext.schemaCoordinateInErrors &&
                    schemaCoordinateInfo(fieldPlan.fieldDef, parentType),
                );
                results[slot] = handleFieldError(error, fieldPlan.returnType, exeContext.errors);
              },
            );
            rootLeafHandled = true;
          } else {
            completeRootLeafValue(property, responseName);
            rootLeafHandled = true;
          }
        }
        if (rootLeafHandled) {
          continue;
        }
        const result = executeField(
          exeContext,
          parentType,
          sourceValue,
          fieldNodes,
          fieldPath,
          asyncPayloadRecord,
          fieldPlan,
        );
        if (result !== undefined) {
          if (rootAsync && isPromise(result)) {
            rootRunner ??= new PlannedWorkRunner();
            const slot = responseName;
            results[slot] = undefined;
            rootRunner.awaitValue(
              result,
              value => {
                results[slot] = value;
              },
              reason => {
                throw coerceError(reason);
              },
            );
          } else {
            results[responseName] = result;
            if (isPromise(result)) {
              containsPromise = true;
            }
          }
        }
      }
    } else {
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
    }
  } catch (error) {
    if (error !== exeContext.signal?.reason && (containsPromise || rootRunner != null)) {
      // Ensure that any promises returned by other fields are handled, as they may also reject.
      if (rootRunner != null) {
        const settled = rootRunner.runUntilSettled();
        const fieldLocal = containsPromise
          ? promiseForObject(results, exeContext.signal)
          : undefined;
        const waits: Array<PromiseLike<unknown>> = [];
        if (isPromise(settled)) {
          waits.push(settled);
        }
        if (fieldLocal != null && isPromise(fieldLocal)) {
          waits.push(fieldLocal);
        }
        if (waits.length > 0) {
          return Promise.all(waits).then(
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
  if (rootRunner != null) {
    const settled = rootRunner.runUntilSettled();
    if (isPromise(settled)) {
      // Observe field-local promises immediately (not after the root runner),
      // so a rejecting leaf list cannot hang / go unhandled while a root field
      // is still pending.
      const fieldLocal = containsPromise ? promiseForObject(results, exeContext.signal) : undefined;
      const done =
        fieldLocal != null && isPromise(fieldLocal)
          ? Promise.all([settled, fieldLocal]).then(([, fields]) => {
              // `fields` is a snapshot that may still hold root-runner
              // placeholders (`count: undefined`). Merge only slots that are
              // still thenables in the live `results` map (field-local lists);
              // root-runner writes into `results` directly.
              const fieldMap = fields as Record<string, unknown>;
              for (const key of Object.keys(fieldMap)) {
                if (isPromise(results[key])) {
                  results[key] = fieldMap[key];
                }
              }
              return results;
            })
          : settled.then(() => results);
      if (exeContext.signalPromise) {
        return Promise.race([exeContext.signalPromise, done]);
      }
      return done;
    }
    exeContext.signal?.throwIfAborted();
    if (containsPromise) {
      return promiseForObject(results, exeContext.signal, exeContext.signalPromise);
    }
    return results;
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
 * Thin list-of-object field: resolve once, then per-item sync object walk via
 * bound subfield executions (nested default-resolver). Declines when resolve
 * or items need the classic path.
 */

function executeObjectListFieldThin(
  exeContext: ExecutionContext,
  parentType: GraphQLObjectType,
  source: unknown,
  fieldNodes: Array<FieldNode>,
  path: Path,
  fieldPlan: ListFieldPlan,
): MaybePromise<ReadonlyArray<unknown> | null> | undefined {
  const objectType = fieldPlan.objectType;
  if (objectType == null || !isLiveDefaultPropertyResolve(fieldPlan, exeContext)) {
    return undefined;
  }
  const plan = exeContext.plan;
  if (plan == null) {
    return undefined;
  }
  const rawSubExecutions = getPlannedSubfieldExecutions(plan, fieldNodes, objectType);
  if (rawSubExecutions == null || rawSubExecutions.length === 0) {
    return undefined;
  }
  const subExecutions = filterPlannedExecutions(rawSubExecutions, exeContext.variableValues);
  if (subExecutions.length === 0) {
    return undefined;
  }
  const locate = (rawError: unknown): GraphQLError =>
    locatedError(
      coerceError(rawError),
      fieldNodes,
      pathToArray(path),
      exeContext.schemaCoordinateInErrors && schemaCoordinateInfo(fieldPlan.fieldDef, parentType),
    );
  const completeResolved = (resolved: unknown): MaybePromise<ReadonlyArray<unknown> | null> => {
    try {
      const thin = completePlannedObjectListValue(
        exeContext,
        fieldPlan,
        path,
        resolved,
        objectType,
        fieldPlan.itemNonNull === true,
        subExecutions,
      );
      if (thin !== undefined) {
        return thin;
      }
      // Already invoked user code / held a thenable; finish via classic list
      // completion without re-resolving the field.
      const info = buildPlannedResolveInfo(exeContext, fieldPlan, path, fieldNodes);
      const returnType = fieldPlan.returnType;
      const listType = (
        isNonNullType(returnType) ? returnType.ofType : returnType
      ) as GraphQLList<GraphQLOutputType>;
      const completed = completeListValue(exeContext, listType, fieldNodes, info, path, resolved);
      if (isPromise(completed)) {
        return completed.then(
          value => value,
          rawError => {
            exeContext.signal?.throwIfAborted();
            return handleFieldError(locate(rawError), fieldPlan.returnType, exeContext.errors);
          },
        );
      }
      return completed;
    } catch (rawError) {
      // Abort from thin item walk must not become a nullable list field error.
      exeContext.signal?.throwIfAborted();
      return handleFieldError(locate(rawError), fieldPlan.returnType, exeContext.errors);
    }
  };
  let result: unknown;
  try {
    exeContext.signal?.throwIfAborted();
    if (!(isObjectLike(source) || typeof source === 'function')) {
      return undefined;
    }
    let args: { [argument: string]: unknown } | undefined;
    if (fieldPlan.hasArgs) {
      args = getFieldArgumentValues(
        fieldPlan.fieldDef,
        fieldNodes[0],
        exeContext.variableValues,
        fieldPlan.argumentReader,
        fieldPlan.readArguments,
      );
    }
    const property = (source as Record<string, unknown>)[fieldPlan.fieldDef.name];
    if (typeof property === 'function') {
      const info = buildPlannedResolveInfo(exeContext, fieldPlan, path, fieldNodes);
      const methodArgs =
        args ??
        getFieldArgumentValues(
          fieldPlan.fieldDef,
          fieldNodes[0],
          exeContext.variableValues,
          fieldPlan.argumentReader,
          fieldPlan.readArguments,
        );
      result = (
        property as (
          this: unknown,
          fieldArgs: typeof methodArgs,
          contextValue: unknown,
          resolveInfo: GraphQLResolveInfo,
        ) => unknown
      ).call(source, methodArgs, exeContext.contextValue, info);
    } else if (property instanceof Error) {
      throw property;
    } else {
      result = property;
    }
    if (isPromise(result)) {
      return result.then(
        resolved => completeResolved(resolved),
        rawError => {
          exeContext.signal?.throwIfAborted();
          return handleFieldError(locate(rawError), fieldPlan.returnType, exeContext.errors);
        },
      );
    }
    return completeResolved(result);
  } catch (rawError) {
    exeContext.signal?.throwIfAborted();
    return handleFieldError(locate(rawError), fieldPlan.returnType, exeContext.errors);
  }
}

function completePlannedObjectListValue(
  exeContext: ExecutionContext,
  fieldPlan: FieldPlan,
  path: Path,
  result: unknown,
  itemObjectType: GraphQLObjectType,
  itemNonNull: boolean,
  subExecutions: ReadonlyArray<PlannedFieldExecution>,
): MaybePromise<ReadonlyArray<unknown> | null> | undefined {
  if (result == null) {
    if (fieldPlan.nonNull) {
      throw new Error(
        `Cannot return null for non-nullable field ${fieldPlan.parentType.name}.${fieldPlan.fieldDef.name}.`,
      );
    }
    return null;
  }
  // Async iterators take precedence over indexed sync arrays (classic path).
  if (isAsyncIterable(result) || !usesDefaultArrayIterator(result)) {
    // Custom iterators / async iterables / non-arrays → classic completion.
    return undefined;
  }
  // Decline before touching items when any slot needs the classic path, so we
  // do not run getters/serializers and then fall back.
  for (let index = 0; index < result.length; index++) {
    const item = result[index];
    if (item == null) {
      if (itemNonNull) {
        return undefined;
      }
      continue;
    }
    if (!isObjectLike(item) || isPromise(item) || item instanceof Error) {
      return undefined;
    }
  }
  const completedResults: Array<unknown> = new Array(result.length);
  const asyncUpdates: Promise<void>[] = [];
  for (let index = 0; index < result.length; index++) {
    const item = result[index];
    if (item == null) {
      completedResults[index] = null;
      continue;
    }
    const itemPath = addPath(path, index, undefined);
    try {
      const nested = executePlannedSyncObjectFields(
        exeContext,
        itemObjectType,
        item,
        itemPath,
        subExecutions,
      );
      const itemIndex = index;
      const assignItem = (
        value: Record<string, unknown> | ThinObjectPartial | undefined,
      ): MaybePromise<void> => {
        if (isThinObjectPartial(value)) {
          const finished = finishThinObjectPartial(
            exeContext,
            itemObjectType,
            item,
            itemPath,
            subExecutions,
            value,
          );
          if (isPromise(finished)) {
            return finished.then(v => {
              completedResults[itemIndex] = v;
            });
          }
          completedResults[itemIndex] = finished;
          return;
        }
        if (value === undefined) {
          // This item alone needs classic completion; do not redo prior items.
          const finished = executeObjectItemViaFields(
            exeContext,
            itemObjectType,
            item,
            itemPath,
            subExecutions,
          );
          if (isPromise(finished)) {
            return finished.then(v => {
              completedResults[itemIndex] = v;
            });
          }
          completedResults[itemIndex] = finished;
          return;
        }
        completedResults[itemIndex] = value;
      };
      if (isPromise(nested)) {
        asyncUpdates.push(nested.then(value => assignItem(value)).then(() => undefined));
        continue;
      }
      const assigned = assignItem(nested);
      if (isPromise(assigned)) {
        asyncUpdates.push(assigned.then(() => undefined));
      }
    } catch (bubbled) {
      // Abort must not become a nullable list-item failure.
      exeContext.signal?.throwIfAborted();
      // NonNull child bubbled from the item — null nullable items and continue.
      if (itemNonNull) {
        throw bubbled;
      }
      const error =
        bubbled instanceof GraphQLError
          ? bubbled
          : locatedError(coerceError(bubbled), undefined, pathToArray(itemPath));
      completedResults[index] = handleFieldError(error, itemObjectType, exeContext.errors);
    }
  }
  if (asyncUpdates.length > 0) {
    return Promise.all(asyncUpdates).then(() => completedResults);
  }
  return completedResults;
}
/**
 * Field-local leaf-list path: PlannedWorkRunner only for this field's items.
 * Returns a Promise when the field (or its items) are async; `undefined` to
 * decline and fall through to `executeField`.
 */

function executeLeafListFieldWithLocalRunner(
  exeContext: ExecutionContext,
  parentType: GraphQLObjectType,
  sourceValue: unknown,
  fieldNodes: Array<FieldNode>,
  fieldPath: Path,
  fieldPlan: LeafListFieldPlan,
  results: Record<string, unknown>,
  responseName: string,
): MaybePromise<unknown> | undefined {
  const parentRunner = exeContext.plannedRunner;
  // Lazy: sync lists never allocate a PlannedWorkRunner.
  let runner: PlannedWorkRunner | undefined;
  const getRunner = (): PlannedWorkRunner => {
    if (runner == null) {
      runner = new PlannedWorkRunner();
      exeContext.plannedRunner = runner;
    }
    return runner;
  };
  // Live slot: async NonNull item bubbles call writeField(null) during settle;
  // finish must re-read this, not a stale array captured before awaitValue.
  let fieldValue: unknown;
  const writeField = (value: unknown): void => {
    fieldValue = value;
    results[responseName] = value;
  };
  try {
    const completed = executePlannedLeafListField(
      exeContext,
      parentType,
      sourceValue,
      fieldNodes,
      fieldPath,
      fieldPlan,
      getRunner,
      writeField,
    );
    if (completed === undefined) {
      return undefined;
    }
    if (isPromise(completed)) {
      // Store the field Promise so promiseForObject awaits it (writeField alone
      // inside `.then` leaves a sync `undefined` slot and races the settle).
      // Reject path must null the field (not the whole response). Read `runner`
      // live inside `.then` — Promise<Array<Promise>> only allocates it while
      // completing the resolved array (after this wrapper is created).
      const fieldPromise = completed.then(
        value => {
          // Already-resolved item promises may microtask-bubble writeField(null)
          // before this continuation; do not clobber with the sparse array.
          if (fieldValue === undefined) {
            writeField(value);
          }
          if (runner == null) {
            exeContext.plannedRunner = parentRunner;
            return fieldValue;
          }
          return settleLocalLeafList(runner, parentRunner, exeContext, () => fieldValue);
        },
        rawError => {
          const error = locatedError(
            coerceError(rawError),
            fieldNodes,
            pathToArray(fieldPath),
            exeContext.schemaCoordinateInErrors &&
              schemaCoordinateInfo(fieldPlan.fieldDef, parentType),
          );
          writeField(handleFieldError(error, fieldPlan.returnType, exeContext.errors));
          filterSubsequentPayloads(exeContext, fieldPath, undefined);
          runner?.forceSettle();
          exeContext.plannedRunner = parentRunner;
          return fieldValue;
        },
      );
      results[responseName] = fieldPromise;
      return fieldPromise;
    }
    // Sync completion may already have bubbled null via writeField.
    if (fieldValue === undefined) {
      writeField(completed);
    }
    if (runner == null) {
      exeContext.plannedRunner = parentRunner;
      return fieldValue;
    }
    // Iterator throw / field error can return null after registering item
    // thenables. Do not wait on those items (they may never settle).
    if (fieldValue == null) {
      runner.forceSettle();
      exeContext.plannedRunner = parentRunner;
      return fieldValue;
    }
    const settled = settleLocalLeafList(runner, parentRunner, exeContext, () => fieldValue);
    if (isPromise(settled)) {
      results[responseName] = settled;
    }
    return settled;
  } catch (rawError) {
    runner?.forceSettle();
    exeContext.plannedRunner = parentRunner;
    throw rawError;
  }
}

function settleLocalLeafList(
  runner: PlannedWorkRunner,
  parentRunner: PlannedWorkRunner | undefined,
  exeContext: ExecutionContext,
  readField: () => unknown,
): MaybePromise<unknown> {
  const settled = runner.runUntilSettled();
  if (isPromise(settled)) {
    return settled.then(
      () => {
        exeContext.plannedRunner = parentRunner;
        return readField();
      },
      error => {
        exeContext.plannedRunner = parentRunner;
        throw error;
      },
    );
  }
  exeContext.plannedRunner = parentRunner;
  return readField();
}
/**
 * Resolve a planned leaf-list field and complete items with the shared runner.
 * Returns `undefined` to signal fall-through to generic `executeField`.
 */

function executePlannedLeafListField(
  exeContext: ExecutionContext,
  parentType: GraphQLObjectType,
  source: unknown,
  fieldNodes: Array<FieldNode>,
  path: Path,
  fieldPlan: LeafListFieldPlan,
  getRunner: () => PlannedWorkRunner,
  writeField: (value: unknown) => void,
): MaybePromise<ReadonlyArray<unknown> | null> | undefined {
  const errors = exeContext.errors;
  const locate = (rawError: unknown): GraphQLError =>
    locatedError(
      coerceError(rawError),
      fieldNodes,
      pathToArray(path),
      exeContext.schemaCoordinateInErrors && schemaCoordinateInfo(fieldPlan.fieldDef, parentType),
    );
  let result: unknown;
  try {
    exeContext.signal?.throwIfAborted();
    if (
      isLiveDefaultPropertyResolve(fieldPlan, exeContext) &&
      (isObjectLike(source) || typeof source === 'function')
    ) {
      let args: { [argument: string]: unknown } | undefined;
      if (fieldPlan.hasArgs) {
        args = getFieldArgumentValues(
          fieldPlan.fieldDef,
          fieldNodes[0],
          exeContext.variableValues,
          fieldPlan.argumentReader,
          fieldPlan.readArguments,
        );
      }
      const property = (source as Record<string, unknown>)[fieldPlan.fieldDef.name];
      if (typeof property === 'function') {
        const info = buildPlannedResolveInfo(exeContext, fieldPlan, path, fieldNodes);
        const methodArgs =
          args ??
          getFieldArgumentValues(
            fieldPlan.fieldDef,
            fieldNodes[0],
            exeContext.variableValues,
            fieldPlan.argumentReader,
            fieldPlan.readArguments,
          );
        result = (
          property as (
            this: unknown,
            fieldArgs: typeof methodArgs,
            contextValue: unknown,
            resolveInfo: GraphQLResolveInfo,
          ) => unknown
        ).call(source, methodArgs, exeContext.contextValue, info);
      } else if (property instanceof Error) {
        throw property;
      } else if (property == null) {
        if (fieldPlan.nonNull) {
          throw new Error(
            `Cannot return null for non-nullable field ${parentType.name}.${fieldPlan.fieldDef.name}.`,
          );
        }
        return null;
      } else {
        result = property;
      }
    } else {
      const info = buildPlannedResolveInfo(exeContext, fieldPlan, path, fieldNodes);
      const args = getFieldArgumentValues(
        fieldPlan.fieldDef,
        fieldNodes[0],
        exeContext.variableValues,
        fieldPlan.argumentReader,
        fieldPlan.readArguments,
      );
      const resolveFn = fieldPlan.fieldDef.resolve ?? exeContext.fieldResolver;
      result = resolveFn(source, args, exeContext.contextValue, info);
    }
    if (isPromise(result)) {
      return result.then(
        resolved =>
          completePlannedLeafListValue(
            exeContext,
            fieldPlan,
            fieldNodes,
            path,
            resolved,
            getRunner,
            writeField,
          ),
        rawError => handleFieldError(locate(rawError), fieldPlan.returnType, errors),
      );
    }
    return completePlannedLeafListValue(
      exeContext,
      fieldPlan,
      fieldNodes,
      path,
      result,
      getRunner,
      writeField,
    );
  } catch (rawError) {
    // Non-null list-item failures throw out of completion; handle against the
    // field's return type so nullable lists become null (same as executeField).
    return handleFieldError(locate(rawError), fieldPlan.returnType, errors);
  }
}
/**
 * Thin leaf-list completion: indexed serialize loop + runner.awaitValue for
 * thenable items (no Promise.all, no per-item completeValue / plan lookup).
 */

function completePlannedLeafListValue(
  exeContext: ExecutionContext,
  fieldPlan: LeafListFieldPlan,
  fieldNodes: Array<FieldNode>,
  path: Path,
  result: unknown,
  getRunner: () => PlannedWorkRunner,
  writeField: (value: unknown) => void,
): MaybePromise<ReadonlyArray<unknown> | null> {
  const errors = exeContext.errors;
  const returnType = fieldPlan.returnType;
  const listType = (
    isNonNullType(returnType) ? returnType.ofType : returnType
  ) as GraphQLList<GraphQLOutputType>;
  const itemType = listType.ofType;
  if (result == null) {
    if (fieldPlan.nonNull) {
      throw new Error(
        `Cannot return null for non-nullable field ${fieldPlan.parentType.name}.${fieldPlan.fieldDef.name}.`,
      );
    }
    return null;
  }
  if (result instanceof Error) {
    throw result;
  }
  if (isAsyncIterable(result)) {
    // Async iterables keep the classic path (stream / incremental aware).
    const info = buildPlannedResolveInfo(exeContext, fieldPlan, path, fieldNodes);
    return completeListValue(exeContext, listType, fieldNodes, info, path, result);
  }
  if (!isIterableObject(result)) {
    const info = buildPlannedResolveInfo(exeContext, fieldPlan, path, fieldNodes);
    throw new GraphQLError(
      `Expected Iterable, but did not find one for field "${info.parentType.name}.${info.fieldName}".`,
    );
  }
  const leafType = fieldPlan.leafType;
  const itemNonNull = fieldPlan.itemNonNull;
  const parentFieldName = fieldPlan.fieldDef.name;
  const parentTypeName = fieldPlan.parentType.name;
  const coordinateInfo =
    exeContext.schemaCoordinateInErrors &&
    schemaCoordinateInfo(fieldPlan.fieldDef, fieldPlan.parentType);
  // GraphQLString + primitive: skip full scalar coerce (matches compile bench).
  // GraphQL 16 String.serialize rejects bigint; keep that behavior.
  const stringLeafFast = leafType.name === 'String';
  const stringFastAllowsBigint = isGraphQL17;
  // Fast sync array of primitives: serialize in place, no runner, no isPromise
  // reads (thenable getters must stay on the general path's 2-read contract).
  // Seed for a mid-list thenable serialize so the general path does not
  // re-invoke the serializer on that index.
  let pendingSerialize:
    { index: number; promise: PromiseLike<unknown>; completedResults: Array<unknown> } | undefined;
  if (usesDefaultArrayIterator(result)) {
    let allPrimitive = true;
    for (let i = 0; i < result.length; i++) {
      const item = result[i];
      const t = typeof item;
      if (item == null || (t !== 'number' && t !== 'string' && t !== 'boolean' && t !== 'bigint')) {
        allPrimitive = false;
        break;
      }
      // GraphQL 16 String.serialize rejects bigint; skip the String() fast path.
      if (t === 'bigint' && stringLeafFast && !stringFastAllowsBigint) {
        allPrimitive = false;
        break;
      }
    }
    if (allPrimitive) {
      const completedResults: Array<unknown> = new Array(result.length);
      if (stringLeafFast) {
        // GraphQLString + primitives: avoid full scalar coerceOutputValueObject.
        // Non-finite numbers must take serialize (throws) — do not String(NaN).
        let fastOk = true;
        for (let i = 0; i < result.length; i++) {
          const v = result[i];
          const t = typeof v;
          if (t === 'number') {
            if (!Number.isFinite(v as number)) {
              fastOk = false;
              break;
            }
            completedResults[i] = String(v);
          } else if (t === 'string') {
            completedResults[i] = v;
          } else if (t === 'boolean') {
            completedResults[i] = v ? 'true' : 'false';
          } else if (t === 'bigint' && stringFastAllowsBigint) {
            completedResults[i] = String(v);
          } else {
            fastOk = false;
            break;
          }
        }
        if (fastOk) {
          return completedResults;
        }
        // Fall through to serialize loop for NaN/Infinity error paths.
      }
      let ok = true;
      for (let i = 0; i < result.length; i++) {
        try {
          const serialized = leafType.serialize(result[i]);
          if (serialized == null) {
            ok = false;
            break;
          }
          if (isPromise(serialized)) {
            // Keep the first thenable; general path settles it (no re-serialize).
            pendingSerialize = { index: i, promise: serialized, completedResults };
            ok = false;
            break;
          }
          completedResults[i] = serialized;
        } catch (rawError) {
          // Nullable list: null the slot and keep going; NonNull: bubble field.
          const itemPath = addPath(path, i, undefined);
          const error = locatedError(
            coerceError(rawError),
            fieldNodes,
            pathToArray(itemPath),
            coordinateInfo,
          );
          filterSubsequentPayloads(exeContext, itemPath, undefined);
          try {
            completedResults[i] = handleFieldError(error, itemType, errors);
          } catch (bubble) {
            writeField(handleFieldError(bubble as GraphQLError, returnType, errors));
            return null;
          }
        }
      }
      if (ok) {
        return completedResults;
      }
      // Thenable serialize mid-list — continue below with pendingSerialize seed.
    }
  }

  const completedResults: Array<unknown> = pendingSerialize
    ? pendingSerialize.completedResults
    : usesDefaultArrayIterator(result)
      ? new Array(result.length)
      : [];
  let listBubbled: unknown;
  // Track the field-local runner actually allocated for item thenables so a
  // NonNull bubble can forceSettle without waiting on never-settling siblings.
  let listRunner: PlannedWorkRunner | undefined;
  const getListRunner = (): PlannedWorkRunner => {
    listRunner = getRunner();
    return listRunner;
  };
  const bubbleListField = (rawError: unknown, index: number): void => {
    if (listBubbled !== undefined) {
      return;
    }
    const itemPath = addPath(path, index, undefined);
    const error = locatedError(
      coerceError(rawError),
      fieldNodes,
      pathToArray(itemPath),
      coordinateInfo,
    );
    filterSubsequentPayloads(exeContext, itemPath, undefined);
    // Non-null item failure nulls the whole list field (field return type).
    listBubbled = handleFieldError(error, returnType, errors);
    writeField(listBubbled);
    // Fail-fast: remaining item promises must not keep the field-local runner
    // busy (classic Promise.all rejects the aggregate and does not wait).
    listRunner?.forceSettle();
  };
  const writeItem = (index: number, item: unknown): void => {
    if (listBubbled !== undefined) {
      return;
    }
    try {
      const completed = completePlannedLeafListItemAtIndex(
        item,
        leafType,
        itemNonNull,
        itemType,
        fieldNodes,
        path,
        index,
        errors,
        exeContext,
        parentFieldName,
        parentTypeName,
        coordinateInfo,
      );
      // serialize() may return a thenable (async scalars).
      if (isPromise(completed)) {
        getListRunner().awaitValue(
          completed,
          resolved => {
            if (listBubbled === undefined) {
              completedResults[index] = resolved;
            }
          },
          rawError => {
            try {
              completedResults[index] = handlePlannedLeafListItemError(
                rawError,
                itemType,
                fieldNodes,
                path,
                index,
                errors,
                exeContext,
                coordinateInfo,
              );
            } catch (bubble) {
              bubbleListField(bubble, index);
            }
          },
        );
      } else {
        completedResults[index] = completed;
      }
    } catch (rawError) {
      bubbleListField(rawError, index);
    }
  };
  const settleSerializedPromise = (index: number, serialized: PromiseLike<unknown>): void => {
    getListRunner().awaitValue(
      serialized,
      resolved => {
        if (listBubbled !== undefined) {
          return;
        }
        if (resolved == null) {
          try {
            completedResults[index] = handlePlannedLeafListItemError(
              new Error(
                `Expected \`${inspect(leafType)}.serialize(...)\` to return non-nullable value, returned: ${inspect(resolved)}`,
              ),
              itemType,
              fieldNodes,
              path,
              index,
              errors,
              exeContext,
              coordinateInfo,
            );
          } catch (bubble) {
            bubbleListField(bubble, index);
          }
          return;
        }
        completedResults[index] = resolved;
      },
      rawError => {
        try {
          completedResults[index] = handlePlannedLeafListItemError(
            rawError,
            itemType,
            fieldNodes,
            path,
            index,
            errors,
            exeContext,
            coordinateInfo,
          );
        } catch (bubble) {
          bubbleListField(bubble, index);
        }
      },
    );
  };
  const consumeItem = (index: number, item: unknown): boolean => {
    if (listBubbled !== undefined) {
      return false;
    }
    if (isPromise(item)) {
      // Hot async-list path: serialize in the then-callback (skip writeItem frame).
      getListRunner().awaitValue(
        item,
        resolved => {
          if (listBubbled !== undefined) {
            return;
          }
          if (resolved != null && !(resolved instanceof Error)) {
            const rt = typeof resolved;
            if (rt !== 'object' && rt !== 'function') {
              try {
                const canStringFast =
                  stringLeafFast &&
                  (rt === 'string' ||
                    rt === 'boolean' ||
                    (rt === 'number' && Number.isFinite(resolved as number)) ||
                    (rt === 'bigint' && stringFastAllowsBigint));
                if (canStringFast) {
                  completedResults[index] =
                    rt === 'string'
                      ? resolved
                      : rt === 'boolean'
                        ? resolved
                          ? 'true'
                          : 'false'
                        : String(resolved);
                  return;
                }
                const serialized = leafType.serialize(resolved);
                if (serialized != null && !isPromise(serialized)) {
                  completedResults[index] = serialized;
                  return;
                }
                if (isPromise(serialized)) {
                  settleSerializedPromise(index, serialized);
                  return;
                }
              } catch (rawError) {
                try {
                  completedResults[index] = handlePlannedLeafListItemError(
                    rawError,
                    itemType,
                    fieldNodes,
                    path,
                    index,
                    errors,
                    exeContext,
                    coordinateInfo,
                  );
                } catch (bubble) {
                  bubbleListField(bubble, index);
                }
                return;
              }
            }
          }
          writeItem(index, resolved);
        },
        rawError => {
          try {
            completedResults[index] = handlePlannedLeafListItemError(
              rawError,
              itemType,
              fieldNodes,
              path,
              index,
              errors,
              exeContext,
              coordinateInfo,
            );
          } catch (bubble) {
            bubbleListField(bubble, index);
          }
        },
      );
      return true;
    }
    writeItem(index, item);
    return listBubbled === undefined;
  };
  // Prefer indexed arrays with the default iterator; custom iterators and other
  // iterables use for-of so yielded values win and NonNull bubbles can stop
  // without eagerly consuming the rest (generators' `finally`).
  if (pendingSerialize) {
    settleSerializedPromise(pendingSerialize.index, pendingSerialize.promise);
  }
  if (usesDefaultArrayIterator(result)) {
    const startIndex = pendingSerialize ? pendingSerialize.index + 1 : 0;
    for (let index = startIndex; index < result.length; index++) {
      if (!consumeItem(index, result[index])) {
        break;
      }
    }
  } else {
    let index = 0;
    for (const item of result as Iterable<unknown>) {
      if (!consumeItem(index, item)) {
        break;
      }
      index++;
    }
  }
  if (listBubbled !== undefined) {
    return listBubbled as null;
  }
  return completedResults;
}

function completePlannedLeafListItemAtIndex(
  result: unknown,
  leafType: GraphQLLeafType,
  itemNonNull: boolean,
  itemType: GraphQLOutputType,
  fieldNodes: Array<FieldNode>,
  path: Path,
  index: number,
  errors: Array<GraphQLError>,
  exeContext: ExecutionContext,
  parentFieldName: string,
  parentTypeName: string,
  coordinateInfo?: { fieldName: string; parentType: GraphQLObjectType } | false | null,
): unknown {
  try {
    if (result instanceof Error) {
      throw result;
    }
    if (result == null) {
      if (itemNonNull) {
        throw new Error(
          `Cannot return null for non-nullable field ${parentTypeName}.${parentFieldName}.`,
        );
      }
      return null;
    }
    return completeLeafValue(leafType, result);
  } catch (rawError) {
    return handlePlannedLeafListItemError(
      rawError,
      itemType,
      fieldNodes,
      path,
      index,
      errors,
      exeContext,
      coordinateInfo,
    );
  }
}

function handlePlannedLeafListItemError(
  rawError: unknown,
  itemType: GraphQLOutputType,
  fieldNodes: Array<FieldNode>,
  path: Path,
  index: number,
  errors: Array<GraphQLError>,
  exeContext: ExecutionContext,
  coordinateInfo?: { fieldName: string; parentType: GraphQLObjectType } | false | null,
): unknown {
  const itemPath = addPath(path, index, undefined);
  const error = locatedError(
    coerceError(rawError),
    fieldNodes,
    pathToArray(itemPath),
    coordinateInfo,
  );
  // NonNull item types throw here — caller catches and nulls the list field.
  const handled = handleFieldError(error, itemType, errors);
  filterSubsequentPayloads(exeContext, itemPath, undefined);
  return handled;
}

/**
 * Memoized per-fieldDef leaf shape so executeField does not repeat
 * isNonNullType / isLeafType / args.length on every execution.
 * `null` means "not eligible for the default-resolver leaf fast path".
 *
 * Eligibility also requires the effective resolver to be defaultFieldResolver:
 * that check is done by the caller because when `fieldDef.resolve` is unset the
 * effective resolver is `exeContext.fieldResolver` (per-execution, not
 * memoizable on fieldDef). Explicit `resolve: defaultFieldResolver` is allowed.
 */
type LeafFieldMemo = {
  leafType: GraphQLLeafType;
  nonNull: boolean;
  hasArgs: boolean;
  name: string;
};

const LEAF_FIELD_MEMO = Symbol.for('@graphql-tools/executor.leafFieldMemo');

function getLeafFieldMemo(fieldDef: GraphQLField<unknown, unknown>): LeafFieldMemo | null {
  const cached = (fieldDef as { [LEAF_FIELD_MEMO]?: LeafFieldMemo | null })[LEAF_FIELD_MEMO];
  if (cached !== undefined) {
    return cached;
  }
  const fieldResolve = fieldDef.resolve;
  // Custom resolve ⇒ never take the default-property leaf path.
  // Explicit `resolve: defaultFieldResolver` is still eligible.
  if (fieldResolve != null && fieldResolve !== defaultFieldResolver) {
    (fieldDef as { [LEAF_FIELD_MEMO]?: LeafFieldMemo | null })[LEAF_FIELD_MEMO] = null;
    return null;
  }
  let type: GraphQLOutputType = fieldDef.type;
  let nonNull = false;
  if (isNonNullType(type)) {
    nonNull = true;
    type = type.ofType;
  }
  if (!isLeafType(type)) {
    (fieldDef as { [LEAF_FIELD_MEMO]?: LeafFieldMemo | null })[LEAF_FIELD_MEMO] = null;
    return null;
  }
  const memo: LeafFieldMemo = {
    leafType: type,
    nonNull,
    hasArgs: fieldDef.args.length > 0,
    name: fieldDef.name,
  };
  (fieldDef as { [LEAF_FIELD_MEMO]?: LeafFieldMemo | null })[LEAF_FIELD_MEMO] = memo;
  return memo;
}

/** `locatedError` only needs fieldName + parentType.name for schema coordinates. */
function schemaCoordinateInfo(
  fieldDef: GraphQLField<unknown, unknown>,
  parentType: GraphQLObjectType,
): { fieldName: string; parentType: GraphQLObjectType } {
  return { fieldName: fieldDef.name, parentType };
}

/**
 * True when the compiled plan still expects default-property resolve and the
 * live `fieldDef.resolve` / `fieldResolver` have not been swapped since compile.
 */
function isLiveDefaultPropertyResolve(
  fieldPlan: { resolveKind: string; fieldDef: GraphQLField<unknown, unknown> },
  exeContext: ExecutionContext,
): boolean {
  if (fieldPlan.resolveKind !== 'defaultProperty') {
    return false;
  }
  if (exeContext.fieldResolver !== defaultFieldResolver) {
    return false;
  }
  const live = fieldPlan.fieldDef.resolve;
  return live == null || live === defaultFieldResolver;
}

/**
 * Indexed array completion is only valid for the default array iterator.
 * Custom `Symbol.iterator` on an array must use for-of (yielded values).
 */
function usesDefaultArrayIterator(value: unknown): value is unknown[] {
  return Array.isArray(value) && value[Symbol.iterator] === Array.prototype[Symbol.iterator];
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
  knownFieldPlan?: FieldPlan,
): MaybePromise<unknown> {
  const errors = asyncPayloadRecord?.errors ?? exeContext.errors;
  const fieldPlan: FieldPlan | undefined =
    knownFieldPlan ??
    (exeContext.plan ? getPlannedFieldPlan(exeContext.plan, fieldNodes, parentType) : undefined);
  const fieldDef = fieldPlan?.fieldDef ?? getFieldDef(exeContext.schema, parentType, fieldNodes[0]);
  if (!fieldDef) {
    return;
  }

  const returnType = fieldPlan?.returnType ?? fieldDef.type;
  const resolveFn = fieldDef.resolve ?? exeContext.fieldResolver;
  const resolveInfoForPath = (fieldPath: Path): GraphQLResolveInfo =>
    fieldPlan != null
      ? buildPlannedResolveInfo(exeContext, fieldPlan, fieldPath, fieldNodes)
      : buildResolveInfo(exeContext, fieldDef, fieldNodes, parentType, fieldPath);

  let info: GraphQLResolveInfo | undefined;

  // Get the resolve function, regardless of if its result is normal or abrupt (error).
  try {
    exeContext.signal?.throwIfAborted();

    // Memoized leaf + default resolver + plain property: skip buildResolveInfo,
    // defaultFieldResolver, and completeValue. completeValue stays monomorphic
    // for all other paths (always receives GraphQLResolveInfo).
    //
    // `resolveFn === defaultFieldResolver` cannot be memoized on fieldDef alone:
    // when fieldDef.resolve is unset, resolveFn is exeContext.fieldResolver
    // (per-execution). Gate it first so custom resolvers skip isObjectLike and
    // the Symbol memo lookup.
    //
    // Method / promise / Error properties must NOT fall through to
    // `resolveFn` after we already read `source[name]` — that double-read
    // regresses the async-object bench (~1000 method fields) by ~15–20%.
    // Instead: plain sync leaves serialize here; methods are invoked once with
    // the already-read function; promises/Errors go straight to completion.
    let result: unknown;
    let resolvedViaDefaultProperty = false;
    // True when `result` is already the leaf serialize output (possibly a
    // Promise). Skipping completeValue avoids a second serialize.
    let resultAlreadySerialized = false;

    // Planned schemaResolve fields skip the default-property leaf/list probes.
    // Live fieldDef.resolve wins over a stale defaultProperty compile kind.
    const mayUseDefaultPropertyPath =
      fieldPlan == null || isLiveDefaultPropertyResolve(fieldPlan, exeContext);
    if (
      mayUseDefaultPropertyPath &&
      resolveFn === defaultFieldResolver &&
      (isObjectLike(source) || typeof source === 'function')
    ) {
      // Prefer compile-time leaf facts from the plan; fall back to per-fieldDef memo.
      const plannedLeaf =
        fieldPlan?.kind === 'leaf'
          ? {
              leafType: fieldPlan.leafType,
              nonNull: fieldPlan.nonNull,
              hasArgs: fieldPlan.hasArgs,
              name: fieldPlan.fieldDef.name,
            }
          : null;
      const leafMemo = plannedLeaf ?? getLeafFieldMemo(fieldDef);
      if (leafMemo !== null) {
        let args: { [argument: string]: unknown } | undefined;
        if (leafMemo.hasArgs) {
          // Coerce before property read (graphql-js order / required-arg errors).
          args = getFieldArgumentValues(
            fieldDef,
            fieldNodes[0],
            exeContext.variableValues,
            fieldPlan?.argumentReader,
            fieldPlan?.readArguments,
          );
        }
        const property = (source as Record<string, unknown>)[leafMemo.name];
        if (typeof property === 'function') {
          // Same calling convention as defaultFieldResolver, with `this` =
          // source. Use .call so we do not re-read source[name].
          info = resolveInfoForPath(path);
          const methodArgs =
            args ??
            getFieldArgumentValues(
              fieldDef,
              fieldNodes[0],
              exeContext.variableValues,
              fieldPlan?.argumentReader,
              fieldPlan?.readArguments,
            );
          result = (
            property as (
              this: unknown,
              fieldArgs: typeof methodArgs,
              contextValue: unknown,
              resolveInfo: GraphQLResolveInfo,
            ) => unknown
          ).call(source, methodArgs, exeContext.contextValue, info);
          resolvedViaDefaultProperty = true;
        } else if (property instanceof Error) {
          throw property;
        } else if (isPromise(property)) {
          info = resolveInfoForPath(path);
          result = property;
          resolvedViaDefaultProperty = true;
        } else {
          if (property == null) {
            if (leafMemo.nonNull) {
              throw new Error(
                `Cannot return null for non-nullable field ${parentType.name}.${leafMemo.name}.`,
              );
            }
            return null;
          }
          let serialized: unknown;
          try {
            serialized = leafMemo.leafType.serialize(property);
          } catch (err) {
            if (err instanceof GraphQLError) {
              throw new Error(err.message);
            }
            throw err;
          }
          if (isPromise(serialized)) {
            // Rare async serialize: same as completeLeafValue — return the
            // serialize promise as the completed value (do not completeValue,
            // which would serialize again on fulfillment).
            info = resolveInfoForPath(path);
            result = serialized;
            resolvedViaDefaultProperty = true;
            resultAlreadySerialized = true;
          } else if (serialized == null) {
            throw new Error(
              `Expected \`${inspect(leafMemo.leafType)}.serialize(${inspect(property)})\` to ` +
                `return non-nullable value, returned: ${inspect(serialized)}`,
            );
          } else {
            return serialized;
          }
        }
      } else if (fieldPlan?.kind === 'leafList') {
        // Planned list-of-leaf: still go through completeValue so thenable
        // detection stays a single isPromise read (see scalar-list-paths tests).
        // completeListValue uses listItemLeaf + an indexed array loop.
        if (fieldPlan.hasArgs) {
          getFieldArgumentValues(
            fieldDef,
            fieldNodes[0],
            exeContext.variableValues,
            fieldPlan.argumentReader,
            fieldPlan.readArguments,
          );
        }
        const property = (source as Record<string, unknown>)[fieldPlan.fieldDef.name];
        if (typeof property === 'function') {
          info = resolveInfoForPath(path);
          const args = getFieldArgumentValues(
            fieldDef,
            fieldNodes[0],
            exeContext.variableValues,
            fieldPlan.argumentReader,
            fieldPlan.readArguments,
          );
          result = (
            property as (
              this: unknown,
              fieldArgs: typeof args,
              contextValue: unknown,
              resolveInfo: GraphQLResolveInfo,
            ) => unknown
          ).call(source, args, exeContext.contextValue, info);
          resolvedViaDefaultProperty = true;
        } else if (property instanceof Error) {
          throw property;
        } else if (isPromise(property)) {
          info = resolveInfoForPath(path);
          result = property;
          resolvedViaDefaultProperty = true;
        } else if (property == null) {
          if (fieldPlan.nonNull) {
            throw new Error(
              `Cannot return null for non-nullable field ${parentType.name}.${fieldPlan.fieldDef.name}.`,
            );
          }
          return null;
        } else {
          info = resolveInfoForPath(path);
          result = property;
          resolvedViaDefaultProperty = true;
        }
      }
    }

    if (!resolvedViaDefaultProperty) {
      info = resolveInfoForPath(path);
      // Build a JS object of arguments from the field.arguments AST, using the
      // variables scope to fulfill any variable references. Empty-arg fields skip
      // coercion; list items reuse a memo keyed by fieldDef/fieldNode/variables.
      // Planned argument coercers skip AST walks on the warm path when safe.
      const args = getFieldArgumentValues(
        fieldDef,
        fieldNodes[0],
        exeContext.variableValues,
        fieldPlan?.argumentReader,
        fieldPlan?.readArguments,
      );

      // The resolve function's optional third argument is a context value that
      // is provided to every resolve function within an execution. It is commonly
      // used to represent an authenticated user, or request-specific caches.
      result = resolveFn(source, args, exeContext.contextValue, info);
    }

    let completed;
    if (resultAlreadySerialized) {
      completed = result;
    } else if (isPromise(result)) {
      completed = result.then(resolved =>
        completeValue(
          exeContext,
          returnType,
          fieldNodes,
          info!,
          path,
          resolved,
          asyncPayloadRecord,
        ),
      );
    } else {
      completed = completeValue(
        exeContext,
        returnType,
        fieldNodes,
        info!,
        path,
        result,
        asyncPayloadRecord,
      );
    }

    if (isPromise(completed)) {
      // Note: we don't rely on a `catch` method, but we do expect "thenable"
      // to take a second callback for the error case.
      return completed.then(undefined, rawError => {
        // Abort must not become a recoverable field error (nullable parents
        // would otherwise return a completed response after cancellation).
        exeContext.signal?.throwIfAborted();
        if (rawError instanceof AggregateError) {
          let result: unknown;
          for (let rawErrorItem of rawError.errors) {
            rawErrorItem = coerceError(rawErrorItem);
            const error = locatedError(
              rawErrorItem,
              fieldNodes,
              pathToArray(path),
              // locatedError only reads fieldName + parentType.name
              exeContext.schemaCoordinateInErrors &&
                (info ?? schemaCoordinateInfo(fieldDef, parentType)),
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
          exeContext.schemaCoordinateInErrors &&
            (info ?? schemaCoordinateInfo(fieldDef, parentType)),
        );
        const handledError = handleFieldError(error, returnType, errors);
        filterSubsequentPayloads(exeContext, path, asyncPayloadRecord);
        return handledError;
      });
    }
    return completed;
  } catch (rawError) {
    // Abort must not become a recoverable field error (nullable parents would
    // otherwise return a completed response after cancellation).
    exeContext.signal?.throwIfAborted();
    if (rawError instanceof AggregateError) {
      let result: unknown;
      for (let rawErrorItem of rawError.errors) {
        rawErrorItem = coerceError(rawErrorItem);
        const error = locatedError(
          rawErrorItem,
          fieldNodes,
          pathToArray(path),
          exeContext.schemaCoordinateInErrors &&
            (info ?? schemaCoordinateInfo(fieldDef, parentType)),
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
      exeContext.schemaCoordinateInErrors && (info ?? schemaCoordinateInfo(fieldDef, parentType)),
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

/**
 * Warm plan path: reuse compiled fieldName / returnType / parentType.
 * Prefer runtime-collected `fieldNodes` when provided so skip/include order
 * matches classic collect (union plan nodes can include skipped occurrences).
 */
function buildPlannedResolveInfo(
  exeContext: ExecutionContext,
  fieldPlan: FieldPlan,
  path: Path,
  fieldNodes?: ReadonlyArray<FieldNode> | Array<FieldNode>,
): GraphQLResolveInfo {
  const staticInfo = fieldPlan.resolveInfoStatic;
  return {
    fieldName: staticInfo.fieldName,
    fieldNodes: fieldNodes ?? staticInfo.fieldNodes,
    returnType: staticInfo.returnType,
    parentType: staticInfo.parentType,
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

  // Warm plan: dispatch by compiled kind (after NonNull unwrap) so
  // hot paths skip repeated isListType / isLeafType / isAbstractType / isObjectType.
  // Only when `returnType` is this field's planned named type — list-item
  // completion reuses the same fieldNodes but a different item returnType.
  // Skip plan lookup for list items (`path.key` number): the WeakMap get on
  // every promise callback regresses dense async leaf lists.
  const fieldPlan =
    typeof path.key === 'number' || exeContext.plan == null
      ? undefined
      : getPlannedFieldPlan(exeContext.plan, fieldNodes, info.parentType);
  const plannedNamedType =
    fieldPlan != null
      ? isNonNullType(fieldPlan.returnType)
        ? fieldPlan.returnType.ofType
        : fieldPlan.returnType
      : undefined;
  if (fieldPlan != null && returnType === plannedNamedType) {
    switch (fieldPlan.kind) {
      case 'leaf':
        return completeLeafValue(fieldPlan.leafType, result);
      case 'leafList':
      case 'list':
        if (!isListType(returnType)) {
          break;
        }
        return completeListValue(
          exeContext,
          returnType,
          fieldNodes,
          info,
          path,
          result,
          asyncPayloadRecord,
        );
      case 'abstract':
        return completeAbstractValue(
          exeContext,
          returnType as GraphQLAbstractType,
          fieldNodes,
          info,
          path,
          result,
          asyncPayloadRecord,
        );
      case 'object':
        return completeObjectValue(
          exeContext,
          fieldPlan.objectType,
          fieldNodes,
          info,
          path,
          result,
          asyncPayloadRecord,
        );
    }
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
  // Stage A shape: non-incremental plan attached ⇒ no @stream.
  const plan = exeContext.plan;
  if (plan != null && !plan.hasIncremental) {
    return;
  }

  // do not stream inner lists of multi-dimensional lists
  if (typeof path.key === 'number') {
    return;
  }

  // Incremental plan: use compiled stream facts when present.
  if (plan != null) {
    const planned =
      plan.fieldPlanByNodes.get(fieldNodes) ?? plan.fieldPlanByFieldNode.get(fieldNodes[0]!);
    const stream = planned?.stream;
    // Only trust an explicit `none`. Missing stream metadata can happen when
    // mixed @skip/@include extremes omitted the field at compile time; fall
    // through to directive parsing so runtime @stream still works.
    if (stream?.kind === 'none') {
      return;
    }
    if (stream != null && stream.kind === 'static') {
      const initialCount = stream.initialCount;
      // Same validation as getStreamUsageMemo (thrown as field errors upstream).
      invariant(typeof initialCount === 'number', 'initialCount must be a number');
      invariant(initialCount >= 0, 'initialCount must be a positive integer');
      return {
        initialCount,
        label: stream.label,
      };
    }
    // dynamic → getDirectiveValues below
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
      // Abort cleanup is best-effort: contain synchronous throws and rejected promises
      // without waiting for cleanup or preventing other abort handlers from running.
      handleMaybePromise(
        () => iterator.return?.(),
        () => {},
        () => {},
      );
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
  const nullableItemType = isNonNullType(itemType) ? itemType.ofType : itemType;
  const fieldPlan = exeContext.plan
    ? getPlannedFieldPlan(exeContext.plan, fieldNodes, info.parentType)
    : undefined;
  const plannedLeafList = !stream && fieldPlan?.kind === 'leafList' ? fieldPlan : undefined;
  const leafItemType =
    plannedLeafList?.leafType ??
    (!stream && isLeafType(nullableItemType) ? nullableItemType : undefined);

  // Dense arrays with the default iterator: indexed loop avoids iterator
  // protocol. Custom array iterators must use for-of (yielded values).
  // Planned listItemLeaf skips repeated isLeafType classification.
  if (usesDefaultArrayIterator(result) && !stream) {
    for (let index = 0; index < result.length; index++) {
      if (leafItemType) {
        if (
          completeListItemValue(
            result[index],
            completedResults,
            errors,
            exeContext,
            itemType,
            fieldNodes,
            info,
            path,
            asyncPayloadRecord,
            leafItemType,
            index,
          )
        ) {
          containsPromise = true;
        }
      } else if (
        completeListItemValue(
          result[index],
          completedResults,
          errors,
          exeContext,
          itemType,
          fieldNodes,
          info,
          addPath(path, index, undefined),
          asyncPayloadRecord,
        )
      ) {
        containsPromise = true;
      }
    }
    return settleListResults(exeContext, completedResults, containsPromise);
  }

  let index = 0;
  for (const item of result) {
    // No need to modify the info object containing the path,
    // since from here on it is not ever accessed by resolver functions.
    // Leaf completion can defer the indexed path; stream payloads retain it.
    const itemPath = leafItemType ? path : addPath(path, index, undefined);

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
        leafItemType,
        leafItemType ? index : undefined,
      )
    ) {
      containsPromise = true;
    }

    index++;
  }

  return settleListResults(exeContext, completedResults, containsPromise);
}

/**
 * Sync iterable lists: when a planned runner is active, lift thenable slots
 * onto `awaitValue` so the field-set's `runUntilSettled` waits (no Promise.all).
 * Async-iterator lists keep real Promise elements and use `Promise.all` below.
 */
function settleListResults(
  exeContext: ExecutionContext,
  completedResults: Array<unknown>,
  containsPromise: boolean,
): MaybePromise<ReadonlyArray<unknown>> {
  if (!containsPromise) {
    return completedResults;
  }
  const runner = exeContext.plannedRunner;
  if (runner != null) {
    for (let index = 0; index < completedResults.length; index++) {
      const value = completedResults[index];
      if (isPromise(value)) {
        const slot = index;
        runner.awaitValue(
          value,
          resolved => {
            completedResults[slot] = resolved;
          },
          _reason => {
            completedResults[slot] = null;
          },
        );
        completedResults[slot] = undefined;
      }
    }
    return completedResults;
  }
  return Promise.all(completedResults);
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
  path: Path,
  asyncPayloadRecord?: AsyncPayloadRecord,
  leafItemType?: GraphQLLeafType,
  itemIndex?: number,
): boolean {
  // Scalar serialization receives no indexed resolve info. Keep one completion
  // and error pipeline, materializing its path only when the result needs one.
  let itemPath = itemIndex === undefined ? path : undefined;
  try {
    let completedItem;
    const itemIsPromise = isPromise(item);
    if (leafItemType && item != null && !(item instanceof Error) && !itemIsPromise) {
      completedItem = completeLeafValue(leafItemType, item);
    } else if (leafItemType && itemIsPromise) {
      // Promised leaf items: serialize in the then-callback without completeValue
      // (avoids plan/type-dispatch overhead on dense async leaf lists).
      itemPath ??= itemIndex === undefined ? path : addPath(path, itemIndex, undefined);
      const itemNonNull = isNonNullType(itemType);
      const parentFieldName = info.fieldName;
      const parentTypeName = info.parentType.name;
      completedItem = item.then(resolved => {
        if (resolved instanceof Error) {
          throw resolved;
        }
        if (resolved == null) {
          if (itemNonNull) {
            throw new Error(
              `Cannot return null for non-nullable field ${parentTypeName}.${parentFieldName}.`,
            );
          }
          return null;
        }
        return completeLeafValue(leafItemType, resolved);
      });
    } else {
      itemPath ??= itemIndex === undefined ? path : addPath(path, itemIndex, undefined);
      if (itemIsPromise) {
        const resolvedItemPath = itemPath;
        completedItem = item.then(resolved =>
          completeValue(
            exeContext,
            itemType,
            fieldNodes,
            info,
            resolvedItemPath,
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
    }

    if (isPromise(completedItem)) {
      itemPath ??= itemIndex === undefined ? path : addPath(path, itemIndex, undefined);
      const completedItemPath = itemPath;
      // Note: we don't rely on a `catch` method, but we do expect "thenable"
      // to take a second callback for the error case.
      // Always push a real Promise so async-iterator paths can `Promise.all`.
      // Sync iterables lift these onto the planned runner in `settleListResults`.
      completedResults.push(
        completedItem.then(undefined, rawError => {
          rawError = coerceError(rawError);
          const error = locatedError(
            rawError,
            fieldNodes,
            pathToArray(completedItemPath),
            exeContext.schemaCoordinateInErrors && info,
          );
          const handledError = handleFieldError(error, itemType, errors);
          filterSubsequentPayloads(exeContext, completedItemPath, asyncPayloadRecord);
          return handledError;
        }),
      );

      return true;
    }

    completedResults.push(completedItem);
  } catch (rawError) {
    itemPath ??= itemIndex === undefined ? path : addPath(path, itemIndex, undefined);
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
  // Warm plan path: concrete object fields without isTypeOf skip the predicate.
  const fieldPlan = exeContext.plan
    ? getPlannedFieldPlan(exeContext.plan, fieldNodes, info.parentType)
    : undefined;
  if (
    fieldPlan?.kind === 'object' &&
    fieldPlan.skipIsTypeOf &&
    fieldPlan.objectType === returnType &&
    returnType.isTypeOf == null
  ) {
    return collectAndExecuteSubfields(
      exeContext,
      returnType,
      fieldNodes,
      path,
      result,
      asyncPayloadRecord,
    );
  }

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

/**
 * Thin walk finished some children (e.g. getter errors) then must miss; carry them.
 * Tagged with a module-private symbol so ordinary GraphQL response objects
 * (including keys named `partial` / `results`) cannot be mistaken for a miss.
 */
const THIN_OBJECT_PARTIAL: unique symbol = Symbol('thinObjectPartial');

type ThinObjectPartial = {
  readonly [THIN_OBJECT_PARTIAL]: true;
  readonly results: Record<string, unknown>;
  readonly completed: ReadonlySet<string>;
  /** Leaf serialize() promises already started; settle instead of re-serializing. */
  readonly pendingLeaves?: ReadonlyMap<
    string,
    {
      promise: Promise<unknown>;
      fieldNodes: ReadonlyArray<FieldNode>;
      returnType: GraphQLOutputType;
    }
  >;
};

function isThinObjectPartial(value: unknown): value is ThinObjectPartial {
  return (
    typeof value === 'object' &&
    value != null &&
    (value as ThinObjectPartial)[THIN_OBJECT_PARTIAL] === true
  );
}

function thinObjectMiss(
  results: Record<string, unknown>,
  recordedGetterError: boolean,
  pendingLeaves?: ThinObjectPartial['pendingLeaves'],
): Record<string, unknown> | ThinObjectPartial | undefined {
  if (!recordedGetterError && (pendingLeaves == null || pendingLeaves.size === 0)) {
    return undefined;
  }
  const partial: ThinObjectPartial = {
    [THIN_OBJECT_PARTIAL]: true,
    results,
    completed: new Set(Object.keys(results)),
    pendingLeaves,
  };
  return partial;
}

/**
 * Finish a thin-walk partial: settle any carried leaf promises, then run only
 * remaining children via classic executeFields. Preserves the promise (never discards).
 */
function finishThinObjectPartial(
  exeContext: ExecutionContext,
  parentType: GraphQLObjectType,
  sourceValue: unknown,
  path: Path,
  plannedExecutions: ReadonlyArray<PlannedFieldExecution>,
  partial: ThinObjectPartial,
): MaybePromise<Record<string, unknown>> {
  const settlePendingLeaves = (): MaybePromise<void> => {
    const pending = partial.pendingLeaves;
    if (pending == null || pending.size === 0) {
      return;
    }
    const tasks: Promise<void>[] = [];
    for (const [responseName, leaf] of pending) {
      const fieldPath = addPath(path, responseName, parentType.name);
      tasks.push(
        leaf.promise.then(
          value => {
            partial.results[responseName] = value;
          },
          rawError => {
            const error = locatedError(
              coerceError(rawError),
              leaf.fieldNodes as Array<FieldNode>,
              pathToArray(fieldPath),
            );
            partial.results[responseName] = handleFieldError(
              error,
              leaf.returnType,
              exeContext.errors,
            );
          },
        ),
      );
    }
    return Promise.all(tasks).then(() => undefined);
  };

  return handleMaybePromise(settlePendingLeaves, () => {
    const remaining = plannedExecutions.filter(e => !partial.completed.has(e.responseName));
    // Fields settled via pendingLeaves are already in results but not in completed.
    const stillRemaining = remaining.filter(
      e => !Object.prototype.hasOwnProperty.call(partial.results, e.responseName),
    );
    if (stillRemaining.length === 0) {
      return partial.results;
    }
    const restFields = new Map<string, Array<FieldNode>>();
    for (const execution of stillRemaining) {
      restFields.set(execution.responseName, execution.fieldNodes as Array<FieldNode>);
    }
    return handleMaybePromise(
      () =>
        executeFields(
          exeContext,
          parentType,
          sourceValue,
          path,
          restFields,
          undefined,
          stillRemaining,
        ),
      rest => Object.assign(partial.results, rest),
    );
  });
}

function executeObjectItemViaFields(
  exeContext: ExecutionContext,
  parentType: GraphQLObjectType,
  sourceValue: unknown,
  path: Path,
  plannedExecutions: ReadonlyArray<PlannedFieldExecution>,
): MaybePromise<Record<string, unknown>> {
  const fields = new Map<string, Array<FieldNode>>();
  for (const execution of plannedExecutions) {
    fields.set(execution.responseName, execution.fieldNodes as Array<FieldNode>);
  }
  return executeFields(
    exeContext,
    parentType,
    sourceValue,
    path,
    fields,
    undefined,
    plannedExecutions,
  );
}

function executePlannedSyncObjectFields(
  exeContext: ExecutionContext,
  parentType: GraphQLObjectType,
  sourceValue: unknown,
  path: Path,
  plannedExecutions: ReadonlyArray<PlannedFieldExecution>,
): MaybePromise<Record<string, unknown> | ThinObjectPartial | undefined> {
  if (exeContext.fieldResolver !== defaultFieldResolver) {
    return undefined;
  }
  if (!isObjectLike(sourceValue) && typeof sourceValue !== 'function') {
    return undefined;
  }
  return executePlannedSyncObjectFieldsFrom(
    exeContext,
    parentType,
    sourceValue as Record<string, unknown>,
    path,
    plannedExecutions,
    0,
    Object.create(null) as Record<string, unknown>,
    false,
    undefined,
  );
}

function executePlannedSyncObjectFieldsFrom(
  exeContext: ExecutionContext,
  parentType: GraphQLObjectType,
  source: Record<string, unknown>,
  path: Path,
  plannedExecutions: ReadonlyArray<PlannedFieldExecution>,
  startIndex: number,
  results: Record<string, unknown>,
  recordedGetterError: boolean,
  pendingLeaves:
    | Map<
        string,
        {
          promise: Promise<unknown>;
          fieldNodes: ReadonlyArray<FieldNode>;
          returnType: GraphQLOutputType;
        }
      >
    | undefined,
): MaybePromise<Record<string, unknown> | ThinObjectPartial | undefined> {
  for (let index = startIndex; index < plannedExecutions.length; index++) {
    const execution = plannedExecutions[index];
    const { responseName, fieldNodes, fieldPlan } = execution;
    if (!isLiveDefaultPropertyResolve(fieldPlan, exeContext) || fieldPlan.hasArgs) {
      return thinObjectMiss(results, recordedGetterError, pendingLeaves);
    }
    let property: unknown;
    try {
      property = source[fieldPlan.fieldDef.name];
    } catch (rawError) {
      // Handle at this child field without retrying the getter (classic
      // executeField would re-read and can lose a one-shot throw).
      const fieldPath = addPath(path, responseName, parentType.name);
      const errors = exeContext.errors;
      if (rawError instanceof AggregateError) {
        let handled: unknown;
        for (let rawErrorItem of rawError.errors) {
          rawErrorItem = coerceError(rawErrorItem);
          const error = locatedError(
            rawErrorItem,
            fieldNodes,
            pathToArray(fieldPath),
            exeContext.schemaCoordinateInErrors &&
              schemaCoordinateInfo(fieldPlan.fieldDef, parentType),
          );
          handled = handleFieldError(error, fieldPlan.returnType, errors);
        }
        results[responseName] = handled;
      } else {
        const error = locatedError(
          coerceError(rawError),
          fieldNodes,
          pathToArray(fieldPath),
          exeContext.schemaCoordinateInErrors &&
            schemaCoordinateInfo(fieldPlan.fieldDef, parentType),
        );
        results[responseName] = handleFieldError(error, fieldPlan.returnType, errors);
      }
      recordedGetterError = true;
      // Match classic field loops: honor abort before reading the next sibling.
      exeContext.signal?.throwIfAborted();
      continue;
    }
    if (typeof property === 'function' || property instanceof Error) {
      return thinObjectMiss(results, recordedGetterError, pendingLeaves);
    }
    // Avoid isPromise on plain data (nested bench); only gate real thenables.
    if (property != null && typeof property === 'object' && isPromise(property)) {
      return thinObjectMiss(results, recordedGetterError, pendingLeaves);
    }
    if (fieldPlan.kind === 'leaf' && fieldPlan.leafType != null) {
      if (property == null) {
        if (fieldPlan.nonNull) {
          // NonNull bubble — classic path for exact error handling.
          return thinObjectMiss(results, recordedGetterError, pendingLeaves);
        }
        results[responseName] = null;
        continue;
      }
      try {
        const serialized = fieldPlan.leafType.serialize(property);
        if (serialized == null) {
          return thinObjectMiss(results, recordedGetterError, pendingLeaves);
        }
        if (isPromise(serialized)) {
          // Carry the already-started promise; do not re-invoke serialize on fallback.
          const leaves = pendingLeaves ?? new Map();
          leaves.set(responseName, {
            promise: serialized,
            fieldNodes,
            returnType: fieldPlan.returnType,
          });
          pendingLeaves = leaves;
          recordedGetterError = true;
          continue;
        }
        results[responseName] = serialized;
      } catch {
        return thinObjectMiss(results, recordedGetterError, pendingLeaves);
      }
      continue;
    }
    if (fieldPlan.kind === 'object' && fieldPlan.skipIsTypeOf && fieldPlan.objectType != null) {
      if (property == null) {
        if (fieldPlan.nonNull) {
          return thinObjectMiss(results, recordedGetterError, pendingLeaves);
        }
        results[responseName] = null;
        continue;
      }
      if (!isObjectLike(property)) {
        return thinObjectMiss(results, recordedGetterError, pendingLeaves);
      }
      const plan = exeContext.plan;
      if (plan == null) {
        return thinObjectMiss(results, recordedGetterError, pendingLeaves);
      }
      const rawSub = getPlannedSubfieldExecutions(plan, fieldNodes, fieldPlan.objectType);
      if (rawSub == null) {
        return thinObjectMiss(results, recordedGetterError, pendingLeaves);
      }
      const childPath = addPath(path, responseName, parentType.name);
      const nestedSubExecutions = filterPlannedExecutions(rawSub, exeContext.variableValues);
      const applyNested = (
        nested: Record<string, unknown> | ThinObjectPartial | undefined,
      ): MaybePromise<Record<string, unknown> | ThinObjectPartial | undefined> => {
        if (isThinObjectPartial(nested)) {
          const finished = finishThinObjectPartial(
            exeContext,
            fieldPlan.objectType!,
            property,
            childPath,
            nestedSubExecutions,
            nested,
          );
          if (isPromise(finished)) {
            return finished.then(nestedResult => {
              results[responseName] = nestedResult;
              return executePlannedSyncObjectFieldsFrom(
                exeContext,
                parentType,
                source,
                path,
                plannedExecutions,
                index + 1,
                results,
                true,
                pendingLeaves,
              );
            });
          }
          results[responseName] = finished;
          recordedGetterError = true;
          return undefined; // signal: continue sync loop
        }
        if (nested === undefined) {
          // Nested walk fully declined. `thinObjectMiss(..., false)` can return
          // `undefined`, which this helper also uses as "continue sync loop" —
          // that collision skipped the current field (e.g. author with method
          // children). Force a partial so the parent finishes this field and
          // any later siblings via classic executeFields.
          return thinObjectMiss(results, true, pendingLeaves);
        }
        results[responseName] = nested;
        return undefined; // continue sync loop
      };
      try {
        const nested = executePlannedSyncObjectFields(
          exeContext,
          fieldPlan.objectType,
          property,
          childPath,
          nestedSubExecutions,
        );
        if (isPromise(nested)) {
          return nested.then(value => {
            const applied = applyNested(value);
            if (applied !== undefined) {
              return applied;
            }
            return executePlannedSyncObjectFieldsFrom(
              exeContext,
              parentType,
              source,
              path,
              plannedExecutions,
              index + 1,
              results,
              recordedGetterError,
              pendingLeaves,
            );
          });
        }
        const applied = applyNested(nested);
        if (applied !== undefined) {
          return applied;
        }
        continue;
      } catch (bubbled) {
        // NonNull child bubbled — stop at this nullable object field.
        exeContext.signal?.throwIfAborted();
        if (fieldPlan.nonNull) {
          throw bubbled;
        }
        const error =
          bubbled instanceof GraphQLError
            ? bubbled
            : locatedError(
                coerceError(bubbled),
                fieldNodes,
                pathToArray(childPath),
                exeContext.schemaCoordinateInErrors &&
                  schemaCoordinateInfo(fieldPlan.fieldDef, parentType),
              );
        results[responseName] = handleFieldError(error, fieldPlan.returnType, exeContext.errors);
        recordedGetterError = true;
        exeContext.signal?.throwIfAborted();
      }
      continue;
    }
    // List / Abstract / LeafList — decline.
    return thinObjectMiss(results, recordedGetterError, pendingLeaves);
  }
  // Propagate recorded child errors to the parent as a partial (all keys
  // completed) so a later sibling miss keeps this object and only finishes
  // remaining parent fields.
  if (recordedGetterError || (pendingLeaves != null && pendingLeaves.size > 0)) {
    return thinObjectMiss(results, true, pendingLeaves);
  }
  return results;
}

function collectAndExecuteSubfields(
  exeContext: ExecutionContext,
  returnType: GraphQLObjectType,
  fieldNodes: Array<FieldNode>,
  path: Path,
  result: unknown,
  asyncPayloadRecord?: AsyncPayloadRecord,
): MaybePromise<Record<string, unknown>> {
  // Warm path: planned subfields for this fieldNodes + concrete type.
  // Variable @skip/@include: filter union subfield executions when predicates
  // are available; otherwise collect with real variables.
  // Incremental plans still store non-patch subfield maps — do not use them.
  const plan = exeContext.plan;
  const plannedSubfields =
    plan != null &&
    !plan.hasIncremental &&
    (!plan.collectionDependsOnVariables || plan.skipIncludePredicates)
      ? getPlannedSubfields(plan, fieldNodes, returnType)
      : undefined;
  if (plannedSubfields && exeContext.nulledPaths == null) {
    let plannedExecutions =
      plan != null ? getPlannedSubfieldExecutions(plan, fieldNodes, returnType) : undefined;
    // Variable-dependent plans without a bound execution list cannot safely
    // walk the union subfield map — fall through to classic collect.
    if (!(plan?.skipIncludePredicates && plannedExecutions == null)) {
      if (plannedExecutions != null && plan?.skipIncludePredicates) {
        plannedExecutions = filterPlannedExecutions(
          plannedExecutions,
          exeContext.variableValues as VariableValues,
        );
      }
      // Sync nested objects (skipIsTypeOf): thin default-property walk without
      // per-field executeField / resolveInfo (nested default-resolver bench).
      if (
        plannedExecutions != null &&
        asyncPayloadRecord == null &&
        plan != null &&
        !plan.hasIncremental
      ) {
        const executions = plannedExecutions;
        return handleMaybePromise(
          () => executePlannedSyncObjectFields(exeContext, returnType, result, path, executions),
          thin => {
            if (thin !== undefined && !isThinObjectPartial(thin)) {
              return thin;
            }
            if (isThinObjectPartial(thin)) {
              // Getter errors / pending leaves already recorded — finish only
              // remaining children (and settle carried serialize promises).
              return finishThinObjectPartial(
                exeContext,
                returnType,
                result,
                path,
                executions,
                thin,
              );
            }
            return executeFields(
              exeContext,
              returnType,
              result,
              path,
              plannedSubfields,
              asyncPayloadRecord,
              executions,
            );
          },
        );
      }
      return executeFields(
        exeContext,
        returnType,
        result,
        path,
        plannedSubfields,
        asyncPayloadRecord,
        plannedExecutions,
      );
    }
  }

  // Collect sub-fields to execute to complete this value.
  const { fields: subFieldNodes, patches: subPatches } = collectSubfieldsFromContext(
    exeContext,
    returnType,
    fieldNodes,
  );

  if (subPatches.length === 0 && exeContext.nulledPaths == null) {
    return executeFields(exeContext, returnType, result, path, subFieldNodes, asyncPayloadRecord);
  }

  ensureIncrementalCollectState(exeContext);

  const parentDeferUsage =
    asyncPayloadRecord?.type === 'defer' ? asyncPayloadRecord.deferUsage : undefined;
  const subfieldCache = (exeContext.incrementalSubfieldCache ??= new WeakMap());
  let collectedByType = subfieldCache.get(fieldNodes);
  if (collectedByType == null) {
    collectedByType = new WeakMap();
    subfieldCache.set(fieldNodes, collectedByType);
  }
  let collected = collectedByType.get(returnType);
  if (collected == null) {
    collected = collectIncrementalSubfields(
      exeContext.schema,
      exeContext.fragments,
      exeContext.variableValues,
      returnType,
      fieldNodes,
      parentDeferUsage,
      exeContext.deferUsageByFieldNode,
    );
    collectedByType.set(returnType, collected);
  }
  const { groupedFieldSet } = collected;
  const parentDeferUsages = new Set<DeferUsage>();
  const plannedUsages = exeContext.deferUsagesForFieldNodes?.get(fieldNodes);
  if (plannedUsages) {
    for (const usage of plannedUsages) {
      parentDeferUsages.add(usage);
    }
  } else if (parentDeferUsage) {
    parentDeferUsages.add(parentDeferUsage);
  } else if (asyncPayloadRecord?.type === 'stream') {
    for (const node of fieldNodes) {
      const usage = exeContext.deferUsageByFieldNode?.get(node);
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
    groupedFieldSetToFieldMap(initialFields, exeContext.deferUsageByFieldNode),
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

/** True when `possibleAncestor` appears in `record`'s parentContext chain. */
function isAsyncPayloadAncestor(
  possibleAncestor: AsyncPayloadRecord,
  record: AsyncPayloadRecord,
): boolean {
  let current: AsyncPayloadRecord | undefined = record.parentContext;
  while (current) {
    if (current === possibleAncestor) {
      return true;
    }
    current = current.parentContext;
  }
  return false;
}

function filterSubsequentPayloads(
  exeContext: ExecutionContext,
  nullPath: Path | undefined,
  currentAsyncRecord: AsyncPayloadRecord | undefined,
): void {
  const nullPathArray = pathToArray(nullPath);
  const hasSubsequentPayloads = exeContext.subsequentPayloads.size > 0;
  // Record nulled paths only when incremental delivery is active. Allocating
  // `nulledPaths` on plain executions would force later object completions off
  // the direct subfield path. When subsequent payloads already exist (including
  // stream-only operations without @defer collect state), record the path so
  // later @stream indexes under it are skipped.
  if (exeContext.nulledPaths) {
    exeContext.nulledPaths.push(nullPathArray);
  } else if (hasSubsequentPayloads) {
    exeContext.nulledPaths = [nullPathArray];
  } else {
    return;
  }
  if (!hasSubsequentPayloads) {
    return;
  }
  exeContext.subsequentPayloads.forEach(asyncRecord => {
    if (asyncRecord === currentAsyncRecord || asyncRecord.cancelled) {
      // don't remove payload from where error originates
      return;
    }
    // Keep earlier @stream items that are ancestors of the failed record so
    // already-completed siblings (e.g. index 0) are still published.
    if (currentAsyncRecord && isAsyncPayloadAncestor(asyncRecord, currentAsyncRecord)) {
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
 * schema, __type and __typename. __typename is special because
 * it can always be queried as a field, even in situations where no
 * other fields are allowed, like on a Union. schema and __type
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
