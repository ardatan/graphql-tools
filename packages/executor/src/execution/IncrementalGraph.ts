import type { GraphQLError } from 'graphql';
import { createDeferred, isPromise } from '@graphql-tools/utils';
import { BoxedPromiseOrValue } from './BoxedPromiseOrValue.js';
import { invariant } from './invariant.js';
import type {
  CompletedExecutionGroup,
  DeferredFragmentRecord,
  DeliveryGroup,
  IncrementalDataRecord,
  IncrementalDataRecordResult,
  PendingExecutionGroup,
  StreamItemRecord,
  StreamRecord,
  SuccessfulExecutionGroup,
} from './types.js';
import { isDeferredFragmentRecord, isPendingExecutionGroup } from './types.js';

/**
 * @internal
 */
export class IncrementalGraph {
  private _rootNodes: Set<DeliveryGroup>;

  private _completedQueue: Array<IncrementalDataRecordResult>;
  private _nextQueue: Array<(iterable: Iterable<IncrementalDataRecordResult> | undefined) => void>;

  constructor() {
    this._rootNodes = new Set();
    this._completedQueue = [];
    this._nextQueue = [];
  }

  getNewPending(
    incrementalDataRecords: ReadonlyArray<IncrementalDataRecord>,
  ): ReadonlyArray<DeliveryGroup> {
    const initialResultChildren = new Set<DeliveryGroup>();
    this._addIncrementalDataRecords(incrementalDataRecords, undefined, initialResultChildren);
    return this._promoteNonEmptyToRoot(initialResultChildren);
  }

  addCompletedSuccessfulExecutionGroup(successfulExecutionGroup: SuccessfulExecutionGroup): void {
    const { pendingExecutionGroup, incrementalDataRecords } = successfulExecutionGroup;

    const deferredFragmentRecords = pendingExecutionGroup.deferredFragmentRecords;

    for (const deferredFragmentRecord of deferredFragmentRecords) {
      const { pendingExecutionGroups, successfulExecutionGroups } = deferredFragmentRecord;
      pendingExecutionGroups.delete(successfulExecutionGroup.pendingExecutionGroup);
      successfulExecutionGroups.add(successfulExecutionGroup);
    }

    if (incrementalDataRecords !== undefined) {
      this._addIncrementalDataRecords(incrementalDataRecords, deferredFragmentRecords);
    }
  }

  *currentCompletedBatch(): Generator<IncrementalDataRecordResult> {
    let completed;
    while ((completed = this._completedQueue.shift()) !== undefined) {
      yield completed;
    }
    if (this._rootNodes.size === 0) {
      for (const resolve of this._nextQueue) {
        resolve(undefined);
      }
    }
  }

  nextCompletedBatch(): Promise<Iterable<IncrementalDataRecordResult> | undefined> {
    const { promise, resolve } = createDeferred<
      Iterable<IncrementalDataRecordResult> | undefined
    >();
    this._nextQueue.push(resolve);
    return promise;
  }

  abort(): void {
    for (const resolve of this._nextQueue) {
      resolve(undefined);
    }
  }

  hasNext(): boolean {
    return this._rootNodes.size > 0;
  }

  completeDeferredFragment(deferredFragmentRecord: DeferredFragmentRecord):
    | {
        newPending: ReadonlyArray<DeliveryGroup>;
        successfulExecutionGroups: ReadonlyArray<SuccessfulExecutionGroup>;
      }
    | undefined {
    if (
      !this._rootNodes.has(deferredFragmentRecord) ||
      deferredFragmentRecord.pendingExecutionGroups.size > 0
    ) {
      return;
    }
    const successfulExecutionGroups = Array.from(deferredFragmentRecord.successfulExecutionGroups);
    this._rootNodes.delete(deferredFragmentRecord);
    for (const successfulExecutionGroup of successfulExecutionGroups) {
      for (const otherDeferredFragmentRecord of successfulExecutionGroup.pendingExecutionGroup
        .deferredFragmentRecords) {
        otherDeferredFragmentRecord.successfulExecutionGroups.delete(successfulExecutionGroup);
      }
    }
    const newPending = this._promoteNonEmptyToRoot(deferredFragmentRecord.children);
    return { newPending, successfulExecutionGroups };
  }

  removeDeferredFragment(deferredFragmentRecord: DeferredFragmentRecord): boolean {
    if (!this._rootNodes.has(deferredFragmentRecord)) {
      return false;
    }
    this._rootNodes.delete(deferredFragmentRecord);
    return true;
  }

  removeStream(streamRecord: StreamRecord): void {
    this._rootNodes.delete(streamRecord);
  }

  private _addIncrementalDataRecords(
    incrementalDataRecords: ReadonlyArray<IncrementalDataRecord>,
    parents: ReadonlyArray<DeferredFragmentRecord> | undefined,
    initialResultChildren?: Set<DeliveryGroup> | undefined,
  ): void {
    for (const incrementalDataRecord of incrementalDataRecords) {
      if (isPendingExecutionGroup(incrementalDataRecord)) {
        for (const deferredFragmentRecord of incrementalDataRecord.deferredFragmentRecords) {
          this._addDeferredFragment(deferredFragmentRecord, initialResultChildren);
          deferredFragmentRecord.pendingExecutionGroups.add(incrementalDataRecord);
        }
        if (this._hasPendingFragment(incrementalDataRecord)) {
          this._onExecutionGroup(incrementalDataRecord);
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
    maybeEmptyNewPending: Set<DeliveryGroup>,
  ): ReadonlyArray<DeliveryGroup> {
    const newPending: Array<DeliveryGroup> = [];
    for (const deliveryGroup of maybeEmptyNewPending) {
      if (isDeferredFragmentRecord(deliveryGroup)) {
        if (deliveryGroup.pendingExecutionGroups.size > 0) {
          deliveryGroup.setAsPending();
          for (const pendingExecutionGroup of deliveryGroup.pendingExecutionGroups) {
            if (!this._hasPendingFragment(pendingExecutionGroup)) {
              this._onExecutionGroup(pendingExecutionGroup);
            }
          }
          this._rootNodes.add(deliveryGroup);
          newPending.push(deliveryGroup);
          continue;
        }
        for (const child of deliveryGroup.children) {
          maybeEmptyNewPending.add(child);
        }
      } else {
        this._rootNodes.add(deliveryGroup);
        newPending.push(deliveryGroup);

        this._onStreamItems(deliveryGroup);
      }
    }
    return newPending;
  }

  private _hasPendingFragment(pendingExecutionGroup: PendingExecutionGroup): boolean {
    return pendingExecutionGroup.deferredFragmentRecords.some(deferredFragmentRecord =>
      this._rootNodes.has(deferredFragmentRecord),
    );
  }

  private _addDeferredFragment(
    deferredFragmentRecord: DeferredFragmentRecord,
    deliveryGroups: Set<DeliveryGroup> | undefined,
  ): void {
    if (this._rootNodes.has(deferredFragmentRecord)) {
      return;
    }
    const parent = deferredFragmentRecord.parent;
    if (parent === undefined) {
      invariant(deliveryGroups !== undefined);
      deliveryGroups.add(deferredFragmentRecord);
      return;
    }
    parent.children.add(deferredFragmentRecord);
    this._addDeferredFragment(parent, deliveryGroups);
  }

  private _onExecutionGroup(pendingExecutionGroup: PendingExecutionGroup): void {
    const result = (pendingExecutionGroup.result as BoxedPromiseOrValue<CompletedExecutionGroup>)
      .value;
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
    if (this._rootNodes.size === 0) {
      for (const resolve of this._nextQueue) {
        resolve(undefined);
      }
    }
  }

  private _enqueue(completed: IncrementalDataRecordResult): void {
    const next = this._nextQueue.shift();
    if (next !== undefined) {
      next(this._yieldCurrentCompletedIncrementalData(completed));
      return;
    }
    this._completedQueue.push(completed);
  }
}
