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
   * Compiled `@stream` facts , **only set when `plan.hasIncremental`**.
   * Non-incremental FieldPlans omit this property so stable/skip warm paths
   * keep the Stage A object shape (no per-field stream tax).
   * - `none`: no stream directive
   * - `static`: literal args (skip getDirectiveValues)
   * - `dynamic`: variable args / missing initialCount , runtime getDirectiveValues
   */
  stream?:
    | { kind: 'none' }
    | { kind: 'static'; initialCount: number | undefined; label: string | undefined }
    | { kind: 'dynamic' };
}

/**
 * Cacheable execution plan (plan/compile path, not a generated executor).
 *
 * Holds pre-collected field maps and per-field static metadata. Variable
 * `@skip` / `@include` use union collection + FieldNode keys. `@defer` /
 * `@stream` set `hasIncremental` , runtime keeps the incremental interpreter
 * while still using per-field plan facts.
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
  /** VariableValues with skip/include bools set false , for union compile. */
  collectVariablesFalse: VariableValues;
  /** VariableValues with skip/include bools set true , for union compile. */
  collectVariablesTrue: VariableValues;
  /** True when the operation declares one or more variables. */
  hasVariables: boolean;
  /**
   * Compiled variable coercer closed over schema + variableDefinitions.
   * Empty ops return EMPTY_VARIABLE_VALUES; builtin-leaf / hoisted input
   * coercers (lists, input objects, @oneOf, AST defaults via valueFromAST)
   * try a fast path then fall back to getVariableValues for identical
   * GraphQLError shapes (#11).
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
