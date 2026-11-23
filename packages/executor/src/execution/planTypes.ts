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
 * (`LeafFieldPlan` → `'Leaf'`, `LeafListFieldPlan` → `'LeafList'`, …).
 */
export type FieldPlanKind = 'Leaf' | 'LeafList' | 'Object' | 'Abstract' | 'List';

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
  kind: 'Leaf';
  leafType: GraphQLLeafType;
  skipIsTypeOf: false;
}

/** List of leaf scalars/enums. */
export interface LeafListFieldPlan extends FieldPlanBase {
  kind: 'LeafList';
  /** Item leaf type (after unwrapping list / item NonNull). */
  leafType: GraphQLLeafType;
  /** True when list items are wrapped in NonNull. */
  itemNonNull: boolean;
  skipIsTypeOf: false;
}

/** Concrete object completion. */
export interface ObjectFieldPlan extends FieldPlanBase {
  kind: 'Object';
  objectType: GraphQLObjectType;
  /** True when `objectType` has no `isTypeOf` predicate. */
  skipIsTypeOf: boolean;
}

/** Interface / union completion. */
export interface AbstractFieldPlan extends FieldPlanBase {
  kind: 'Abstract';
  skipIsTypeOf: false;
}

/**
 * Non-leaf lists (objects / abstracts / nested lists).
 * When items are concrete objects without `isTypeOf`, `objectType` + `itemNonNull`
 * are set for the thin nested walk (flattened; no nested PlannedObjectList).
 */
export interface ListFieldPlan extends FieldPlanBase {
  kind: 'List';
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
 * Compiled execution plan for `compileExecutionPlan` / `execute({ plan })`.
 *
 * All `__`-prefixed fields are **@internal — do not use** from application code.
 * They exist for the warm interpreter and may change without a major bump.
 */
export interface ExecutionPlan {
  /** @internal Do not use. */
  __schema: GraphQLSchema;
  /** @internal Do not use. */
  __document: DocumentNode;
  /** @internal Do not use. */
  __operation: OperationDefinitionNode;
  /** @internal Do not use. */
  __operationName: string | undefined;
  /** @internal Do not use. */
  __fragments: Record<string, FragmentDefinitionNode>;
  /** @internal Do not use. */
  __rootType: GraphQLObjectType;
  /**
   * @internal Do not use.
   * True when `@skip` / `@include` (or variable `@defer` label/`if`) make
   * collected field sets depend on runtime variables.
   */
  __collectionDependsOnVariables: boolean;
  /**
   * @internal Do not use.
   * True when the document uses `@defer` / `@stream`.
   */
  __hasIncremental: boolean;
  /** @internal Do not use. */
  __rootFields: Map<string, Array<FieldNode>>;
  /** @internal Do not use. */
  __fieldPlanByNodes: WeakMap<ReadonlyArray<FieldNode>, FieldPlan>;
  /** @internal Do not use. */
  __fieldPlanByFieldNode: WeakMap<FieldNode, FieldPlan>;
  /** @internal Do not use. */
  __subfieldsByNodes: WeakMap<
    ReadonlyArray<FieldNode>,
    WeakMap<GraphQLObjectType, Map<string, Array<FieldNode>>>
  >;
  /** @internal Do not use. */
  __subfieldsByFieldNode: WeakMap<
    FieldNode,
    WeakMap<GraphQLObjectType, Map<string, Array<FieldNode>>>
  >;
  /** @internal Do not use. */
  __subfieldExecutionsByNodes: WeakMap<
    ReadonlyArray<FieldNode>,
    WeakMap<GraphQLObjectType, ReadonlyArray<PlannedFieldExecution>>
  >;
  /** @internal Do not use. */
  __collectVariablesFalse: VariableValues;
  /** @internal Do not use. */
  __collectVariablesTrue: VariableValues;
  /** @internal Do not use. */
  __hasVariables: boolean;
  /** @internal Do not use. */
  __coerceVariables: CoerceVariables;
  /** @internal Do not use. */
  __rootExecutions: ReadonlyArray<PlannedFieldExecution> | undefined;
  /** @internal Do not use. */
  __skipIncludePredicates: boolean;
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
