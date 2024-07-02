import type { GraphQLError } from 'graphql';
import { isPromise } from '@graphql-tools/utils';
import { BoxedPromiseOrValue } from './BoxedPromiseOrValue.js';
import { invariant } from './invariant.js';
import { promiseWithResolvers } from './promiseWithResolvers.js';
import type {
  DeferredFragmentRecord,
  DeferredGroupedFieldSetRecord,
  DeferredGroupedFieldSetResult,
  IncrementalDataRecord,
  IncrementalDataRecordResult,
  ReconcilableDeferredGroupedFieldSetResult,
  StreamItemRecord,
  StreamRecord,
  SubsequentResultRecord,
} from './types.js';
import { isDeferredFragmentRecord, isDeferredGroupedFieldSetRecord } from './types.js';

/**
 * @internal
 */
export class IncrementalGraph {
  private _rootNodes: Set<SubsequentResultRecord>;

  private _completedQueue: Array<IncrementalDataRecordResult>;
  private _nextQueue: Array<
    (iterable: IteratorResult<Iterable<IncrementalDataRecordResult>>) => void
  >;

  constructor() {
    this._rootNodes = new Set();
    this._completedQueue = [];
    this._nextQueue = [];
  }

  getNewPending(
    incrementalDataRecords: ReadonlyArray<IncrementalDataRecord>,
  ): ReadonlyArray<SubsequentResultRecord> {
    const initialResultChildren = new Set<SubsequentResultRecord>();
    this._addIncrementalDataRecords(incrementalDataRecords, undefined, initialResultChildren);
    return this._promoteNonEmptyToRoot(initialResultChildren);
  }

  addCompletedReconcilableDeferredGroupedFieldSet(
    reconcilableResult: ReconcilableDeferredGroupedFieldSetResult,
  ): void {
    for (const deferredFragmentRecord of reconcilableResult.deferredGroupedFieldSetRecord
      .deferredFragmentRecords) {
      deferredFragmentRecord.deferredGroupedFieldSetRecords.delete(
        reconcilableResult.deferredGroupedFieldSetRecord,
      );
      deferredFragmentRecord.reconcilableResults.add(reconcilableResult);
    }

    const incrementalDataRecords = reconcilableResult.incrementalDataRecords;
    if (incrementalDataRecords !== undefined) {
      this._addIncrementalDataRecords(
        incrementalDataRecords,
        reconcilableResult.deferredGroupedFieldSetRecord.deferredFragmentRecords,
      );
    }
  }

  completedIncrementalData() {
    return {
      [Symbol.asyncIterator]() {
        return this;
      },
      next: (): Promise<IteratorResult<Iterable<IncrementalDataRecordResult>>> => {
        const firstResult = this._completedQueue.shift();
        if (firstResult !== undefined) {
          return Promise.resolve({
            value: this._yieldCurrentCompletedIncrementalData(firstResult),
            done: false,
          });
        }
        const { promise, resolve } =
          promiseWithResolvers<IteratorResult<Iterable<IncrementalDataRecordResult>>>();
        this._nextQueue.push(resolve);
        return promise;
      },
      return: (): Promise<IteratorResult<Iterable<IncrementalDataRecordResult>>> => {
        for (const resolve of this._nextQueue) {
          resolve({ value: undefined, done: true });
        }
        return Promise.resolve({ value: undefined, done: true });
      },
    };
  }

  hasNext(): boolean {
    return this._rootNodes.size > 0;
  }

  completeDeferredFragment(deferredFragmentRecord: DeferredFragmentRecord):
    | {
        newPending: ReadonlyArray<SubsequentResultRecord>;
        reconcilableResults: ReadonlyArray<ReconcilableDeferredGroupedFieldSetResult>;
      }
    | undefined {
    if (
      !this._rootNodes.has(deferredFragmentRecord) ||
      deferredFragmentRecord.deferredGroupedFieldSetRecords.size > 0
    ) {
      return;
    }
    const reconcilableResults = Array.from(deferredFragmentRecord.reconcilableResults);
    this._removePending(deferredFragmentRecord);
    for (const reconcilableResult of reconcilableResults) {
      for (const otherDeferredFragmentRecord of reconcilableResult.deferredGroupedFieldSetRecord
        .deferredFragmentRecords) {
        otherDeferredFragmentRecord.reconcilableResults.delete(reconcilableResult);
      }
    }
    const newPending = this._promoteNonEmptyToRoot(deferredFragmentRecord.children);
    return { newPending, reconcilableResults };
  }

  removeDeferredFragment(deferredFragmentRecord: DeferredFragmentRecord): boolean {
    if (!this._rootNodes.has(deferredFragmentRecord)) {
      return false;
    }
    this._removePending(deferredFragmentRecord);
    return true;
  }

  removeStream(streamRecord: StreamRecord): void {
    this._removePending(streamRecord);
  }

  private _removePending(subsequentResultRecord: SubsequentResultRecord): void {
    this._rootNodes.delete(subsequentResultRecord);
    if (this._rootNodes.size === 0) {
      for (const resolve of this._nextQueue) {
        resolve({ value: undefined, done: true });
      }
    }
  }

  private _addIncrementalDataRecords(
    incrementalDataRecords: ReadonlyArray<IncrementalDataRecord>,
    parents: ReadonlyArray<DeferredFragmentRecord> | undefined,
    initialResultChildren?: Set<SubsequentResultRecord> | undefined,
  ): void {
    for (const incrementalDataRecord of incrementalDataRecords) {
      if (isDeferredGroupedFieldSetRecord(incrementalDataRecord)) {
        for (const deferredFragmentRecord of incrementalDataRecord.deferredFragmentRecords) {
          this._addDeferredFragment(deferredFragmentRecord, initialResultChildren);
          deferredFragmentRecord.deferredGroupedFieldSetRecords.add(incrementalDataRecord);
        }
        if (this._hasPendingFragment(incrementalDataRecord)) {
          this._onDeferredGroupedFieldSet(incrementalDataRecord);
        }
      } else if (parents === undefined) {
        invariant(initialResultChildren !== undefined);
        initialResultChildren.add(incrementalDataRecord);
      } else {
        for (const parent of parents) {
          this._addDeferredFragment(parent, initialResultChildren);
          parent.children.add(incrementalDataRecord);
        }
      }
    }
  }

  private _promoteNonEmptyToRoot(
    maybeEmptyNewPending: Set<SubsequentResultRecord>,
  ): ReadonlyArray<SubsequentResultRecord> {
    const newPending: Array<SubsequentResultRecord> = [];
    for (const subsequentResultRecord of maybeEmptyNewPending) {
      if (isDeferredFragmentRecord(subsequentResultRecord)) {
        if (subsequentResultRecord.deferredGroupedFieldSetRecords.size > 0) {
          subsequentResultRecord.setAsPending();
          for (const deferredGroupedFieldSetRecord of subsequentResultRecord.deferredGroupedFieldSetRecords) {
            if (!this._hasPendingFragment(deferredGroupedFieldSetRecord)) {
              this._onDeferredGroupedFieldSet(deferredGroupedFieldSetRecord);
            }
          }
          this._rootNodes.add(subsequentResultRecord);
          newPending.push(subsequentResultRecord);
          continue;
        }
        for (const child of subsequentResultRecord.children) {
          maybeEmptyNewPending.add(child);
        }
      } else {
        this._rootNodes.add(subsequentResultRecord);
        newPending.push(subsequentResultRecord);

        this._onStreamItems(subsequentResultRecord);
      }
    }
    return newPending;
  }

  private _hasPendingFragment(
    deferredGroupedFieldSetRecord: DeferredGroupedFieldSetRecord,
  ): boolean {
    return deferredGroupedFieldSetRecord.deferredFragmentRecords.some(deferredFragmentRecord =>
      this._rootNodes.has(deferredFragmentRecord),
    );
  }

  private _addDeferredFragment(
    deferredFragmentRecord: DeferredFragmentRecord,
    subsequentResultRecords: Set<SubsequentResultRecord> | undefined,
  ): void {
    if (this._rootNodes.has(deferredFragmentRecord)) {
      return;
    }
    const parent = deferredFragmentRecord.parent;
    if (parent === undefined) {
      invariant(subsequentResultRecords !== undefined);
      subsequentResultRecords.add(deferredFragmentRecord);
      return;
    }
    parent.children.add(deferredFragmentRecord);
    this._addDeferredFragment(parent, subsequentResultRecords);
  }

  private _onDeferredGroupedFieldSet(
    deferredGroupedFieldSetRecord: DeferredGroupedFieldSetRecord,
  ): void {
    const result = (
      deferredGroupedFieldSetRecord.result as BoxedPromiseOrValue<DeferredGroupedFieldSetResult>
    ).value;
    if (isPromise(result)) {
      result.then(resolved => this._enqueue(resolved));
    } else {
      this._enqueue(result);
    }
  }

  private async _onStreamItems(streamRecord: StreamRecord): Promise<void> {
    let items: Array<unknown> = [];
    let errors: Array<GraphQLError> = [];
    let incrementalDataRecords: Array<IncrementalDataRecord> = [];
    const streamItemQueue = streamRecord.streamItemQueue;
    let streamItemRecord: StreamItemRecord | undefined;
    while ((streamItemRecord = streamItemQueue.shift()) !== undefined) {
      let result =
        streamItemRecord instanceof BoxedPromiseOrValue
          ? streamItemRecord.value
          : streamItemRecord().value;
      if (isPromise(result)) {
        if (items.length > 0) {
          this._enqueue({
            streamRecord,
            result:
              // TODO add additional test case or rework for coverage
              errors.length > 0 /* c8 ignore start */
                ? { items, errors } /* c8 ignore stop */
                : { items },
            incrementalDataRecords,
          });
          items = [];
          errors = [];
          incrementalDataRecords = [];
        }
        result = await result;
        // wait an additional tick to coalesce resolving additional promises
        // within the queue
        await Promise.resolve();
      }
      if (result.item === undefined) {
        if (items.length > 0) {
          this._enqueue({
            streamRecord,
            result: errors.length > 0 ? { items, errors } : { items },
            incrementalDataRecords,
          });
        }
        this._enqueue(
          result.errors === undefined
            ? { streamRecord }
            : {
                streamRecord,
                errors: result.errors,
              },
        );
        return;
      }
      items.push(result.item);
      if (result.errors !== undefined) {
        errors.push(...result.errors);
      }
      if (result.incrementalDataRecords !== undefined) {
        incrementalDataRecords.push(...result.incrementalDataRecords);
      }
    }
  }

  private *_yieldCurrentCompletedIncrementalData(
    first: IncrementalDataRecordResult,
  ): Generator<IncrementalDataRecordResult> {
    yield first;
    let completed;
    while ((completed = this._completedQueue.shift()) !== undefined) {
      yield completed;
    }
  }

  private _enqueue(completed: IncrementalDataRecordResult): void {
    const next = this._nextQueue.shift();
    if (next !== undefined) {
      next({
        value: this._yieldCurrentCompletedIncrementalData(completed),
        done: false,
      });
      return;
    }
    this._completedQueue.push(completed);
  }
}
