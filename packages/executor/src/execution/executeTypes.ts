import {
  FieldNode,
  FragmentDefinitionNode,
  GraphQLError,
  GraphQLFieldResolver,
  GraphQLFormattedError,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLTypeResolver,
  OperationDefinitionNode,
} from 'graphql';
import {
  GraphQLResolveInfo,
  Maybe,
  VariableValues,
  type IncrementalSpec,
} from '@graphql-tools/utils';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type {
  AsyncPayloadRecord,
  CompletedResult,
  IncrementalPublisherState,
  PendingResult,
} from './incremental.js';
import {
  collectIncrementalSubfields,
  type DeferUsage,
  type DeferUsageSet,
} from './incrementalCollect.js';
import type { PlannedWorkRunner } from './plannedWorkRunner.js';
import type { InternalExecutionPlan } from './planTypes.js';

export interface SingularExecutionResult<TData = any, TExtensions = any> {
  errors?: ReadonlyArray<GraphQLError>;
  data?: TData | null;
  extensions?: TExtensions;
}

/**
 * Opaque compiled execution plan.
 *
 * Pass to `execute({ plan })` for warm reuse. Internal plan fields are not part
 * of the public TypeScript API.
 */
export interface ExecutionPlan {
  readonly __executionPlanBrand?: never;
}

export interface ExecutionContext<TVariables = any, TContext = any> {
  schema: GraphQLSchema;
  fragments: Record<string, FragmentDefinitionNode>;
  rootValue: unknown;
  contextValue: TContext;
  operation: OperationDefinitionNode;
  variableValues: VariableValues<TVariables>;
  /**
   * True when collected field sets can change with variableValues because
   * `@skip` / `@include` / `@defer` use a variable `if` (or `@defer` `label`)
   * in this document.
   */
  collectFieldsDependsOnVariables: boolean;
  /**
   * True when collected fields depend on variables, so collect can try a
   * compiled `@skip`/`@include` predicate program (fields + fragments).
   * Program compile returns null on `@defer`/`@stream` → classic collect.
   */
  skipIncludeFieldPredicates: boolean;
  /** Precomputed for GraphQLResolveInfo (GQL16 coerced map vs GQL17 VariableValues). */
  resolveInfoVariableValues: GraphQLResolveInfo['variableValues'];
  fieldResolver: GraphQLFieldResolver<any, TContext>;
  typeResolver: GraphQLTypeResolver<any, TContext>;
  subscribeFieldResolver: GraphQLFieldResolver<any, TContext>;
  errors: Array<GraphQLError>;
  subsequentPayloads: Set<AsyncPayloadRecord>;
  incrementalSpec: IncrementalSpec;
  publisher?: IncrementalPublisherState;
  /**
   * Allocated only when the operation actually uses @defer/@stream so
   * default execution does not pay for null-bubble bookkeeping.
   */
  nulledPaths?: Array<ReadonlyArray<string | number>>;
  /**
   * Per-execution FieldNode → DeferUsage. Document AST nodes are reused
   * across requests, so this must not live at module scope.
   */
  deferUsageByFieldNode?: WeakMap<FieldNode, DeferUsage | undefined>;
  /**
   * Field-node arrays from a planned group → that group's DeferUsageSet.
   * List items share the same array identity, so overlapping sibling
   * usages stay stable across async item completion.
   */
  deferUsagesForFieldNodes?: WeakMap<ReadonlyArray<FieldNode>, DeferUsageSet>;
  /**
   * Memoize incremental subfield collect per fieldNodes array and
   * concrete return type so list items of the same type reuse DeferUsage
   * objects without sharing type-conditioned selections across a
   * heterogeneous interface or union list.
   */
  incrementalSubfieldCache?: WeakMap<
    ReadonlyArray<FieldNode>,
    WeakMap<GraphQLObjectType, ReturnType<typeof collectIncrementalSubfields>>
  >;
  signal?: AbortSignal;
  getAbortSignal: () => AbortSignal | undefined;
  getAsyncHelpers: () => {
    promiseAll: typeof Promise.all;
    track: (maybePromises: ReadonlyArray<unknown>) => void;
  };
  onSignalAbort?(handler: () => void): void;
  detachSignalListener?(): void;
  signalPromise?: Promise<never>;
  schemaCoordinateInErrors?: boolean;
  /**
   * Internal execution plan when compile succeeded for this operation.
   * Stable docs reuse planned field maps; incremental / variable-collect docs
   * still attach the plan for per-field facts via FieldNode keys.
   */
  plan?: InternalExecutionPlan;
  /**
   * Optional sync-first work runner. Only attached for the duration of a
   * planned leaf-list field completion (field-local); nested object / skip
   * field-sets stay on classic `promiseForObject`.
   */
  plannedRunner?: PlannedWorkRunner;
}

export interface FormattedExecutionResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> {
  errors?: ReadonlyArray<GraphQLFormattedError>;
  data?: TData | null;
  extensions?: TExtensions;
}

export interface IncrementalExecutionResults<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> {
  initialResult: InitialIncrementalExecutionResult<TData, TExtensions>;
  subsequentResults: AsyncGenerator<
    SubsequentIncrementalExecutionResult<TData, TExtensions>,
    void,
    void
  >;
}

export interface InitialIncrementalExecutionResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> extends SingularExecutionResult<TData, TExtensions> {
  hasNext: boolean;
  pending?: ReadonlyArray<PendingResult>;
  incremental?: ReadonlyArray<IncrementalResult<TData, TExtensions>>;
  completed?: ReadonlyArray<CompletedResult>;
  extensions?: TExtensions;
}

export interface FormattedInitialIncrementalExecutionResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> extends FormattedExecutionResult<TData, TExtensions> {
  hasNext: boolean;
  pending?: ReadonlyArray<PendingResult>;
  incremental?: ReadonlyArray<FormattedIncrementalResult<TData, TExtensions>>;
  completed?: ReadonlyArray<CompletedResult>;
  extensions?: TExtensions;
}

export interface SubsequentIncrementalExecutionResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> {
  hasNext: boolean;
  pending?: ReadonlyArray<PendingResult>;
  incremental?: ReadonlyArray<IncrementalResult<TData, TExtensions>>;
  completed?: ReadonlyArray<CompletedResult>;
  extensions?: TExtensions;
}

export interface FormattedSubsequentIncrementalExecutionResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> {
  hasNext: boolean;
  pending?: ReadonlyArray<PendingResult>;
  incremental?: ReadonlyArray<FormattedIncrementalResult<TData, TExtensions>>;
  completed?: ReadonlyArray<CompletedResult>;
  extensions?: TExtensions;
}

export interface IncrementalDeferResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> extends SingularExecutionResult<TData, TExtensions> {
  path?: ReadonlyArray<string | number>;
  label?: string;
  id?: string;
  subPath?: ReadonlyArray<string | number>;
}

export interface FormattedIncrementalDeferResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> extends FormattedExecutionResult<TData, TExtensions> {
  path?: ReadonlyArray<string | number>;
  label?: string;
  id?: string;
  subPath?: ReadonlyArray<string | number>;
}

export interface IncrementalStreamResult<
  TData = Array<unknown>,
  TExtensions = Record<string, unknown>,
> {
  errors?: ReadonlyArray<GraphQLError>;
  items?: TData | null;
  path?: ReadonlyArray<string | number>;
  label?: string;
  id?: string;
  extensions?: TExtensions;
}

export interface FormattedIncrementalStreamResult<
  TData = Array<unknown>,
  TExtensions = Record<string, unknown>,
> {
  errors?: ReadonlyArray<GraphQLFormattedError>;
  items?: TData | null;
  path?: ReadonlyArray<string | number>;
  label?: string;
  id?: string;
  extensions?: TExtensions;
}

export type IncrementalResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> = IncrementalDeferResult<TData, TExtensions> | IncrementalStreamResult<TData, TExtensions>;

export type FormattedIncrementalResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> =
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
  signal?: AbortSignal;
  schemaCoordinateInErrors?: boolean;
  /**
   * When true, omit "Did you mean ...?" suggestion text from variable coercion
   * errors with GraphQL 17. GraphQL 16 ignores this option.
   * Matches `graphql@17`'s `ExecutionArgs.hideSuggestions`.
   */
  hideSuggestions?: Maybe<boolean>;
  /**
   * Incremental delivery payload format.
   *
   * HTTP mapping lives in `INCREMENTAL_DELIVERY_SPECS` from `@graphql-tools/utils`.
   * `'v0.1'` is the default.
   */
  incrementalSpec?: IncrementalSpec;
  /**
   * Optional precompiled opaque plan. When omitted, `execute` get-or-compiles
   * from the WeakMap cache for `(schema, document, operationName)`.
   */
  plan?: ExecutionPlan;
}
