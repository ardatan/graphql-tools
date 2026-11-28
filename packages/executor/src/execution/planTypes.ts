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
 * Discriminator for {@link FieldPlan}. Values match FieldPlan interface stems
 * (`LeafFieldPlan` → `'leaf'`, `LeafListFieldPlan` → `'leafList'`, …).
 */
export type FieldPlanKind = 'leaf' | 'leafList' | 'object' | 'abstract' | 'list';

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
  kind: 'leaf';
  leafType: GraphQLLeafType;
  skipIsTypeOf: false;
}

/** List of leaf scalars/enums. */
export interface LeafListFieldPlan extends FieldPlanBase {
  kind: 'leafList';
  /** Item leaf type (after unwrapping list / item NonNull). */
  leafType: GraphQLLeafType;
  /** True when list items are wrapped in NonNull. */
  itemNonNull: boolean;
  skipIsTypeOf: false;
}

/** Concrete object completion. */
export interface ObjectFieldPlan extends FieldPlanBase {
  kind: 'object';
  objectType: GraphQLObjectType;
  /** True when `objectType` has no `isTypeOf` predicate. */
  skipIsTypeOf: boolean;
}

/** Interface / union completion. */
export interface AbstractFieldPlan extends FieldPlanBase {
  kind: 'abstract';
  skipIsTypeOf: false;
}

/**
 * Non-leaf lists (objects / abstracts / nested lists).
 * When items are concrete objects without `isTypeOf`, `objectType` + `itemNonNull`
 * are set for the thin nested walk (flattened; no nested PlannedObjectList).
 */
export interface ListFieldPlan extends FieldPlanBase {
  kind: 'list';
  /** Item object type when the thin object-list path applies. */
  objectType?: GraphQLObjectType;
  /** True when list items are NonNull; only set with `objectType`. */
  itemNonNull?: boolean;
  skipIsTypeOf: false;
}

/**
 * Per-field static facts compiled once for a (schema, document, operation) plan.
 * Discriminated by `kind` so kind-specific data is required, not optional.
 */
export type FieldPlan =
  LeafFieldPlan | LeafListFieldPlan | ObjectFieldPlan | AbstractFieldPlan | ListFieldPlan;

/**
 * Brand for {@link ExecutionPlan}. Not part of the public API surface —
 * consumers should not read or forge this property.
 */
declare const executionPlanBrand: unique symbol;

/**
 * Opaque handle from `compileExecutionPlan` / `execute({ plan })`.
 *
 * The public type deliberately exposes no Maps, arrays, or FieldPlans so
 * TypeScript consumers cannot treat the plan as a mutable bag of internals.
 * Runtime still shallow-freezes the plan shell (not nested structures).
 * Prefer `execute({ schema, document })` unless you need plan-only warm reuse.
 */
export interface ExecutionPlan {
  readonly [executionPlanBrand]: true;
}

/**
 * @internal Runtime plan shape used by the executor and package tests.
 * Not a supported public contract — use {@link ExecutionPlan} externally.
 */
export interface InternalExecutionPlan extends ExecutionPlan {
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
   * Field plan keyed by a singleton group's primary AST `FieldNode`.
   * Multi-node merged groups are not indexed here (exact array identity only).
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
  /**
   * Subfield maps keyed by a singleton parent field's primary AST node.
   * Multi-node parents are not indexed here.
   */
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
   * Returned plans are shallow-frozen; do not reassign this field.
   */
  readonly rootExecutions: StampedPlannedExecutions | undefined;
  /**
   * True when `collectionDependsOnVariables` and the doc is non-incremental.
   * Runtime filters `rootExecutions` / subfield executions with path-aware
   * `@skip`/`@include` predicates (fields + fragments) instead of re-collecting.
   */
  skipIncludePredicates: boolean;
  /**
   * Strong list of `defaultProperty` field plans compiled for this document.
   * Used once per execute to pin live `fieldDef.resolve` checks (nestedDefault
   * hot path trusts `resolveKind` when still pristine).
   */
  defaultPropertyFieldPlans: Array<FieldPlan>;
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

/**
 * Schema-static walker facts stamped onto compiled / filtered execution lists
 * (array own-properties). Runtime trusts these instead of re-scanning FieldPlans
 * on nestedDefault / NonNull-bubble gates.
 */
export interface PlannedExecutionsWalkerMeta {
  /**
   * True when every entry is a nullable defaultProperty leaf/object without
   * args (Plain object-list lane / nestedDefault). Live resolve pristine is
   * still checked once per execute; this flag ignores monkey-patches.
   */
  plainDefaultSchemaEligible: boolean;
  /** True when any entry has `fieldPlan.nonNull` (nested try/catch gate). */
  mayBubbleNonNull: boolean;
  /**
   * True when every entry is a leaf or skipIsTypeOf object — Fast sync-object
   * walker is schema-eligible (no list/abstract/leafList in the selection).
   * Runtime still tries Fast first when true; when false Fast may still run
   * for a leaf prefix before declining.
   */
  syncObjectFastSchemaEligible: boolean;
  /**
   * `@skip`/`@include` predicates from fragments whose type condition does not
   * match this concrete type. Classic collect evaluates them before the type
   * check; filterPlannedExecutions runs them for errors without collecting.
   */
  fragmentDirectiveChecks?: ReadonlyArray<(variableValues: VariableValues) => boolean>;
  /**
   * Selection-order `@skip`/`@include` steps (directive-only + first field
   * occurrence). When set, filterPlannedExecutions evaluates these in order so
   * field directive errors surface before later fragment-spread checks.
   */
  skipIncludeSteps?: ReadonlyArray<
    | { readonly kind: 'directive'; readonly include: (variableValues: VariableValues) => boolean }
    | {
        readonly kind: 'field';
        readonly responseName: string;
        readonly include: (variableValues: VariableValues) => boolean;
      }
  >;
}

/**
 * Compiled subfield / root execution list with optional walker meta stamps.
 * Mutable array at compile; runtime treats it as readonly.
 */
export type StampedPlannedExecutions = PlannedFieldExecution[] &
  Partial<PlannedExecutionsWalkerMeta>;

export interface CompileExecutionPlanArgs {
  schema: GraphQLSchema;
  document: TypedDocumentNode<any, any> | DocumentNode;
  operationName?: string | null;
}
