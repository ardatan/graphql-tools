import {
  FieldNode,
  FragmentDefinitionNode,
  GraphQLError,
  GraphQLField,
  GraphQLLeafType,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLSchema,
  OperationDefinitionNode,
  type DocumentNode,
} from 'graphql';
import { VariableValues } from '@graphql-tools/utils';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';

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
 * When the field returns a list of concrete objects without `isTypeOf`,
 * nested default-resolver lists can walk bound subfield executions per item.
 */
export interface PlannedObjectList {
  objectType: GraphQLObjectType;
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
 * Compiled `@stream` facts. Only present on incremental plans.
 */
export type StreamPlan =
  | { kind: 'none' }
  | { kind: 'static'; initialCount: number | undefined; label: string | undefined }
  | { kind: 'dynamic' };

/** Shared static facts for every kind of field plan. */
interface FieldPlanBase {
  fieldDef: GraphQLField<unknown, unknown>;
  fieldNodes: Array<FieldNode>;
  responseName: string;
  parentType: GraphQLObjectType;
  returnType: GraphQLOutputType;
  nonNull: boolean;
  resolveKind: ResolveKind;
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
   * Compiled `@stream` facts, only set when the plan is incremental.
   * Non-incremental field plans omit this so stable warm paths keep a tighter shape.
   */
  stream?: StreamPlan;
}

/** Leaf scalar/enum completion. */
export interface LeafFieldPlan extends FieldPlanBase {
  completionKind: 'leaf';
  leafType: GraphQLLeafType;
  skipIsTypeOf: false;
}

/** List of leaf scalars/enums. */
export interface LeafListFieldPlan extends FieldPlanBase {
  completionKind: 'leafList';
  listItemLeaf: PlannedLeafList;
  skipIsTypeOf: false;
}

/** Concrete object completion. */
export interface ObjectFieldPlan extends FieldPlanBase {
  completionKind: 'object';
  objectType: GraphQLObjectType;
  /** True when `objectType` has no `isTypeOf` predicate. */
  skipIsTypeOf: boolean;
}

/** Interface / union completion. */
export interface AbstractFieldPlan extends FieldPlanBase {
  completionKind: 'abstract';
  skipIsTypeOf: false;
}

/** List of objects / abstracts (or other non-leaf lists). */
export interface ListFieldPlan extends FieldPlanBase {
  completionKind: 'list';
  /** Set when items are concrete objects without `isTypeOf`. */
  listItemObject?: PlannedObjectList;
  skipIsTypeOf: false;
}

/**
 * Per-field static facts compiled once for a (schema, document, operation) plan.
 * Discriminated by `completionKind` so kind-specific data is required, not optional.
 */
export type FieldPlan =
  LeafFieldPlan | LeafListFieldPlan | ObjectFieldPlan | AbstractFieldPlan | ListFieldPlan;

/**
 * @internal Runtime execution plan data used by the warm interpreter.
 * Not a public API. Prefer the opaque {@link ExecutionPlan} surface from
 * `execute.ts` (compile + `plan.execute`).
 */
export interface InternalExecutionPlan {
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
  /** VariableValues with skip/include bools set false, for union compile. */
  collectVariablesFalse: VariableValues;
  /** VariableValues with skip/include bools set true, for union compile. */
  collectVariablesTrue: VariableValues;
  /** True when the operation declares one or more variables. */
  hasVariables: boolean;
  /**
   * Compiled variable coercer closed over schema + variableDefinitions.
   * Empty ops return EMPTY_VARIABLE_VALUES; builtin-leaf / hoisted input
   * coercers try a fast path then fall back to getVariableValues for identical
   * GraphQLError shapes.
   */
  coerceVariables: CoerceVariables;
  /**
   * Stable root execution list (same order as `rootFields`). Warm path can
   * walk these instead of Map entries + WeakMap field-plan lookups.
   * When `collectionDependsOnVariables` and `skipIncludePredicates` is set,
   * this is the union list; runtime filters via per-entry `include`.
   */
  rootExecutions: ReadonlyArray<PlannedFieldExecution> | undefined;
  /**
   * True when `collectionDependsOnVariables` and the doc is non-incremental.
   * Runtime filters `rootExecutions` / subfield executions with path-aware
   * `@skip`/`@include` predicates (fields + fragments) instead of re-collecting.
   */
  skipIncludePredicates: boolean;
  /**
   * Sealed by `compileExecutionPlan` (non-enumerable). Prefer the opaque
   * public `ExecutionPlan` type; this field exists for the warm path only.
   */
  execute?(args?: Record<string, unknown>): unknown;
}

/**
 * Bound field execution entry compiled into stable field maps.
 */
export interface PlannedFieldExecution {
  responseName: string;
  fieldNodes: Array<FieldNode>;
  fieldPlan: FieldPlan;
  /**
   * When set, true iff this field should run for the given variable values
   * (compiled `@skip`/`@include` on the field nodes). Absent on stable docs.
   */
  include?: (variableValues: VariableValues) => boolean;
}

export interface CompileExecutionPlanArgs {
  schema: GraphQLSchema;
  document: TypedDocumentNode<any, any> | DocumentNode;
  operationName?: string | null;
}
