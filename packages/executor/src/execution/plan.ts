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
  beginPlanCompile,
  buildExecutionsFromSelectionSet,
  buildFieldExecutions,
  compileFieldMap,
  compilePatchFieldMaps,
  endPlanCompile,
  PlanCompileBudgetExceeded,
  unionFieldMaps,
} from './planField.js';
import { EMPTY_VARIABLE_VALUES, INCREMENTAL_DIRECTIVES } from './planShared.js';
import type {
  CompileExecutionPlanArgs,
  ExecutionPlan,
  FieldPlan,
  PlannedFieldExecution,
} from './planTypes.js';

export type {
  ArgumentReader,
  CoerceVariables,
  CoerceVariablesResult,
  CompileExecutionPlanArgs,
  FieldPlanKind,
  ExecutionPlan,
  FieldPlan,
  LeafFieldPlan,
  LeafListFieldPlan,
  ListFieldPlan,
  ObjectFieldPlan,
  AbstractFieldPlan,
  PlannedFieldExecution,
  ResolveKind,
  StreamPlan,
} from './planTypes.js';

export { filterPlannedExecutions, getPlannedSubfieldExecutions } from './planField.js';

type PlanCacheEntry =
  | { kind: 'plan'; plan: ExecutionPlan }
  | { kind: 'errors'; errors: ReadonlyArray<GraphQLError> }
  | { kind: 'ineligible' };

/**
 * document -> schema -> operationName -> compiled entry.
 * Error results are remembered so we do not re-walk the AST every time.
 */
const planCache = new WeakMap<DocumentNode, WeakMap<GraphQLSchema, Map<string, PlanCacheEntry>>>();

/**
 * True when `compileExecutionPlan` returned a usable plan (not errors / skip).
 */
export function isExecutionPlan(
  value: ExecutionPlan | ReadonlyArray<GraphQLError> | undefined | null,
): value is ExecutionPlan {
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
  plan: ExecutionPlan,
  fieldNodes: ReadonlyArray<FieldNode>,
  parentType?: GraphQLObjectType,
): FieldPlan | undefined {
  // Exact fieldNodes array identity only. Do not fall back to the primary
  // FieldNode: merged groups can share that AST node with different subfields.
  const byNodes = plan.fieldPlanByNodes.get(fieldNodes);
  if (byNodes != null && (parentType == null || byNodes.parentType === parentType)) {
    return byNodes;
  }
  return undefined;
}

/**
 * Resolve planned subfields for a parent fieldNodes array.
 */
export function getPlannedSubfields(
  plan: ExecutionPlan,
  fieldNodes: ReadonlyArray<FieldNode>,
  returnType: GraphQLObjectType,
): Map<string, Array<FieldNode>> | undefined {
  // Exact array identity only (same merged-group rule as getPlannedFieldPlan).
  return plan.subfieldsByNodes.get(fieldNodes)?.get(returnType);
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
export function compileExecutionPlan(
  args: CompileExecutionPlanArgs,
): ExecutionPlan | ReadonlyArray<GraphQLError> | undefined {
  const cached = getCachedPlanEntry(args.schema, args.document, args.operationName);
  if (cached) {
    if (cached.kind === 'plan') {
      return cached.plan;
    }
    if (cached.kind === 'errors') {
      return cached.errors;
    }
    if (cached.kind === 'ineligible') {
      return undefined;
    }
    return undefined;
  }

  const entry = compileExecutionPlanUncached(args);
  // Unknown operation-name misses must not accumulate unbounded Map keys under
  // a live DocumentNode; successful plans (and other error kinds) still cache.
  if (!(
    entry.kind === 'errors' &&
    entry.errors.every(error => error.message.startsWith('Unknown operation named "'))
  )) {
    setCachedPlanEntry(args.schema, args.document, args.operationName, entry);
  }
  if (entry.kind === 'plan') {
    // Public boundary: the plan object is shared via WeakMap. Shallow-freeze
    // the plan shell only (nested Maps/arrays/FieldPlans stay mutable by
    // design; do not deep-freeze). Treat as opaque/read-only and do not mutate.
    Object.freeze(entry.plan);
    return entry.plan;
  }
  if (entry.kind === 'errors') {
    return entry.errors;
  }
  if (entry.kind === 'ineligible') {
    return undefined;
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
): ExecutionPlan | undefined {
  const cached = getCachedPlanEntry(schema, document, operationName);
  return cached?.kind === 'plan' ? cached.plan : undefined;
}

/**
 * Resolve the plan for one `execute` / `buildExecutionContext` call.
 * Uses the WeakMap cache; compiles synchronously on a cache miss.
 */
export function resolvePlanForExecute(args: CompileExecutionPlanArgs): ExecutionPlan | undefined {
  const cached = getCachedPlanEntry(args.schema, args.document, args.operationName);
  if (cached?.kind === 'plan') {
    return cached.plan;
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

  // Resolve the operation first so unknown names reject without scanning the
  // whole document for incremental directives / fragments.
  const operationResult = resolveOperation(document, operationName);
  if ('errors' in operationResult) {
    return { kind: 'errors', errors: operationResult.errors };
  }
  const { operation } = operationResult;

  const hasIncremental = documentHasIncrementalDirectives(document);
  const fragments = collectFragments(document);

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

  // Mutable while compiling; shallow-frozen before the public cache return.
  type MutablePlan = { -readonly [K in keyof ExecutionPlan]: ExecutionPlan[K] };
  const plan: MutablePlan = {
    schema: schema,
    document: document,
    operation: operation,
    operationName: operationName ?? undefined,
    fragments: fragments,
    rootType: rootType,
    collectionDependsOnVariables: collectionDependsOnVariables,
    hasIncremental: hasIncremental,
    rootFields: rootFields,
    fieldPlanByNodes: fieldPlanByNodes,
    fieldPlanByFieldNode: fieldPlanByFieldNode,
    subfieldsByNodes: subfieldsByNodes,
    subfieldsByFieldNode: subfieldsByFieldNode,
    subfieldExecutionsByNodes: subfieldExecutionsByNodes,
    collectVariablesFalse: collectVariablesFalse,
    collectVariablesTrue: collectVariablesTrue,
    hasVariables: variableDefinitions.length > 0,
    coerceVariables: coerceVariables,
    rootExecutions: undefined,
    skipIncludePredicates: skipIncludePredicates,
  };

  try {
    beginPlanCompile(plan);
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
          if (rootExecutions === null) {
            // Mixed-extreme / defer-shaped selection; disable predicate path.
            plan.skipIncludePredicates = false;
          } else if (rootExecutions === undefined) {
            // Duplicate response names: classic root collect for first-active
            // occurrence order; keep predicates for planned subfields.
            plan.rootExecutions = undefined;
          } else {
            plan.rootExecutions = rootExecutions;
          }
        }
      }
    }
    return { kind: 'plan', plan };
  } catch (error) {
    if (error instanceof PlanCompileBudgetExceeded) {
      return { kind: 'ineligible' };
    }
    throw error;
  } finally {
    endPlanCompile(plan);
  }
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
