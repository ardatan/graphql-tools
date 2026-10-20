import { GraphQLError } from 'graphql';
import { Path, pathToArray, type IncrementalSpec } from '@graphql-tools/utils';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { type MaybePromise } from '@whatwg-node/promise-helpers';
import type {
  IncrementalDeferResult,
  IncrementalResult,
  IncrementalStreamResult,
  SubsequentIncrementalExecutionResult,
} from './execute.js';

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

export class DeferredFragmentRecord {
  type: 'defer';
  errors: Array<GraphQLError>;
  label: string | undefined;
  path: Array<string | number>;
  promise: Promise<void>;
  data: Record<string, unknown> | null;
  parentContext: AsyncPayloadRecord | undefined;
  deliveryParent: AsyncPayloadRecord | undefined;
  isCompleted: boolean;
  _exeContext: IncrementalPublisherContext;
  _resolve?: (arg: MaybePromise<Record<string, unknown> | null>) => void;
  constructor(opts: {
    label: string | undefined;
    path: Path | undefined;
    parentContext: AsyncPayloadRecord | undefined;
    deliveryParent?: AsyncPayloadRecord | undefined;
    exeContext: IncrementalPublisherContext;
  }) {
    this.type = 'defer';
    this.label = opts.label;
    this.path = pathToArray(opts.path);
    this.parentContext = opts.parentContext;
    this.deliveryParent = opts.deliveryParent ?? opts.parentContext;
    this.errors = [];
    this._exeContext = opts.exeContext;
    this._exeContext.subsequentPayloads.add(this);
    this.isCompleted = false;
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
    if (isStreamPayload(asyncPayloadRecord)) {
      const items = asyncPayloadRecord.items;
      if (asyncPayloadRecord.isCompletedIterator) {
        // async iterable resolver just finished but there may be pending payloads
        continue;
      }
      (incrementalResult as IncrementalStreamResult).items = items;
    } else {
      const data = asyncPayloadRecord.data;
      (incrementalResult as IncrementalDeferResult).data = data ?? null;
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
      if (record.data == null && record.errors.length > 0) {
        completed.push({ id, errors: record.errors });
      } else {
        const incrementalResult: IncrementalDeferResult = {
          id,
          data: record.data ?? null,
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

  async function next(): Promise<IteratorResult<SubsequentIncrementalExecutionResult, void>> {
    if (isDone) {
      return { value: undefined, done: true };
    }

    const subSequentPayloadPromises = Array.from(exeContext.subsequentPayloads).map(
      record => record.promise,
    );

    if (subSequentPayloadPromises.length === 0) {
      isDone = true;
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
        isDone = true;
      }

      return { value: result, done: false };
    }

    const incremental = getCompletedIncrementalResults(exeContext);
    const hasNext = exeContext.subsequentPayloads.size > 0;

    if (!incremental.length && hasNext) {
      return next();
    }

    if (!hasNext) {
      isDone = true;
    }

    return {
      value: incremental.length ? { incremental, hasNext } : { hasNext },
      done: false,
    };
  }

  function returnStreamIterators() {
    const promises: Array<Promise<IteratorResult<unknown>>> = [];
    exeContext.subsequentPayloads.forEach(asyncPayloadRecord => {
      if (isStreamPayload(asyncPayloadRecord) && asyncPayloadRecord.iterator?.return) {
        promises.push(asyncPayloadRecord.iterator.return());
      }
    });
    return Promise.all(promises);
  }

  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    next,
    async return(): Promise<IteratorResult<SubsequentIncrementalExecutionResult, void>> {
      await returnStreamIterators();
      isDone = true;
      return { value: undefined, done: true };
    },
    async throw(error?: unknown): Promise<IteratorResult<never, void>> {
      await returnStreamIterators();
      isDone = true;
      throw error;
    },
    async [DisposableSymbols.asyncDispose]() {
      await returnStreamIterators();
      isDone = true;
    },
  };
}
