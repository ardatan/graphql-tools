import type { GraphQLError, GraphQLFormattedError } from 'graphql';
import type { Path } from '@graphql-tools/utils';
import type { BoxedPromiseOrValue } from './BoxedPromiseOrValue.js';
import { DeferUsage } from './collectFields.js';

/**
 * The result of GraphQL execution.
 *
 *   - `errors` is included when any errors occurred as a non-empty array.
 *   - `data` is the result of a successful execution of the query.
 *   - `hasNext` is true if a future payload is expected.
 *   - `extensions` is reserved for adding non-standard properties.
 *   - `incremental` is a list of the results from defer/stream directives.
 */
export interface SingularExecutionResult<TData = any, TExtensions = any> {
  errors?: ReadonlyArray<GraphQLError>;
  data?: TData | null;
  extensions?: TExtensions;
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
  TData = unknown,
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
  data: TData;
  pending?: ReadonlyArray<PendingResult>;
  hasNext: true;
  extensions?: TExtensions;
}

export interface FormattedInitialIncrementalExecutionResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> extends FormattedExecutionResult<TData, TExtensions> {
  data: TData;
  pending?: ReadonlyArray<PendingResult>;
  hasNext: boolean;
  extensions?: TExtensions;
}

export interface SubsequentIncrementalExecutionResult<
  TData = unknown,
  TExtensions = Record<string, unknown>,
> {
  pending?: ReadonlyArray<PendingResult>;
  incremental?: ReadonlyArray<IncrementalResult<TData, TExtensions>>;
  completed?: ReadonlyArray<CompletedResult>;
  hasNext: boolean;
  extensions?: TExtensions;
}

export interface FormattedSubsequentIncrementalExecutionResult<
  TData = unknown,
  TExtensions = Record<string, unknown>,
> {
  hasNext: boolean;
  pending?: ReadonlyArray<PendingResult>;
  incremental?: ReadonlyArray<FormattedIncrementalResult<TData, TExtensions>>;
  completed?: ReadonlyArray<FormattedCompletedResult>;
  extensions?: TExtensions;
}

interface ExecutionGroupResult<TData = Record<string, unknown>> {
  errors?: ReadonlyArray<GraphQLError>;
  data: TData;
}

export interface IncrementalDeferResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> {
  errors?: ReadonlyArray<GraphQLError>;
  data: TData | null;
  id?: string;
  path?: ReadonlyArray<string | number>;
  label?: string;
  subPath?: ReadonlyArray<string | number>;
  extensions?: TExtensions;
}

export interface FormattedIncrementalDeferResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> {
  errors?: ReadonlyArray<GraphQLFormattedError>;
  data: TData | null;
  id: string;
  path?: ReadonlyArray<string | number>;
  label?: string;
  subPath?: ReadonlyArray<string | number>;
  extensions?: TExtensions;
}

interface StreamItemsRecordResult<TData = ReadonlyArray<unknown>> {
  errors?: ReadonlyArray<GraphQLError>;
  items: TData;
}

export interface IncrementalStreamResult<
  TData = ReadonlyArray<unknown>,
  TExtensions = Record<string, unknown>,
> {
  errors?: ReadonlyArray<GraphQLError>;
  items: TData | null;
  id?: string;
  path?: ReadonlyArray<string | number>;
  label?: string;
  extensions?: TExtensions;
}

export interface FormattedIncrementalStreamResult<
  TData = Array<unknown>,
  TExtensions = Record<string, unknown>,
> {
  errors?: ReadonlyArray<GraphQLFormattedError>;
  items: TData | null;
  id: string;
  path?: ReadonlyArray<string | number>;
  label?: string;
  extensions?: TExtensions;
}

export type IncrementalResult<TData = unknown, TExtensions = Record<string, unknown>> =
  | IncrementalDeferResult<TData, TExtensions>
  | IncrementalStreamResult<TData, TExtensions>;

export type FormattedIncrementalResult<TData = unknown, TExtensions = Record<string, unknown>> =
  | FormattedIncrementalDeferResult<TData, TExtensions>
  | FormattedIncrementalStreamResult<TData, TExtensions>;

export interface PendingResult {
  id: string;
  path: ReadonlyArray<string | number>;
  label?: string;
}

export interface CompletedResult {
  id: string;
  errors?: ReadonlyArray<GraphQLError>;
}

export interface FormattedCompletedResult {
  path: ReadonlyArray<string | number>;
  label?: string;
  errors?: ReadonlyArray<GraphQLError>;
}

export function isPendingExecutionGroup(
  incrementalDataRecord: IncrementalDataRecord,
): incrementalDataRecord is PendingExecutionGroup {
  return 'deferUsages' in incrementalDataRecord;
}

export type CompletedExecutionGroup = SuccessfulExecutionGroup | FailedExecutionGroup;

export function isCompletedExecutionGroup(
  incrementalDataRecordResult: IncrementalDataRecordResult,
): incrementalDataRecordResult is CompletedExecutionGroup {
  return 'pendingExecutionGroup' in incrementalDataRecordResult;
}

export interface SuccessfulExecutionGroup {
  pendingExecutionGroup: PendingExecutionGroup;
  path: Array<string | number>;
  result: ExecutionGroupResult;
  incrementalDataRecords: ReadonlyArray<IncrementalDataRecord> | undefined;
  errors?: never;
}

interface FailedExecutionGroup {
  pendingExecutionGroup: PendingExecutionGroup;
  path: Array<string | number>;
  errors: ReadonlyArray<GraphQLError>;
  result?: never;
}

export function isFailedExecutionGroup(
  completedExecutionGroup: CompletedExecutionGroup,
): completedExecutionGroup is FailedExecutionGroup {
  return completedExecutionGroup.errors !== undefined;
}

export interface PendingExecutionGroup {
  deferUsages: ReadonlySet<DeferUsage>;
  path: Path | undefined;
  result:
    | BoxedPromiseOrValue<CompletedExecutionGroup>
    | (() => BoxedPromiseOrValue<CompletedExecutionGroup>);
}

export interface StreamItemResult {
  path: Path;
  item?: unknown;
  incrementalDataRecords?: ReadonlyArray<IncrementalDataRecord> | undefined;
  errors?: ReadonlyArray<GraphQLError> | undefined;
}

export type StreamItemRecord =
  | BoxedPromiseOrValue<StreamItemResult>
  | (() => BoxedPromiseOrValue<StreamItemResult>);

export interface StreamRecord {
  path: Path;
  label: string | undefined;
  index: number;
  id?: string | undefined;
  streamItemQueue: Array<StreamItemRecord>;
}

export interface StreamItemsResult {
  streamRecord: StreamRecord;
  result?: StreamItemsRecordResult | undefined;
  incrementalDataRecords?: ReadonlyArray<IncrementalDataRecord> | undefined;
  errors?: ReadonlyArray<GraphQLError> | undefined;
}

export interface CancellableStreamRecord extends StreamRecord {
  earlyReturn: () => Promise<unknown>;
}

export function isCancellableStreamRecord(
  streamRecord: StreamRecord,
): streamRecord is CancellableStreamRecord {
  return 'earlyReturn' in streamRecord;
}

export type IncrementalDataRecord = PendingExecutionGroup | StreamRecord;

export type IncrementalDataRecordResult = CompletedExecutionGroup | StreamItemsResult;
