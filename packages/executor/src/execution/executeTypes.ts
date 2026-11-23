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
import type { ExecutionPlan, InternalExecutionPlan } from './planTypes.js';

export type { ExecutionPlan } from './planTypes.js';

export interface SingularExecutionResult<TData = any, TExtensions = any> {
  errors?: ReadonlyArray<GraphQLError>;
  data?: TData | null;
  extensions?: TExtensions;
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
   * Execution plan when compile succeeded for this operation.
   * Stable docs reuse planned field maps; incremental / variable-collect docs
   * still attach the plan for per-field facts via FieldNode keys.
   * Typed as the internal runtime shape; the public compile API returns the
   * opaque {@link ExecutionPlan} handle.
   */
  plan?: InternalExecutionPlan;
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

export interface ExecutionArgsShared<_TData = any, TVariables = any, TContext = any> {
  rootValue?: unknown;
  contextValue?: TContext;
  variableValues?: TVariables;
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
}

/**
 * Document-mode execution args (schema + document). Public name stays an
 * `interface` so callers can write `interface X extends ExecutionArgs`.
 * `plan?: undefined` keeps {@link ExecuteArgs} discriminated without making
 * `ExecutionArgs` itself a union.
 */
export interface ExecutionArgs<
  TData = any,
  TVariables = any,
  TContext = any,
> extends ExecutionArgsShared<TData, TVariables, TContext> {
  schema: GraphQLSchema;
  document: TypedDocumentNode<TData, TVariables>;
  operationName?: Maybe<string>;
  plan?: undefined;
}

/** Alias for document-mode args (same as {@link ExecutionArgs}). */
export type ExecutionArgsWithDocument<
  TData = any,
  TVariables = any,
  TContext = any,
> = ExecutionArgs<TData, TVariables, TContext>;

/**
 * Plan-only execution args. The opaque {@link ExecutionPlan} handle carries
 * schema / document / operation internally for warm reuse.
 */
export interface ExecutionArgsWithPlan<
  TVariables = any,
  TContext = any,
> extends ExecutionArgsShared<any, TVariables, TContext> {
  plan: ExecutionPlan;
  schema?: undefined;
  document?: undefined;
  operationName?: undefined;
}

/**
 * Args accepted by {@link execute} / {@link executeSync} / {@link subscribe}:
 * document mode **or** plan mode (not a breaking change to {@link ExecutionArgs}).
 */
export type ExecuteArgs<TData = any, TVariables = any, TContext = any> =
  ExecutionArgs<TData, TVariables, TContext> | ExecutionArgsWithPlan<TVariables, TContext>;
