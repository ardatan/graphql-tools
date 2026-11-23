import {
  FieldNode,
  FragmentDefinitionNode,
  GraphQLError,
  GraphQLObjectType,
  GraphQLSchema,
  Kind,
  OperationDefinitionNode,
  type DocumentNode,
} from 'graphql';
import {
  collectFields,
  collectFieldsDependsOnVariables,
  getDefinedRootType,
  VariableValues,
} from '@graphql-tools/utils';
import { compileVariableCoercer } from './planCoerce.js';
import {
  buildExecutionsFromSelectionSet,
  buildFieldExecutions,
  compileFieldMap,
  compilePatchFieldMaps,
  unionFieldMaps,
} from './planField.js';
import { EMPTY_VARIABLE_VALUES, INCREMENTAL_DIRECTIVES } from './planShared.js';
import type {
  CompileExecutionPlanArgs,
  FieldPlan,
  InternalExecutionPlan,
  PlannedFieldExecution,
} from './planTypes.js';

export type {
  ArgumentReader,
  CoerceVariables,
  CoerceVariablesResult,
  CompileExecutionPlanArgs,
  CompletionKind,
  InternalExecutionPlan,
  FieldPlan,
  LeafFieldPlan,
  LeafListFieldPlan,
  ListFieldPlan,
  ObjectFieldPlan,
  AbstractFieldPlan,
  PlannedFieldExecution,
  PlannedLeafList,
  ResolveKind,
  StreamPlan,
} from './planTypes.js';

export { filterPlannedExecutions, getPlannedSubfieldExecutions } from './planField.js';

type PlanCacheEntry =
  | { kind: 'plan'; plan: InternalExecutionPlan }
  | { kind: 'errors'; errors: ReadonlyArray<GraphQLError> };

/**
 * document -> schema -> operationName -> compiled entry.
 * Error results are remembered so we do not re-walk the AST every time.
 */
const planCache = new WeakMap<DocumentNode, WeakMap<GraphQLSchema, Map<string, PlanCacheEntry>>>();

type PlanExecuteFn = (plan: InternalExecutionPlan, args: Record<string, unknown>) => unknown;

/** Wired from execute.ts so plan modules do not import execute (cycle). */
let planExecuteImpl: PlanExecuteFn | undefined;

/** @internal Register `plan.execute` implementation from execute.ts. */
export function setPlanExecuteImpl(fn: PlanExecuteFn): void {
  planExecuteImpl = fn;
}

function sealExecutionPlan(plan: InternalExecutionPlan): InternalExecutionPlan {
  if (typeof (plan as { execute?: unknown }).execute === 'function') {
    return plan;
  }
  Object.defineProperty(plan, 'execute', {
    value(args: Record<string, unknown> = {}) {
      if (planExecuteImpl == null) {
        throw new Error('ExecutionPlan.execute is not initialized');
      }
      return planExecuteImpl(plan, args);
    },
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return plan;
}

/**
 * True when `compileExecutionPlan` returned a usable plan (not errors / skip).
 */
export function isExecutionPlan(
  value: InternalExecutionPlan | ReadonlyArray<GraphQLError> | undefined | null,
): value is InternalExecutionPlan {
  return (
    value != null &&
    !Array.isArray(value) &&
    typeof value === 'object' &&
    'rootFields' in value &&
    'schema' in value
  );
}

/**
 * Resolve a field plan for runtime fieldNodes (exact array or primary AST node).
 */
export function getPlannedFieldPlan(
  plan: InternalExecutionPlan,
  fieldNodes: ReadonlyArray<FieldNode>,
  parentType?: GraphQLObjectType,
): FieldPlan | undefined {
  // Exact array hit still requires parentType match: the same fieldNodes array
  // must not be reused under a different concrete parent (unions / interfaces).
  const byNodes = plan.fieldPlanByNodes.get(fieldNodes);
  if (byNodes != null && (parentType == null || byNodes.parentType === parentType)) {
    return byNodes;
  }
  // Same AST FieldNode can appear under multiple concrete parents (unions /
  // interfaces); only reuse when parentType matches the compiled plan.
  const byNode = plan.fieldPlanByFieldNode.get(fieldNodes[0]!);
  if (byNode != null && (parentType == null || byNode.parentType === parentType)) {
    return byNode;
  }
  return undefined;
}

/**
 * Resolve planned subfields for a parent fieldNodes array / primary AST node.
 */
export function getPlannedSubfields(
  plan: InternalExecutionPlan,
  fieldNodes: ReadonlyArray<FieldNode>,
  returnType: GraphQLObjectType,
): Map<string, Array<FieldNode>> | undefined {
  return (
    plan.subfieldsByNodes.get(fieldNodes)?.get(returnType) ??
    plan.subfieldsByFieldNode.get(fieldNodes[0]!)?.get(returnType)
  );
}

/**
 * Compile a cacheable execution plan for a validated operation.
 *
 * Variable `@skip` / `@include` use union collection + FieldNode keys.
 * `@defer` / `@stream` set `hasIncremental`; runtime keeps the incremental
 * interpreter while still using per-field plan facts. Returns a GraphQL error
 * list when the operation cannot be resolved.
 *
 * `execute` compiles/caches via {@link resolvePlanForExecute}.
 */
/**
 * Compile a cacheable execution plan for a validated operation.
 *
 * Returns an opaque {@link import('./executeTypes.js').ExecutionPlan} with
 * `plan.execute(...)`. Internal fields exist at runtime for the warm path but
 * are not part of the public TypeScript API.
 */
export function compileExecutionPlan(
  args: CompileExecutionPlanArgs,
): InternalExecutionPlan | ReadonlyArray<GraphQLError> | undefined {
  const cached = getCachedPlanEntry(args.schema, args.document, args.operationName);
  if (cached) {
    if (cached.kind === 'plan') {
      return sealExecutionPlan(cached.plan);
    }
    if (cached.kind === 'errors') {
      return cached.errors;
    }
    return undefined;
  }

  const entry = compileExecutionPlanUncached(args);
  setCachedPlanEntry(args.schema, args.document, args.operationName, entry);
  if (entry.kind === 'plan') {
    return sealExecutionPlan(entry.plan);
  }
  if (entry.kind === 'errors') {
    return entry.errors;
  }
  return undefined;
}

/**
 * Look up a previously compiled plan without compiling. Returns `undefined`
 * when missing or when compile stored errors.
 */
export function getExecutionPlan(
  schema: GraphQLSchema,
  document: DocumentNode,
  operationName?: string | null,
): InternalExecutionPlan | undefined {
  const cached = getCachedPlanEntry(schema, document, operationName);
  return cached?.kind === 'plan' ? sealExecutionPlan(cached.plan) : undefined;
}

/**
 * Resolve the plan for one `execute` / `buildExecutionContext` call.
 * Uses the WeakMap cache; compiles synchronously on a cache miss.
 */
export function resolvePlanForExecute(
  args: CompileExecutionPlanArgs,
): InternalExecutionPlan | undefined {
  const cached = getCachedPlanEntry(args.schema, args.document, args.operationName);
  if (cached?.kind === 'plan') {
    return sealExecutionPlan(cached.plan);
  }
  if (cached != null) {
    // errors: do not retry every request
    return undefined;
  }
  const result = compileExecutionPlan(args);
  return isExecutionPlan(result) ? result : undefined;
}

/**
 * Drop cached plans for a document (all schemas / operations). Useful when a
 * test mutates schema field configs that plans may have captured.
 */
export function clearExecutionPlanCache(document?: DocumentNode): void {
  if (document) {
    planCache.delete(document);
  }
  // WeakMap has no clear; callers pass a document when they need invalidation.
}

function operationCacheKey(operationName: string | null | undefined): string {
  // Omitted vs empty string must not share a key: `operationName: ''` is an
  // explicit unknown-name lookup, while omitted selects the lone anonymous op.
  return operationName == null ? 'omitted' : `name:${operationName}`;
}

function getCachedPlanEntry(
  schema: GraphQLSchema,
  document: DocumentNode,
  operationName: string | null | undefined,
): PlanCacheEntry | undefined {
  return planCache.get(document)?.get(schema)?.get(operationCacheKey(operationName));
}

function setCachedPlanEntry(
  schema: GraphQLSchema,
  document: DocumentNode,
  operationName: string | null | undefined,
  entry: PlanCacheEntry,
): void {
  let bySchema = planCache.get(document);
  if (!bySchema) {
    bySchema = new WeakMap();
    planCache.set(document, bySchema);
  }
  let byOperation = bySchema.get(schema);
  if (!byOperation) {
    byOperation = new Map();
    bySchema.set(schema, byOperation);
  }
  byOperation.set(operationCacheKey(operationName), entry);
}

function compileExecutionPlanUncached(args: CompileExecutionPlanArgs): PlanCacheEntry {
  const { schema, document, operationName } = args;

  const hasIncremental = documentHasIncrementalDirectives(document);

  const fragments = collectFragments(document);
  const operationResult = resolveOperation(document, operationName);
  if ('errors' in operationResult) {
    return { kind: 'errors', errors: operationResult.errors };
  }
  const { operation } = operationResult;

  let rootType: GraphQLObjectType;
  try {
    rootType = getDefinedRootType(schema, operation.operation, [operation]);
  } catch (error) {
    return {
      kind: 'errors',
      errors: [error instanceof GraphQLError ? error : new GraphQLError(String(error))],
    };
  }

  const collectionDependsOnVariables = collectFieldsDependsOnVariables(document);
  const skipIncludeVars = collectionDependsOnVariables
    ? collectSkipIncludeVariableNames(document)
    : undefined;
  const collectVariablesFalse = skipIncludeVars
    ? makeBoolVariableValues(skipIncludeVars, false)
    : EMPTY_VARIABLE_VALUES;
  const collectVariablesTrue = skipIncludeVars
    ? makeBoolVariableValues(skipIncludeVars, true)
    : EMPTY_VARIABLE_VALUES;

  let rootFields: Map<string, Array<FieldNode>>;
  let rootPatches: Array<{
    fields: Map<string, Array<FieldNode>>;
    patches?: Array<any>;
  }> = [];
  if (collectionDependsOnVariables) {
    const a = collectFields(
      schema,
      fragments,
      collectVariablesFalse,
      rootType,
      operation.selectionSet,
    );
    const b = collectFields(
      schema,
      fragments,
      collectVariablesTrue,
      rootType,
      operation.selectionSet,
    );
    rootFields = unionFieldMaps(a.fields, b.fields);
    rootPatches = [...a.patches, ...b.patches];
  } else {
    const { fields, patches } = collectFields(
      schema,
      fragments,
      EMPTY_VARIABLE_VALUES,
      rootType,
      operation.selectionSet,
    );
    rootFields = fields;
    rootPatches = [...patches];
  }

  const fieldPlanByNodes = new WeakMap<ReadonlyArray<FieldNode>, FieldPlan>();
  const fieldPlanByFieldNode = new WeakMap<FieldNode, FieldPlan>();
  const subfieldsByNodes = new WeakMap<
    ReadonlyArray<FieldNode>,
    WeakMap<GraphQLObjectType, Map<string, Array<FieldNode>>>
  >();
  const subfieldsByFieldNode = new WeakMap<
    FieldNode,
    WeakMap<GraphQLObjectType, Map<string, Array<FieldNode>>>
  >();
  const subfieldExecutionsByNodes = new WeakMap<
    ReadonlyArray<FieldNode>,
    WeakMap<GraphQLObjectType, ReadonlyArray<PlannedFieldExecution>>
  >();

  const variableDefinitions = operation.variableDefinitions ?? [];
  const coerceVariables = compileVariableCoercer(schema, variableDefinitions);
  // Bound execution lists only for non-incremental docs (incremental keeps
  // classic collect / deferred groups at runtime).
  const skipIncludePredicates = collectionDependsOnVariables && !hasIncremental;

  const plan: InternalExecutionPlan = {
    schema,
    document,
    operation,
    operationName: operationName ?? undefined,
    fragments,
    rootType,
    collectionDependsOnVariables,
    hasIncremental,
    rootFields,
    fieldPlanByNodes,
    fieldPlanByFieldNode,
    subfieldsByNodes,
    subfieldsByFieldNode,
    subfieldExecutionsByNodes,
    collectVariablesFalse,
    collectVariablesTrue,
    hasVariables: variableDefinitions.length > 0,
    coerceVariables,
    rootExecutions: undefined,
    skipIncludePredicates,
  };

  compileFieldMap(plan, rootType, rootFields);
  compilePatchFieldMaps(plan, rootType, rootPatches);
  if (!hasIncremental) {
    if (!collectionDependsOnVariables) {
      plan.rootExecutions = buildFieldExecutions(plan, rootType, rootFields);
    } else if (skipIncludePredicates) {
      // Conditional mutations with duplicate response names need classic
      // occurrence order (grouped plan executions preserve first-slot order).
      if (operation.operation === 'mutation') {
        plan.rootExecutions = undefined;
      } else {
        const rootExecutions = buildExecutionsFromSelectionSet(
          plan,
          rootType,
          operation.selectionSet,
          plan.rootFields,
        );
        if (rootExecutions == null) {
          // Mixed-extreme / defer-shaped selection; disable predicate path.
          plan.skipIncludePredicates = false;
        } else {
          plan.rootExecutions = rootExecutions;
        }
      }
    }
  }
  return { kind: 'plan', plan };
}

function makeBoolVariableValues(names: ReadonlySet<string>, value: boolean): VariableValues {
  // GraphQL 17 VariableValues is still `{ coerced, sources }` (from getVariableValues).
  const coerced = Object.create(null) as Record<string, unknown>;
  for (const name of names) {
    coerced[name] = value;
  }
  // Cast: compile-time only; sources are unused by shouldIncludeNode / getDirectiveValues
  // once `coerced` holds the bool extremes.
  return { coerced, sources: Object.create(null) } as VariableValues;
}

function collectSkipIncludeVariableNames(document: DocumentNode): Set<string> {
  const names = new Set<string>();
  for (const definition of document.definitions) {
    if (
      definition.kind === Kind.OPERATION_DEFINITION ||
      definition.kind === Kind.FRAGMENT_DEFINITION
    ) {
      collectSkipIncludeVarsFromSelectionSet(definition.selectionSet, names);
    }
  }
  return names;
}

function collectSkipIncludeVarsFromSelectionSet(
  selectionSet: { selections: ReadonlyArray<any> },
  names: Set<string>,
): void {
  for (const selection of selectionSet.selections) {
    if (selection.directives) {
      for (const directive of selection.directives) {
        const directiveName = directive.name.value as string;
        if (directiveName !== 'skip' && directiveName !== 'include') {
          continue;
        }
        for (const arg of directive.arguments ?? []) {
          if (arg.name.value === 'if' && arg.value.kind === Kind.VARIABLE) {
            names.add(arg.value.name.value);
          }
        }
      }
    }
    if (selection.selectionSet) {
      collectSkipIncludeVarsFromSelectionSet(selection.selectionSet, names);
    }
  }
}

function documentHasIncrementalDirectives(document: DocumentNode): boolean {
  for (const definition of document.definitions) {
    if (
      definition.kind === Kind.OPERATION_DEFINITION ||
      definition.kind === Kind.FRAGMENT_DEFINITION
    ) {
      if (selectionSetHasIncremental(definition.selectionSet)) {
        return true;
      }
    }
  }
  return false;
}

function selectionSetHasIncremental(selectionSet: {
  selections: ReadonlyArray<{
    kind: string;
    directives?: ReadonlyArray<{ name: { value: string } }>;
    selectionSet?: { selections: ReadonlyArray<any> };
  }>;
}): boolean {
  for (const selection of selectionSet.selections) {
    if (selection.directives) {
      for (const directive of selection.directives) {
        if (INCREMENTAL_DIRECTIVES.has(directive.name.value)) {
          return true;
        }
      }
    }
    if (selection.kind === Kind.FIELD && selection.selectionSet) {
      if (selectionSetHasIncremental(selection.selectionSet)) {
        return true;
      }
    } else if (selection.kind === Kind.INLINE_FRAGMENT && selection.selectionSet) {
      if (selectionSetHasIncremental(selection.selectionSet)) {
        return true;
      }
    }
  }
  return false;
}

function collectFragments(document: DocumentNode): Record<string, FragmentDefinitionNode> {
  const fragments = Object.create(null) as Record<string, FragmentDefinitionNode>;
  for (const definition of document.definitions) {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      fragments[definition.name.value] = definition;
    }
  }
  return fragments;
}

function resolveOperation(
  document: DocumentNode,
  operationName: string | null | undefined,
): { operation: OperationDefinitionNode } | { errors: ReadonlyArray<GraphQLError> } {
  let operation: OperationDefinitionNode | undefined;
  for (const definition of document.definitions) {
    if (definition.kind !== Kind.OPERATION_DEFINITION) {
      continue;
    }
    if (operationName == null) {
      if (operation !== undefined) {
        return {
          errors: [
            new GraphQLError('Must provide operation name if query contains multiple operations.', {
              extensions: {
                code: 'OPERATION_RESOLUTION_FAILURE',
              },
            }),
          ],
        };
      }
      operation = definition;
    } else if (definition.name?.value === operationName) {
      operation = definition;
    }
  }

  if (operation == null) {
    if (operationName != null) {
      return {
        errors: [
          new GraphQLError(`Unknown operation named "${operationName}".`, {
            extensions: {
              code: 'OPERATION_RESOLUTION_FAILURE',
            },
          }),
        ],
      };
    }
    return {
      errors: [
        new GraphQLError('Must provide an operation.', {
          extensions: {
            code: 'OPERATION_RESOLUTION_FAILURE',
          },
        }),
      ],
    };
  }

  return { operation };
}
