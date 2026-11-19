import {
  coerceInputValue,
  defaultFieldResolver,
  FieldNode,
  FragmentDefinitionNode,
  getArgumentValues,
  getVariableValues,
  GraphQLAbstractType,
  GraphQLError,
  GraphQLField,
  GraphQLLeafType,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLSchema,
  isAbstractType,
  isInputType,
  isLeafType,
  isListType,
  isNonNullType,
  isObjectType,
  Kind,
  OperationDefinitionNode,
  SchemaMetaFieldDef,
  typeFromAST,
  TypeMetaFieldDef,
  TypeNameMetaFieldDef,
  versionInfo,
  type DocumentNode,
  type GraphQLInputType,
  type ValueNode,
  type VariableDefinitionNode,
} from 'graphql';
import {
  collectFields,
  collectFieldsDependsOnVariables,
  collectSubFields,
  getDefinedRootType,
  VariableValues,
} from '@graphql-tools/utils';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';

const isGraphQL17 = versionInfo.major >= 17;

const EMPTY_ARGS: { [argument: string]: unknown } = Object.freeze(Object.create(null));
const EMPTY_VARIABLE_VALUES: VariableValues = Object.freeze({
  coerced: Object.freeze(Object.create(null)),
  sources: Object.freeze(Object.create(null)),
});

const INCREMENTAL_DIRECTIVES = new Set(['defer', 'stream']);

/**
 * Result of a planned variable coercer (normalized across GraphQL 16/17).
 */
export type CoerceVariablesResult =
  { variableValues: VariableValues } | { errors: ReadonlyArray<GraphQLError> };

export type CoerceVariables = (
  rawVariableValues: { readonly [key: string]: unknown } | null | undefined,
  options?: { hideSuggestions?: boolean | null },
) => CoerceVariablesResult;

/**
 * When the field returns a list of scalars/enums (optionally non-null items),
 * the warm plan path can complete arrays without re-classifying the item type.
 */
export interface PlannedLeafList {
  leafType: GraphQLLeafType;
  /** True when list items are wrapped in NonNull. */
  itemNonNull: boolean;
}

/**
 * How the warm path completes this field's return value (after NonNull unwrap).
 */
export type CompletionKind = 'leaf' | 'leafList' | 'object' | 'abstract' | 'list';

/**
 * How the warm path obtains the field value.
 * - `defaultProperty`: schema resolve unset or defaultFieldResolver
 * - `schemaResolve`: explicit custom `fieldDef.resolve`
 */
export type ResolveKind = 'defaultProperty' | 'schemaResolve';

/**
 * Compiled argument reader for the warm plan path.
 * - `empty` / `static`: no runtime coercion
 * - `coercer`: bound closure (bare-variable fast path with getArgumentValues fallback,
 *   or full getArgumentValues for embedded variables)
 */
export type ArgumentReader =
  | { kind: 'empty' }
  | { kind: 'static'; args: { [argument: string]: unknown } }
  | {
      kind: 'coercer';
      read: (variableValues: VariableValues) => { [argument: string]: unknown };
    };

/**
 * Per-field static facts compiled once for a (schema, document, operation) plan.
 * Shared across warm executions so the thin interpreter can skip field lookup,
 * type classification, and (when safe) argument coercion / resolveInfo setup.
 */
export interface FieldPlan {
  fieldDef: GraphQLField<unknown, unknown>;
  fieldNodes: Array<FieldNode>;
  responseName: string;
  parentType: GraphQLObjectType;
  returnType: GraphQLOutputType;
  nonNull: boolean;
  leafType: GraphQLLeafType | undefined;
  /**
   * Set when the field's named return type (after NonNull) is a list of leaves.
   */
  listItemLeaf: PlannedLeafList | undefined;
  /** Completion strategy after NonNull unwrap. */
  completionKind: CompletionKind;
  /** Concrete object return type when `completionKind === 'object'`. */
  objectType: GraphQLObjectType | undefined;
  /** True when `objectType` is set and has no `isTypeOf` predicate. */
  skipIsTypeOf: boolean;
  resolveKind: ResolveKind;
  /**
   * When `resolveKind === 'schemaResolve'`, the schema field resolve closed at
   * compile time so the warm path can call it without re-reading `fieldDef.resolve`.
   */
  boundResolve:
    | ((
        source: unknown,
        args: { [argument: string]: unknown },
        context: unknown,
        info: unknown,
      ) => unknown)
    | undefined;
  hasArgs: boolean;
  /**
   * When all argument ASTs are variable-free, args are coerced once at compile
   * time. Prefer `argumentReader` / `readArguments` on the warm path.
   */
  staticArgs: { [argument: string]: unknown } | undefined;
  /** Compiled argument strategy for this field (see ArgumentReader). */
  argumentReader: ArgumentReader | undefined;
  /**
   * Bound argument coercer: empty/static maps or a closure over variable values.
   */
  readArguments: (variableValues: VariableValues) => { [argument: string]: unknown };
  /**
   * True when `fieldDef.resolve` is unset or is the GraphQL default resolver.
   * Runtime still gates on `exeContext.fieldResolver === defaultFieldResolver`.
   */
  mayUseDefaultLeafPath: boolean;
  /**
   * Static GraphQLResolveInfo fields compiled once (path + execution details
   * filled at runtime by `buildPlannedResolveInfo`).
   */
  resolveInfoStatic: {
    fieldName: string;
    fieldNodes: Array<FieldNode>;
    returnType: GraphQLOutputType;
    parentType: GraphQLObjectType;
  };
  /**
   * Compiled `@stream` facts for incremental plans.
   * - `none`: no stream directive
   * - `static`: literal args (skip getDirectiveValues)
   * - `dynamic`: variable args — runtime getDirectiveValues
   */
  stream:
    | { kind: 'none' }
    | { kind: 'static'; initialCount: number | undefined; label: string | undefined }
    | { kind: 'dynamic' };
  /**
   * Bound field completer installed by the runtime binder (`execute.ts`) after
   * compile. Closes over completionKind / leaf / object facts so warm
   * `executeField` can skip the `completeValue` kind switch + plan lookup.
   * Undefined until the plan is first bound for execution.
   */
  complete?: (...args: never[]) => unknown;
}

/**
 * Cacheable execution plan (plan/compile path, not a generated executor).
 *
 * Holds pre-collected field maps and per-field static metadata for documents
 * whose collected field sets do not depend on variable values and that do not
 * use `@defer` / `@stream`. Stitching / federation can compile once and swap
 * the thin interpreter later; the default `execute` path uses this plan when
 * eligible.
 */
export interface ExecutionPlan {
  schema: GraphQLSchema;
  document: DocumentNode;
  operation: OperationDefinitionNode;
  operationName: string | undefined;
  fragments: Record<string, FragmentDefinitionNode>;
  rootType: GraphQLObjectType;
  /**
   * True when `@skip` / `@include` (or variable `@defer` label/`if`) make
   * collected field sets depend on runtime variables. Root/subfield maps on
   * the plan are a union over both boolean extremes; runtime still collects
   * with real variables and looks up field plans by FieldNode identity.
   */
  collectionDependsOnVariables: boolean;
  /**
   * True when the document uses `@defer` / `@stream`. Runtime keeps the
   * incremental interpreter; the plan still supplies per-field facts via
   * FieldNode keys.
   */
  hasIncremental: boolean;
  /** Pre-collected root field map (stable docs) or union over bool extremes. */
  rootFields: Map<string, Array<FieldNode>>;
  /** Field plan keyed by the exact `fieldNodes` array identity from this plan. */
  fieldPlanByNodes: WeakMap<ReadonlyArray<FieldNode>, FieldPlan>;
  /**
   * Field plan keyed by the primary AST `FieldNode` so runtime-collected
   * fieldNodes arrays (variable skip/include) still hit the warm plan.
   */
  fieldPlanByFieldNode: WeakMap<FieldNode, FieldPlan>;
  /**
   * Subfield maps keyed by parent fieldNodes array then concrete return type.
   * List items of the same type reuse the same map identity.
   */
  subfieldsByNodes: WeakMap<
    ReadonlyArray<FieldNode>,
    WeakMap<GraphQLObjectType, Map<string, Array<FieldNode>>>
  >;
  /** Subfield maps keyed by parent field's primary AST node (variable collect). */
  subfieldsByFieldNode: WeakMap<
    FieldNode,
    WeakMap<GraphQLObjectType, Map<string, Array<FieldNode>>>
  >;
  /**
   * Subfield execution lists keyed like `subfieldsByNodes` for stable warm path.
   */
  subfieldExecutionsByNodes: WeakMap<
    ReadonlyArray<FieldNode>,
    WeakMap<GraphQLObjectType, ReadonlyArray<PlannedFieldExecution>>
  >;
  /** VariableValues with skip/include bools set false — for union compile. */
  collectVariablesFalse: VariableValues;
  /** VariableValues with skip/include bools set true — for union compile. */
  collectVariablesTrue: VariableValues;
  /** True when the operation declares one or more variables. */
  hasVariables: boolean;
  /**
   * Compiled variable coercer closed over schema + variableDefinitions.
   * Empty ops return EMPTY_VARIABLE_VALUES; otherwise a typed coercer graph
   * (leaf / list / input-object via `coerceInputValue`) with full
   * `VariableValues.sources` signatures, falling back to getVariableValues for
   * defaults and identical GraphQLError messaging.
   */
  coerceVariables: CoerceVariables;
  /**
   * Stable root execution list (same order as `rootFields`). Warm path can
   * walk these instead of Map entries + WeakMap field-plan lookups.
   * Undefined when `collectionDependsOnVariables` (runtime collect differs).
   */
  rootExecutions: ReadonlyArray<PlannedFieldExecution> | undefined;
}

/**
 * Bound field execution entry compiled into stable field maps.
 */
export interface PlannedFieldExecution {
  responseName: string;
  fieldNodes: Array<FieldNode>;
  fieldPlan: FieldPlan;
}

export interface CompileExecutionPlanArgs {
  schema: GraphQLSchema;
  document: TypedDocumentNode<any, any> | DocumentNode;
  operationName?: string | null;
}

type PlanCacheEntry =
  | { kind: 'plan'; plan: ExecutionPlan }
  | { kind: 'ineligible' }
  | { kind: 'errors'; errors: ReadonlyArray<GraphQLError> };

/**
 * document → schema → operationName → compiled entry.
 * Ineligible documents are remembered so we do not re-walk the AST every time.
 */
const planCache = new WeakMap<DocumentNode, WeakMap<GraphQLSchema, Map<string, PlanCacheEntry>>>();

/**
 * True when `compileExecutionPlan` returned a usable plan (not errors / skip).
 */
export function isExecutionPlan(
  value: ExecutionPlan | ReadonlyArray<GraphQLError> | undefined | null,
): value is ExecutionPlan {
  return value != null && !Array.isArray(value);
}

/**
 * Resolve a field plan for runtime fieldNodes (exact array or primary AST node).
 */
export function getPlannedFieldPlan(
  plan: ExecutionPlan,
  fieldNodes: ReadonlyArray<FieldNode>,
  parentType?: GraphQLObjectType,
): FieldPlan | undefined {
  const byNodes = plan.fieldPlanByNodes.get(fieldNodes);
  if (byNodes) {
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
  plan: ExecutionPlan,
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
 * `@defer` / `@stream` set `hasIncremental` — runtime keeps the incremental
 * interpreter while still using per-field plan facts. Returns a GraphQL error
 * list when the operation cannot be resolved.
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
    return undefined;
  }

  const entry = compileExecutionPlanUncached(args);
  setCachedPlanEntry(args.schema, args.document, args.operationName, entry);
  if (entry.kind === 'plan') {
    return entry.plan;
  }
  if (entry.kind === 'errors') {
    return entry.errors;
  }
  return undefined;
}

/**
 * Look up a previously compiled plan without compiling. Returns `undefined`
 * when missing or ineligible.
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
  return operationName ?? '';
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
    rootPatches = patches;
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

  const plan: ExecutionPlan = {
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
  };

  compileFieldMap(plan, rootType, rootFields);
  compilePatchFieldMaps(plan, rootType, rootPatches);
  // Stable non-incremental roots can walk bound execution lists at runtime.
  if (!collectionDependsOnVariables && !hasIncremental) {
    plan.rootExecutions = buildFieldExecutions(plan, rootFields);
  }
  return { kind: 'plan', plan };
}

function compilePatchFieldMaps(
  plan: ExecutionPlan,
  parentType: GraphQLObjectType,
  patches: ReadonlyArray<{
    fields: Map<string, Array<FieldNode>>;
    patches?: ReadonlyArray<any>;
  }>,
): void {
  for (const patch of patches) {
    compileFieldMap(plan, parentType, patch.fields);
    if (patch.patches?.length) {
      compilePatchFieldMaps(plan, parentType, patch.patches);
    }
  }
}

function buildFieldExecutions(
  plan: ExecutionPlan,
  fields: Map<string, Array<FieldNode>>,
): PlannedFieldExecution[] {
  const executions: PlannedFieldExecution[] = [];
  for (const [responseName, fieldNodes] of fields) {
    const fieldPlan = plan.fieldPlanByNodes.get(fieldNodes);
    if (fieldPlan) {
      executions.push({ responseName, fieldNodes, fieldPlan });
    }
  }
  return executions;
}

/**
 * Compile a variableValues coercer for the operation.
 * - No variables → empty map
 * - No AST defaults → typed coercer graph (leaf / list / input-object) via
 *   `coerceInputValue`, with `VariableValues.sources` signatures; invalid
 *   values fall back to getVariableValues for exact GraphQLError messaging
 * - Defaults / unresolvable types → bound getVariableValues
 */
function compileVariableCoercer(
  schema: GraphQLSchema,
  variableDefinitions: ReadonlyArray<VariableDefinitionNode>,
): CoerceVariables {
  if (variableDefinitions.length === 0) {
    return () => ({ variableValues: EMPTY_VARIABLE_VALUES });
  }

  const bindings = tryCompileVariableBindings(schema, variableDefinitions);
  const runFull: CoerceVariables = (rawVariableValues, options) =>
    runGetVariableValues(schema, variableDefinitions, rawVariableValues, options);

  if (bindings == null) {
    return runFull;
  }

  return (rawVariableValues, options) => {
    const fast = tryCoerceVariables(bindings, rawVariableValues);
    if (fast !== undefined) {
      return { variableValues: fast };
    }
    // Missing / null-for-non-null / coerce failures: identical errors via graphql-js.
    return runFull(rawVariableValues, options);
  };
}

type VariableBinding = {
  name: string;
  /** Full variable input type (including NonNull / List / input object). */
  variableType: GraphQLInputType;
  nonNull: boolean;
  signature: {
    name: string;
    type: GraphQLInputType;
    default: undefined;
  };
};

/**
 * Compile per-variable bindings for the typed coercer graph.
 * Returns undefined when any variable has an AST default (exact default
 * coercion stays on getVariableValues) or an unresolvable input type.
 */
function tryCompileVariableBindings(
  schema: GraphQLSchema,
  variableDefinitions: ReadonlyArray<VariableDefinitionNode>,
): VariableBinding[] | undefined {
  const bindings: VariableBinding[] = [];
  for (const def of variableDefinitions) {
    if (def.defaultValue != null) {
      return undefined;
    }
    const inputType = typeFromAST(schema, def.type);
    if (inputType == null || !isInputType(inputType)) {
      return undefined;
    }
    const nonNull = isNonNullType(inputType);
    bindings.push({
      name: def.variable.name.value,
      variableType: inputType,
      nonNull,
      signature: {
        name: def.variable.name.value,
        type: inputType,
        default: undefined,
      },
    });
  }
  return bindings;
}

/**
 * Fast path: coerce each raw variable with the public `coerceInputValue` graph
 * (leaves, lists, input objects, oneOf) and populate GQL17-compatible sources.
 */
function tryCoerceVariables(
  bindings: ReadonlyArray<VariableBinding>,
  rawVariableValues: { readonly [key: string]: unknown } | null | undefined,
): VariableValues | undefined {
  const raw = rawVariableValues ?? EMPTY_RAW_VARIABLES;
  const coerced = Object.create(null) as Record<string, unknown>;
  const sources = Object.create(null) as VariableValues['sources'];
  for (const binding of bindings) {
    const hasValue = Object.prototype.hasOwnProperty.call(raw, binding.name);
    if (!hasValue) {
      sources[binding.name] = { signature: binding.signature };
      if (binding.nonNull) {
        return undefined;
      }
      continue;
    }
    const value = raw[binding.name];
    sources[binding.name] = { signature: binding.signature, value };
    const coercedValue = coerceInputValue(value, binding.variableType);
    if (coercedValue === undefined) {
      return undefined;
    }
    coerced[binding.name] = coercedValue;
  }
  return { coerced, sources };
}

const EMPTY_RAW_VARIABLES: { readonly [key: string]: unknown } = Object.freeze(Object.create(null));

function runGetVariableValues(
  schema: GraphQLSchema,
  variableDefinitions: ReadonlyArray<VariableDefinitionNode>,
  rawVariableValues: { readonly [key: string]: unknown } | null | undefined,
  options?: { hideSuggestions?: boolean | null },
): CoerceVariablesResult {
  const result = getVariableValues(schema, variableDefinitions, rawVariableValues ?? {}, {
    maxErrors: 50,
    hideSuggestions: options?.hideSuggestions ?? undefined,
  } as { maxErrors?: number });

  if (result.errors) {
    return { errors: result.errors };
  }

  if (isGraphQL17) {
    return {
      variableValues: (result as unknown as { variableValues: VariableValues }).variableValues,
    };
  }
  return {
    variableValues: {
      coerced: (result as unknown as { coerced: Record<string, unknown> }).coerced,
      sources: Object.create(null),
    },
  };
}

function compileFieldMap(
  plan: ExecutionPlan,
  parentType: GraphQLObjectType,
  fields: Map<string, Array<FieldNode>>,
): void {
  for (const [responseName, fieldNodes] of fields) {
    const fieldPlan = compileFieldPlan(plan, parentType, responseName, fieldNodes);
    if (fieldPlan) {
      plan.fieldPlanByNodes.set(fieldNodes, fieldPlan);
      for (const fieldNode of fieldNodes) {
        plan.fieldPlanByFieldNode.set(fieldNode, fieldPlan);
      }
      compileReturnTypeSubfields(plan, fieldPlan);
    }
  }
}

function compileFieldPlan(
  plan: ExecutionPlan,
  parentType: GraphQLObjectType,
  responseName: string,
  fieldNodes: Array<FieldNode>,
): FieldPlan | undefined {
  const fieldDef = getFieldDefForPlan(plan.schema, parentType, fieldNodes[0]);
  if (!fieldDef) {
    return undefined;
  }

  let type: GraphQLOutputType = fieldDef.type;
  let nonNull = false;
  if (isNonNullType(type)) {
    nonNull = true;
    type = type.ofType;
  }

  const leafType = isLeafType(type) ? type : undefined;
  const listItemLeaf = compileListItemLeaf(type);
  const completionKind = classifyCompletionKind(type, listItemLeaf);
  const objectType = completionKind === 'object' && isObjectType(type) ? type : undefined;
  const skipIsTypeOf = objectType != null && objectType.isTypeOf == null;
  const fieldResolve = fieldDef.resolve;
  const resolveKind: ResolveKind =
    fieldResolve != null && fieldResolve !== defaultFieldResolver
      ? 'schemaResolve'
      : 'defaultProperty';
  const boundResolve =
    resolveKind === 'schemaResolve'
      ? (fieldResolve as (
          source: unknown,
          args: { [argument: string]: unknown },
          context: unknown,
          info: unknown,
        ) => unknown)
      : undefined;
  // Unset resolve or explicit `resolve: defaultFieldResolver` may take the
  // leaf / leaf-list fast path when the effective runtime resolver is still default.
  const mayUseDefaultLeafPath =
    (leafType != null || listItemLeaf != null) && resolveKind === 'defaultProperty';
  const hasArgs = fieldDef.args.length > 0;
  const { staticArgs, argumentReader, readArguments } = compileArgumentReader(
    fieldDef,
    fieldNodes[0],
    hasArgs,
  );

  const returnType = fieldDef.type;
  return {
    fieldDef,
    fieldNodes,
    responseName,
    parentType,
    returnType,
    nonNull,
    leafType,
    listItemLeaf,
    completionKind,
    objectType,
    skipIsTypeOf,
    resolveKind,
    boundResolve,
    hasArgs,
    staticArgs,
    argumentReader,
    readArguments,
    mayUseDefaultLeafPath,
    resolveInfoStatic: {
      fieldName: fieldDef.name,
      fieldNodes,
      returnType,
      parentType,
    },
    stream: compileStreamPlan(fieldNodes[0]),
  };
}

function compileStreamPlan(fieldNode: FieldNode): FieldPlan['stream'] {
  const directives = fieldNode.directives;
  if (directives == null || directives.length === 0) {
    return { kind: 'none' };
  }
  let streamDir: (typeof directives)[number] | undefined;
  for (const directive of directives) {
    if (directive.name.value === 'stream') {
      streamDir = directive;
      break;
    }
  }
  if (streamDir == null) {
    return { kind: 'none' };
  }
  let initialCount: number | undefined;
  let sawInitialCount = false;
  let label: string | undefined;
  let ifValue: boolean | undefined;
  for (const arg of streamDir.arguments ?? []) {
    if (arg.value.kind === Kind.VARIABLE) {
      return { kind: 'dynamic' };
    }
    switch (arg.name.value) {
      case 'initialCount':
        if (arg.value.kind === Kind.INT) {
          initialCount = Number(arg.value.value);
          sawInitialCount = true;
        } else {
          return { kind: 'dynamic' };
        }
        break;
      case 'label':
        if (arg.value.kind === Kind.STRING) {
          label = arg.value.value;
        } else if (arg.value.kind === Kind.NULL) {
          label = undefined;
        } else {
          return { kind: 'dynamic' };
        }
        break;
      case 'if':
        if (arg.value.kind === Kind.BOOLEAN) {
          ifValue = arg.value.value;
        } else {
          return { kind: 'dynamic' };
        }
        break;
      default:
        break;
    }
  }
  if (ifValue === false) {
    return { kind: 'none' };
  }
  // Without an explicit initialCount, graphql applies the directive default —
  // keep that path in getDirectiveValues.
  if (!sawInitialCount) {
    return { kind: 'dynamic' };
  }
  return { kind: 'static', initialCount, label };
}

function classifyCompletionKind(
  typeAfterNonNull: GraphQLOutputType,
  listItemLeaf: PlannedLeafList | undefined,
): CompletionKind {
  if (isLeafType(typeAfterNonNull)) {
    return 'leaf';
  }
  if (isListType(typeAfterNonNull)) {
    return listItemLeaf ? 'leafList' : 'list';
  }
  if (isObjectType(typeAfterNonNull)) {
    return 'object';
  }
  if (isAbstractType(typeAfterNonNull)) {
    return 'abstract';
  }
  return 'list';
}

/**
 * If `type` is List or NonNull(List) of (NonNull) leaf, return leaf completion facts.
 */
export function compileListItemLeaf(type: GraphQLOutputType): PlannedLeafList | undefined {
  let current: GraphQLOutputType = type;
  if (isNonNullType(current)) {
    current = current.ofType;
  }
  if (!isListType(current)) {
    return undefined;
  }
  let item: GraphQLOutputType = current.ofType;
  let itemNonNull = false;
  if (isNonNullType(item)) {
    itemNonNull = true;
    item = item.ofType;
  }
  if (!isLeafType(item)) {
    return undefined;
  }
  return { leafType: item, itemNonNull };
}

function compileArgumentReader(
  fieldDef: GraphQLField<unknown, unknown>,
  fieldNode: FieldNode,
  hasArgs: boolean,
): {
  staticArgs: { [argument: string]: unknown } | undefined;
  argumentReader: ArgumentReader | undefined;
  readArguments: (variableValues: VariableValues) => { [argument: string]: unknown };
} {
  if (!hasArgs) {
    const argumentReader: ArgumentReader = { kind: 'empty' };
    return {
      staticArgs: EMPTY_ARGS,
      argumentReader,
      readArguments: () => EMPTY_ARGS,
    };
  }

  if (!fieldArgumentsContainVariable(fieldNode)) {
    // Pre-coerce only when literals are valid with empty variables. Missing
    // required args / bad literals must surface at execution time (same as
    // the classic path), so leave readers unset and coerce via getArgumentValues.
    try {
      const staticArgs = Object.freeze(
        Object.assign(
          Object.create(null),
          getArgumentValuesForPlan(fieldDef, fieldNode, EMPTY_VARIABLE_VALUES),
        ),
      );
      const argumentReader: ArgumentReader = { kind: 'static', args: staticArgs };
      return {
        staticArgs,
        argumentReader,
        readArguments: () => staticArgs,
      };
    } catch {
      const read = (variableValues: VariableValues) =>
        getArgumentValuesForPlan(fieldDef, fieldNode, variableValues);
      return {
        staticArgs: undefined,
        argumentReader: { kind: 'coercer', read },
        readArguments: read,
      };
    }
  }

  const bareBindings = tryBareVariableBindings(fieldNode);
  if (bareBindings) {
    const read = (variableValues: VariableValues) => {
      const fast = tryReadBareVariableArguments(fieldDef, bareBindings, variableValues);
      if (fast !== undefined) {
        return fast;
      }
      // Exact GraphQLError shapes for missing / null-for-non-null variables.
      return getArgumentValuesForPlan(fieldDef, fieldNode, variableValues);
    };
    return {
      staticArgs: undefined,
      argumentReader: { kind: 'coercer', read },
      readArguments: read,
    };
  }

  // Embedded variables inside literals: bound getArgumentValues closure.
  const read = (variableValues: VariableValues) =>
    getArgumentValuesForPlan(fieldDef, fieldNode, variableValues);
  return {
    staticArgs: undefined,
    argumentReader: { kind: 'coercer', read },
    readArguments: read,
  };
}

/**
 * When every argument AST value is a bare variable (`arg: $v`), return bindings.
 */
function tryBareVariableBindings(
  fieldNode: FieldNode,
): ReadonlyArray<{ argName: string; variableName: string }> | undefined {
  const args = fieldNode.arguments;
  if (args == null || args.length === 0) {
    return undefined;
  }
  const bindings: Array<{ argName: string; variableName: string }> = [];
  for (const arg of args) {
    if (arg.value.kind !== Kind.VARIABLE) {
      return undefined;
    }
    bindings.push({ argName: arg.name.value, variableName: arg.value.name.value });
  }
  return bindings;
}

/**
 * Fast path for bare-variable args when every referenced variable is present and
 * satisfies non-null. Returns `undefined` to fall back to getArgumentValues when
 * error messaging must match graphql-js exactly.
 */
function tryReadBareVariableArguments(
  fieldDef: GraphQLField<unknown, unknown>,
  bindings: ReadonlyArray<{ argName: string; variableName: string }>,
  variableValues: VariableValues,
): { [argument: string]: unknown } | undefined {
  const coerced = variableValues.coerced as Record<string, unknown>;
  const byArg = new Map<string, string>();
  for (const binding of bindings) {
    byArg.set(binding.argName, binding.variableName);
  }
  const args = Object.create(null) as { [argument: string]: unknown };
  for (const argDef of fieldDef.args) {
    const variableName = byArg.get(argDef.name);
    if (variableName !== undefined) {
      if (!Object.prototype.hasOwnProperty.call(coerced, variableName)) {
        return undefined;
      }
      const value = coerced[variableName];
      if (value == null && isNonNullType(argDef.type)) {
        return undefined;
      }
      args[argDef.name] = value;
      continue;
    }
    if (argDef.defaultValue !== undefined) {
      args[argDef.name] = argDef.defaultValue;
    } else if (isNonNullType(argDef.type)) {
      return undefined;
    }
  }
  return args;
}

function compileReturnTypeSubfields(plan: ExecutionPlan, fieldPlan: FieldPlan): void {
  const namedType = unwrapToNamedOutputType(fieldPlan.fieldDef.type);

  if (isObjectType(namedType)) {
    const subfields = collectAndStoreSubfields(plan, fieldPlan.fieldNodes, namedType);
    if (subfields) {
      compileFieldMap(plan, namedType, subfields);
      storeSubfieldExecutions(plan, fieldPlan.fieldNodes, namedType, subfields);
    }
    return;
  }

  if (isAbstractType(namedType)) {
    const possibleTypes = plan.schema.getPossibleTypes(namedType as GraphQLAbstractType);
    for (const concrete of possibleTypes) {
      const subfields = collectAndStoreSubfields(plan, fieldPlan.fieldNodes, concrete);
      if (subfields) {
        compileFieldMap(plan, concrete, subfields);
        storeSubfieldExecutions(plan, fieldPlan.fieldNodes, concrete, subfields);
      }
    }
  }
}

function storeSubfieldExecutions(
  plan: ExecutionPlan,
  parentFieldNodes: Array<FieldNode>,
  returnType: GraphQLObjectType,
  subfields: Map<string, Array<FieldNode>>,
): void {
  if (plan.collectionDependsOnVariables || plan.hasIncremental) {
    return;
  }
  let byType = plan.subfieldExecutionsByNodes.get(parentFieldNodes);
  if (!byType) {
    byType = new WeakMap();
    plan.subfieldExecutionsByNodes.set(parentFieldNodes, byType);
  }
  byType.set(returnType, buildFieldExecutions(plan, subfields));
}

function collectAndStoreSubfields(
  plan: ExecutionPlan,
  fieldNodes: Array<FieldNode>,
  returnType: GraphQLObjectType,
): Map<string, Array<FieldNode>> | undefined {
  let fields: Map<string, Array<FieldNode>>;
  let patches: ReadonlyArray<{
    fields: Map<string, Array<FieldNode>>;
    patches?: ReadonlyArray<any>;
  }> = [];
  if (plan.collectionDependsOnVariables) {
    const a = collectSubFields(
      plan.schema,
      plan.fragments,
      plan.collectVariablesFalse,
      returnType,
      fieldNodes,
    );
    const b = collectSubFields(
      plan.schema,
      plan.fragments,
      plan.collectVariablesTrue,
      returnType,
      fieldNodes,
    );
    fields = unionFieldMaps(a.fields, b.fields);
    patches = [...a.patches, ...b.patches];
  } else {
    const collected = collectSubFields(
      plan.schema,
      plan.fragments,
      EMPTY_VARIABLE_VALUES,
      returnType,
      fieldNodes,
    );
    fields = collected.fields;
    patches = collected.patches;
  }

  let byType = plan.subfieldsByNodes.get(fieldNodes);
  if (!byType) {
    byType = new WeakMap();
    plan.subfieldsByNodes.set(fieldNodes, byType);
  }
  byType.set(returnType, fields);

  const primary = fieldNodes[0];
  if (primary) {
    let byTypeForNode = plan.subfieldsByFieldNode.get(primary);
    if (!byTypeForNode) {
      byTypeForNode = new WeakMap();
      plan.subfieldsByFieldNode.set(primary, byTypeForNode);
    }
    byTypeForNode.set(returnType, fields);
  }

  // Deferred selections under this object: compile field plans for patch fields
  // (runtime still uses the incremental path for scheduling).
  if (patches.length > 0) {
    compilePatchFieldMaps(plan, returnType, patches);
  }
  return fields;
}

/**
 * Planned subfield execution list for a stable parent field + concrete type.
 */
export function getPlannedSubfieldExecutions(
  plan: ExecutionPlan,
  fieldNodes: ReadonlyArray<FieldNode>,
  returnType: GraphQLObjectType,
): ReadonlyArray<PlannedFieldExecution> | undefined {
  return plan.subfieldExecutionsByNodes.get(fieldNodes)?.get(returnType);
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

function unionFieldMaps(
  a: Map<string, Array<FieldNode>>,
  b: Map<string, Array<FieldNode>>,
): Map<string, Array<FieldNode>> {
  const out = new Map<string, Array<FieldNode>>();
  for (const [name, nodes] of a) {
    out.set(name, nodes.slice());
  }
  for (const [name, nodes] of b) {
    const existing = out.get(name);
    if (!existing) {
      out.set(name, nodes.slice());
      continue;
    }
    const seen = new Set(existing);
    for (const node of nodes) {
      if (!seen.has(node)) {
        existing.push(node);
        seen.add(node);
      }
    }
  }
  return out;
}

function unwrapToNamedOutputType(type: GraphQLOutputType): GraphQLOutputType {
  let current: GraphQLOutputType = type;
  while (isNonNullType(current) || isListType(current)) {
    current = current.ofType;
  }
  return current;
}

function getArgumentValuesForPlan(
  fieldDef: GraphQLField<unknown, unknown>,
  fieldNode: FieldNode,
  variableValues: VariableValues,
): { [argument: string]: unknown } {
  const valuesForArgs = isGraphQL17 ? variableValues : variableValues.coerced;
  return getArgumentValues(fieldDef, fieldNode, valuesForArgs as any);
}

function fieldArgumentsContainVariable(fieldNode: FieldNode): boolean {
  if (!fieldNode.arguments?.length) {
    return false;
  }
  for (const arg of fieldNode.arguments) {
    if (valueContainsVariable(arg.value)) {
      return true;
    }
  }
  return false;
}

function valueContainsVariable(value: ValueNode): boolean {
  switch (value.kind) {
    case Kind.VARIABLE:
      return true;
    case Kind.LIST:
      return value.values.some(valueContainsVariable);
    case Kind.OBJECT:
      return value.fields.some(field => valueContainsVariable(field.value));
    default:
      return false;
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

function getFieldDefForPlan(
  schema: GraphQLSchema,
  parentType: GraphQLObjectType,
  fieldNode: FieldNode,
): GraphQLField<unknown, unknown> | undefined {
  const fieldName = fieldNode.name.value;
  if (fieldName === SchemaMetaFieldDef.name && schema.getQueryType() === parentType) {
    return SchemaMetaFieldDef;
  }
  if (fieldName === TypeMetaFieldDef.name && schema.getQueryType() === parentType) {
    return TypeMetaFieldDef;
  }
  if (fieldName === TypeNameMetaFieldDef.name) {
    return TypeNameMetaFieldDef;
  }
  return parentType.getFields()[fieldName];
}
