import { GraphQLError } from 'graphql';
import { Path, pathToArray, type IncrementalSpec } from '@graphql-tools/utils';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { fakePromise, isPromise, type MaybePromise } from '@whatwg-node/promise-helpers';
import type {
  IncrementalDeferResult,
  IncrementalResult,
  IncrementalStreamResult,
  SubsequentIncrementalExecutionResult,
} from './execute.js';
import type { DeferUsage } from './incrementalCollect.js';

export interface PendingResult {
  id: string;
  path: ReadonlyArray<string | number>;
  label?: string;
}

export interface CompletedResult {
  id: string;
  errors?: ReadonlyArray<GraphQLError>;
}

export interface IncrementalPublisherState {
  nextId: number;
  ids: Map<object, string>;
  announced: Set<object>;
}

export function createIncrementalPublisherState(): IncrementalPublisherState {
  return {
    nextId: 0,
    ids: new Map(),
    announced: new Set(),
  };
}

/** Minimal context the incremental publisher and payload records need. */
export interface IncrementalPublisherContext {
  subsequentPayloads: Set<AsyncPayloadRecord>;
  incrementalSpec: IncrementalSpec;
  publisher?: IncrementalPublisherState;
  signalPromise?: Promise<never>;
  detachSignalListener?(): void;
  /**
   * Paths that were set to null by error bubbling. Present only on the
   * incremental collect path so default execution does not allocate.
   */
  nulledPaths?: Array<ReadonlyArray<string | number>>;
}

export class StreamGroup {
  path: Array<string | number>;
  label: string | undefined;
  parentContext: AsyncPayloadRecord | undefined;
  hasIterator: boolean;
  iteratorCompleted: boolean;
  openCount: number;

  constructor(opts: {
    path: Path | undefined;
    label: string | undefined;
    parentContext: AsyncPayloadRecord | undefined;
    hasIterator?: boolean;
  }) {
    this.path = pathToArray(opts.path);
    this.label = opts.label;
    this.parentContext = opts.parentContext;
    this.hasIterator = opts.hasIterator === true;
    this.iteratorCompleted = false;
    this.openCount = 0;
  }

  retain(): void {
    this.openCount++;
  }

  release(): void {
    this.openCount--;
  }

  isStillPending(): boolean {
    return this.openCount > 0 || (this.hasIterator && !this.iteratorCompleted);
  }
}

export function createStreamGroupIfV02(
  exeContext: IncrementalPublisherContext,
  opts: {
    path: Path | undefined;
    label: string | undefined;
    parentContext: AsyncPayloadRecord | undefined;
    hasIterator?: boolean;
  },
): StreamGroup | undefined {
  if (exeContext.incrementalSpec !== 'v0.2') {
    return undefined;
  }
  return new StreamGroup(opts);
}

export function deleteAsyncPayload(
  exeContext: IncrementalPublisherContext,
  record: AsyncPayloadRecord,
): void {
  exeContext.subsequentPayloads.delete(record);
  if (record.type === 'stream') {
    record.streamGroup?.release();
  }
}

export function pathStartsWith(
  path: ReadonlyArray<string | number>,
  prefix: ReadonlyArray<string | number>,
): boolean {
  if (prefix.length > path.length) {
    return false;
  }
  for (let i = 0; i < prefix.length; i++) {
    if (path[i] !== prefix[i]) {
      return false;
    }
  }
  return true;
}

export function isAtOrUnderNulledPath(
  path: ReadonlyArray<string | number>,
  nulledPaths: ReadonlyArray<ReadonlyArray<string | number>> | undefined,
): boolean {
  if (nulledPaths == null || nulledPaths.length === 0) {
    return false;
  }
  for (const nulledPath of nulledPaths) {
    if (pathStartsWith(path, nulledPath)) {
      return true;
    }
  }
  return false;
}

function isStrictlyUnderNulledPath(
  path: ReadonlyArray<string | number>,
  nulledPaths: ReadonlyArray<ReadonlyArray<string | number>>,
): boolean {
  for (const nulledPath of nulledPaths) {
    if (path.length > nulledPath.length && pathStartsWith(path, nulledPath)) {
      return true;
    }
  }
  return false;
}

function isExactNulledPath(
  path: ReadonlyArray<string | number>,
  nulledPaths: ReadonlyArray<ReadonlyArray<string | number>>,
): boolean {
  for (const nulledPath of nulledPaths) {
    if (path.length === nulledPath.length && pathStartsWith(path, nulledPath)) {
      return true;
    }
  }
  return false;
}

function isEmptyIncrementalData(data: unknown): boolean {
  if (data == null) {
    return true;
  }
  return (
    typeof data === 'object' &&
    !Array.isArray(data) &&
    Object.keys(data as Record<string, unknown>).length === 0
  );
}

/**
 * Drop keys that would write into a subtree already nulled by error bubbling.
 * Ancestor deferred records can still deliver sibling fields (e.g. `someField`
 * next to a nulled `b.c`).
 */
export function pruneUnmergeableIncrementalData(
  data: unknown,
  basePath: ReadonlyArray<string | number>,
  nulledPaths: ReadonlyArray<ReadonlyArray<string | number>> | undefined,
): unknown {
  if (nulledPaths == null || nulledPaths.length === 0 || data == null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item, index) => {
      const itemPath = [...basePath, index];
      if (isAtOrUnderNulledPath(itemPath, nulledPaths)) {
        return null;
      }
      return pruneUnmergeableIncrementalData(item, itemPath, nulledPaths);
    });
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const childPath = [...basePath, key];
    if (isStrictlyUnderNulledPath(childPath, nulledPaths)) {
      continue;
    }
    if (isExactNulledPath(childPath, nulledPaths)) {
      // Keep a null delivered by this payload; drop a non-null write into an
      // already-nulled object (Yaacov: unmergeable incremental).
      if (value != null) {
        continue;
      }
      result[key] = null;
      continue;
    }
    result[key] = pruneUnmergeableIncrementalData(value, childPath, nulledPaths);
  }
  return result;
}

function isAnnounced(exeContext: IncrementalPublisherContext, record: AsyncPayloadRecord): boolean {
  const state = exeContext.publisher;
  if (state == null) {
    return false;
  }
  return state.announced.has(getPublishNode(record));
}

/**
 * Cancel a subsequent record whose path is at or under a nulled position
 * (graphql-js 17 `hasNulledPosition`). v0.2 records that were already
 * announced stay in the set so the publisher can emit `completed` without
 * incremental data.
 */
export function cancelAsyncPayload(
  exeContext: IncrementalPublisherContext,
  record: AsyncPayloadRecord,
): void {
  record.cancelled = true;
  if (isStreamPayload(record) && record.iterator?.return) {
    record.iterator.return().catch(() => {
      // ignore error
    });
  }
  if (!record.isCompleted) {
    if (isStreamPayload(record)) {
      record.addItems(null);
    } else {
      record.addData(null);
    }
  }
  if (exeContext.incrementalSpec === 'v0.2' && isAnnounced(exeContext, record)) {
    return;
  }
  deleteAsyncPayload(exeContext, record);
}

export class DeferredFragmentRecord {
  type: 'defer';
  errors: Array<GraphQLError>;
  label: string | undefined;
  path: Array<string | number>;
  promise: Promise<void>;
  data: Record<string, unknown> | null;
  parentContext: AsyncPayloadRecord | undefined;
  deliveryParent: AsyncPayloadRecord | undefined;
  deferUsage: DeferUsage | undefined;
  isCompleted: boolean;
  cancelled: boolean;
  _exeContext: IncrementalPublisherContext;
  _resolve?: (arg: MaybePromise<Record<string, unknown> | null>) => void;
  constructor(opts: {
    label: string | undefined;
    path: Path | undefined;
    parentContext: AsyncPayloadRecord | undefined;
    deliveryParent?: AsyncPayloadRecord | undefined;
    exeContext: IncrementalPublisherContext;
    deferUsage?: DeferUsage;
  }) {
    this.type = 'defer';
    this.label = opts.label;
    this.path = pathToArray(opts.path);
    this.parentContext = opts.parentContext;
    this.deliveryParent = opts.deliveryParent ?? opts.parentContext;
    this.deferUsage = opts.deferUsage;
    this.errors = [];
    this._exeContext = opts.exeContext;
    this._exeContext.subsequentPayloads.add(this);
    this.isCompleted = false;
    this.cancelled = false;
    this.data = null;
    this.promise = new Promise<Record<string, unknown> | null>(resolve => {
      this._resolve = MaybePromise => {
        resolve(MaybePromise);
      };
    }).then(data => {
      this.data = data;
      this.isCompleted = true;
    });
  }

  addData(data: MaybePromise<Record<string, unknown> | null>) {
    const parentData = this.parentContext?.promise;
    if (parentData) {
      this._resolve?.(parentData.then(() => data));
      return;
    }
    this._resolve?.(data);
  }
}

export class StreamRecord {
  type: 'stream';
  errors: Array<GraphQLError>;
  label: string | undefined;
  path: Array<string | number>;
  items: Array<unknown> | null;
  promise: Promise<void>;
  parentContext: AsyncPayloadRecord | undefined;
  iterator: AsyncIterator<unknown> | undefined;
  isCompletedIterator?: boolean;
  isCompleted: boolean;
  cancelled: boolean;
  streamGroup: StreamGroup | undefined;
  _exeContext: IncrementalPublisherContext;
  _resolve?: (arg: MaybePromise<Array<unknown> | null>) => void;
  constructor(opts: {
    label: string | undefined;
    path: Path | undefined;
    iterator?: AsyncIterator<unknown>;
    parentContext: AsyncPayloadRecord | undefined;
    exeContext: IncrementalPublisherContext;
    streamGroup?: StreamGroup;
  }) {
    this.type = 'stream';
    this.items = null;
    this.label = opts.label;
    this.path = pathToArray(opts.path);
    this.parentContext = opts.parentContext;
    this.iterator = opts.iterator;
    this.streamGroup = opts.streamGroup;
    this.errors = [];
    this._exeContext = opts.exeContext;
    this._exeContext.subsequentPayloads.add(this);
    this.streamGroup?.retain();
    this.isCompleted = false;
    this.cancelled = false;
    this.items = null;
    this.promise = new Promise<Array<unknown> | null>(resolve => {
      this._resolve = MaybePromise => {
        resolve(MaybePromise);
      };
    }).then(items => {
      this.items = items;
      this.isCompleted = true;
    });
  }

  addItems(items: MaybePromise<Array<unknown> | null>) {
    const parentData = this.parentContext?.promise;
    if (parentData) {
      this._resolve?.(parentData.then(() => items));
      return;
    }
    this._resolve?.(items);
  }

  setIsCompletedIterator() {
    this.isCompletedIterator = true;
    if (this.streamGroup) {
      this.streamGroup.iteratorCompleted = true;
    }
  }
}

export type AsyncPayloadRecord = DeferredFragmentRecord | StreamRecord;

export function isStreamPayload(asyncPayload: AsyncPayloadRecord): asyncPayload is StreamRecord {
  return asyncPayload.type === 'stream';
}

function ensureId(state: IncrementalPublisherState, node: object): string {
  let id = state.ids.get(node);
  if (id !== undefined) {
    return id;
  }
  id = String(state.nextId++);
  state.ids.set(node, id);
  return id;
}

function getPublishNode(record: AsyncPayloadRecord): object {
  return record.type === 'stream' ? (record.streamGroup ?? record) : record;
}

function getPublishParent(record: AsyncPayloadRecord): AsyncPayloadRecord | undefined {
  if (record.type === 'stream') {
    return record.streamGroup?.parentContext;
  }
  return record.deliveryParent ?? record.parentContext;
}

function isParentAnnouncedOrRoot(
  record: AsyncPayloadRecord,
  state: IncrementalPublisherState,
): boolean {
  const parent = getPublishParent(record);
  if (parent == null) {
    return true;
  }
  return state.announced.has(getPublishNode(parent));
}

function toPendingResult(
  state: IncrementalPublisherState,
  record: AsyncPayloadRecord,
): PendingResult {
  const node = getPublishNode(record);
  const pending: PendingResult = {
    id: ensureId(state, node),
    path: record.type === 'stream' ? (record.streamGroup?.path ?? record.path) : record.path,
  };
  const label = record.type === 'stream' ? record.streamGroup?.label : record.label;
  if (label !== undefined) {
    pending.label = label;
  }
  return pending;
}

function announceIfNeeded(
  record: AsyncPayloadRecord,
  state: IncrementalPublisherState,
  pending: Array<PendingResult>,
): void {
  if (record.cancelled) {
    return;
  }
  const node = getPublishNode(record);
  if (state.announced.has(node)) {
    return;
  }
  if (!isParentAnnouncedOrRoot(record, state)) {
    return;
  }
  pending.push(toPendingResult(state, record));
  state.announced.add(node);
}

export function collectInitialPending(
  exeContext: IncrementalPublisherContext,
): Array<PendingResult> {
  const state = exeContext.publisher;
  if (state == null) {
    return [];
  }
  const pending: Array<PendingResult> = [];
  for (const record of exeContext.subsequentPayloads) {
    if (getPublishParent(record) != null) {
      continue;
    }
    announceIfNeeded(record, state, pending);
  }
  return pending;
}

function getCompletedIncrementalResults(
  exeContext: IncrementalPublisherContext,
): Array<IncrementalResult> {
  const incrementalResults: Array<IncrementalResult> = [];
  for (const asyncPayloadRecord of exeContext.subsequentPayloads) {
    const incrementalResult: IncrementalResult = {};
    if (!asyncPayloadRecord.isCompleted) {
      continue;
    }
    deleteAsyncPayload(exeContext, asyncPayloadRecord);
    if (asyncPayloadRecord.cancelled) {
      continue;
    }
    if (isStreamPayload(asyncPayloadRecord)) {
      const items = asyncPayloadRecord.items;
      if (asyncPayloadRecord.isCompletedIterator) {
        // async iterable resolver just finished but there may be pending payloads
        continue;
      }
      (incrementalResult as IncrementalStreamResult).items = items;
    } else {
      const data = pruneUnmergeableIncrementalData(
        asyncPayloadRecord.data,
        asyncPayloadRecord.path,
        exeContext.nulledPaths,
      );
      if (isEmptyIncrementalData(data) && asyncPayloadRecord.errors.length === 0) {
        continue;
      }
      (incrementalResult as IncrementalDeferResult).data =
        (data as Record<string, unknown> | null) ?? null;
    }

    incrementalResult.path = asyncPayloadRecord.path;
    if (asyncPayloadRecord.label) {
      incrementalResult.label = asyncPayloadRecord.label;
    }
    if (asyncPayloadRecord.errors.length > 0) {
      incrementalResult.errors = asyncPayloadRecord.errors;
    }
    incrementalResults.push(incrementalResult);
  }
  return incrementalResults;
}

function buildSubsequentV02(
  exeContext: IncrementalPublisherContext,
  completedRecords: Array<AsyncPayloadRecord>,
): SubsequentIncrementalExecutionResult {
  const state = exeContext.publisher;
  if (state == null) {
    return { hasNext: exeContext.subsequentPayloads.size > 0 };
  }
  const pending: Array<PendingResult> = [];
  const incremental: Array<IncrementalResult> = [];
  const completed: Array<CompletedResult> = [];

  let announcedCount: number;
  do {
    announcedCount = pending.length;
    for (const record of completedRecords) {
      announceIfNeeded(record, state, pending);
    }
    for (const record of exeContext.subsequentPayloads) {
      announceIfNeeded(record, state, pending);
    }
  } while (pending.length !== announcedCount);

  const streamBatches = new Map<
    StreamGroup,
    { items: Array<unknown>; errors: Array<GraphQLError>; failed: boolean }
  >();
  const completedGroups = new Set<StreamGroup>();
  const iteratorDoneGroups = new Set<StreamGroup>();

  for (const record of completedRecords) {
    if (record.type === 'defer') {
      if (!state.announced.has(record)) {
        continue;
      }
      const id = ensureId(state, record);
      if (record.cancelled) {
        completed.push({ id });
        continue;
      }
      const data = pruneUnmergeableIncrementalData(
        record.data,
        record.path,
        exeContext.nulledPaths,
      );
      if (
        (record.data == null && record.errors.length > 0) ||
        (isEmptyIncrementalData(data) && record.errors.length > 0)
      ) {
        completed.push({ id, errors: record.errors });
      } else if (isEmptyIncrementalData(data) && record.errors.length === 0) {
        completed.push({ id });
      } else {
        const incrementalResult: IncrementalDeferResult = {
          id,
          data: (data as Record<string, unknown> | null) ?? null,
        };
        if (record.errors.length > 0) {
          incrementalResult.errors = record.errors;
        }
        incremental.push(incrementalResult);
        completed.push({ id });
      }
      continue;
    }

    if (record.isCompletedIterator) {
      if (record.streamGroup) {
        iteratorDoneGroups.add(record.streamGroup);
      }
      continue;
    }

    const group = record.streamGroup;
    if (group == null || !state.announced.has(group)) {
      continue;
    }
    let batch = streamBatches.get(group);
    if (batch == null) {
      batch = { items: [], errors: [], failed: false };
      streamBatches.set(group, batch);
    }
    if (record.items == null) {
      batch.failed = true;
      batch.errors.push(...record.errors);
    } else {
      batch.items.push(...record.items);
      if (record.errors.length > 0) {
        batch.errors.push(...record.errors);
      }
    }
  }

  for (const [group, batch] of streamBatches) {
    const id = ensureId(state, group);
    if (batch.failed) {
      const completedResult: CompletedResult = { id };
      if (batch.errors.length > 0) {
        completedResult.errors = batch.errors;
      }
      completed.push(completedResult);
      continue;
    }
    const incrementalResult: IncrementalStreamResult = { id, items: batch.items };
    if (batch.errors.length > 0) {
      incrementalResult.errors = batch.errors;
    }
    incremental.push(incrementalResult);
    if (!group.isStillPending()) {
      completedGroups.add(group);
    }
  }

  for (const group of iteratorDoneGroups) {
    if (state.announced.has(group) && !group.isStillPending() && !streamBatches.has(group)) {
      completedGroups.add(group);
    }
  }

  for (const group of completedGroups) {
    completed.push({ id: ensureId(state, group) });
  }

  let hasNext = exeContext.subsequentPayloads.size > 0;
  if (!hasNext) {
    for (const group of streamBatches.keys()) {
      if (group.isStillPending()) {
        hasNext = true;
        break;
      }
    }
  }

  const result: SubsequentIncrementalExecutionResult = { hasNext };
  if (pending.length > 0) {
    result.pending = pending;
  }
  if (incremental.length > 0) {
    result.incremental = incremental;
  }
  if (completed.length > 0) {
    result.completed = completed;
  }
  return result;
}

export function yieldSubsequentPayloads(
  exeContext: IncrementalPublisherContext,
): AsyncGenerator<SubsequentIncrementalExecutionResult, void, void> {
  let isDone = false;
  const isV02 = exeContext.incrementalSpec === 'v0.2';
  const markDone = () => {
    isDone = true;
    exeContext.detachSignalListener?.();
  };

  async function next(): Promise<IteratorResult<SubsequentIncrementalExecutionResult, void>> {
    if (isDone) {
      return { value: undefined, done: true };
    }

    const subSequentPayloadPromises = Array.from(exeContext.subsequentPayloads).map(
      record => record.promise,
    );

    if (subSequentPayloadPromises.length === 0) {
      markDone();
      return { value: { hasNext: false }, done: false };
    }

    if (exeContext.signalPromise) {
      await Promise.race([exeContext.signalPromise, ...subSequentPayloadPromises]);
    } else {
      await Promise.race(subSequentPayloadPromises);
    }

    if (isDone) {
      // a different call to next has exhausted all payloads
      return { value: undefined, done: true };
    }

    if (isV02) {
      const completedRecords: Array<AsyncPayloadRecord> = [];
      for (const record of exeContext.subsequentPayloads) {
        if (record.isCompleted) {
          completedRecords.push(record);
          deleteAsyncPayload(exeContext, record);
        }
      }

      const result = buildSubsequentV02(exeContext, completedRecords);
      const hasWork =
        result.hasNext ||
        result.incremental != null ||
        result.pending != null ||
        result.completed != null;

      if (!hasWork && result.hasNext) {
        return next();
      }

      if (!result.incremental && !result.pending && !result.completed && result.hasNext) {
        return next();
      }

      if (!result.hasNext) {
        markDone();
      }

      return { value: result, done: false };
    }

    const incremental = getCompletedIncrementalResults(exeContext);
    const hasNext = exeContext.subsequentPayloads.size > 0;

    if (!incremental.length && hasNext) {
      return next();
    }

    if (!hasNext) {
      markDone();
    }

    return {
      value: incremental.length ? { incremental, hasNext } : { hasNext },
      done: false,
    };
  }

  function returnStreamIterators(): Promise<void> {
    const promises: Array<Promise<unknown>> = [];
    exeContext.subsequentPayloads.forEach(asyncPayloadRecord => {
      if (isStreamPayload(asyncPayloadRecord) && asyncPayloadRecord.iterator?.return) {
        const result = asyncPayloadRecord.iterator.return();
        if (isPromise(result)) {
          promises.push(result as Promise<unknown>);
        }
      }
    });
    if (promises.length === 0) {
      return fakePromise();
    }
    if (promises.length === 1) {
      return promises[0].then((): void => {});
    }
    return Promise.all(promises).then((): void => {});
  }

  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    next,
    return(): Promise<IteratorResult<SubsequentIncrementalExecutionResult, void>> {
      markDone();
      return returnStreamIterators().then(() => ({
        value: undefined,
        done: true as const,
      }));
    },
    throw(error?: unknown): Promise<IteratorResult<never, void>> {
      markDone();
      return returnStreamIterators().then(() => {
        throw error;
      });
    },
    [DisposableSymbols.asyncDispose]() {
      markDone();
      return returnStreamIterators();
    },
  };
}
