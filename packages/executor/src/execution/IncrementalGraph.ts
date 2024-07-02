import type { GraphQLError } from 'graphql';
import { createDeferred, isPromise, Path } from '@graphql-tools/utils';
import { BoxedPromiseOrValue } from './BoxedPromiseOrValue.js';
import { DeferUsage } from './collectFields.js';
import type { DeferredFragmentRecord, DeliveryGroup } from './DeferredFragments.js';
import { DeferredFragmentFactory, isDeferredFragmentRecord } from './DeferredFragments.js';
import { invariant } from './invariant.js';
import type {
  CompletedExecutionGroup,
  IncrementalDataRecord,
  IncrementalDataRecordResult,
  PendingExecutionGroup,
  StreamItemRecord,
  StreamRecord,
  SuccessfulExecutionGroup,
} from './types.js';
import { isPendingExecutionGroup } from './types.js';

/**
 * @internal
 */
export class IncrementalGraph {
  private _rootNodes: Set<DeliveryGroup>;
  private _deferredFragmentFactory: DeferredFragmentFactory;
  private _completedQueue: Array<IncrementalDataRecordResult>;
  private _nextQueue: Array<(iterable: Iterable<IncrementalDataRecordResult> | undefined) => void>;

  constructor(deferredFragmentFactory: DeferredFragmentFactory) {
    this._rootNodes = new Set();
    this._deferredFragmentFactory = deferredFragmentFactory;
    this._completedQueue = [];
    this._nextQueue = [];
  }

  getNewRootNodes(
    incrementalDataRecords: ReadonlyArray<IncrementalDataRecord>,
  ): ReadonlyArray<DeliveryGroup> {
    const initialResultChildren = new Set<DeliveryGroup>();
    this._addIncrementalDataRecords(incrementalDataRecords, undefined, initialResultChildren);
    return this._promoteNonEmptyToRoot(initialResultChildren);
  }

  addCompletedSuccessfulExecutionGroup(successfulExecutionGroup: SuccessfulExecutionGroup): void {
    const { pendingExecutionGroup, incrementalDataRecords } = successfulExecutionGroup;
    const { deferUsages, path } = pendingExecutionGroup;

    const deferredFragmentRecords: Array<DeferredFragmentRecord> = [];
    for (const deferUsage of deferUsages) {
      const deferredFragmentRecord = this._deferredFragmentFactory.get(deferUsage, path);
      deferredFragmentRecords.push(deferredFragmentRecord);
      const { pendingExecutionGroups, successfulExecutionGroups } = deferredFragmentRecord;
      pendingExecutionGroups.delete(pendingExecutionGroup);
      successfulExecutionGroups.add(successfulExecutionGroup);
    }

    if (incrementalDataRecords !== undefined) {
      this._addIncrementalDataRecords(incrementalDataRecords, deferredFragmentRecords);
    }
  }

  getDeepestDeferredFragmentAtRoot(
    initialDeferUsage: DeferUsage,
    deferUsages: ReadonlySet<DeferUsage>,
    path: Path | undefined,
  ): DeferredFragmentRecord {
    let bestDeferUsage = initialDeferUsage;
    let maxDepth = initialDeferUsage.depth;
    for (const deferUsage of deferUsages) {
      if (deferUsage === initialDeferUsage) {
        continue;
      }
      const depth = deferUsage.depth;
      if (depth > maxDepth) {
        maxDepth = depth;
        bestDeferUsage = deferUsage;
      }
    }
    return this._deferredFragmentFactory.get(bestDeferUsage, path);
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

  completeDeferredFragment(
    deferUsage: DeferUsage,
    path: Path | undefined,
  ):
    | {
        deferredFragmentRecord: DeferredFragmentRecord;
        newRootNodes: ReadonlyArray<DeliveryGroup>;
        successfulExecutionGroups: ReadonlyArray<SuccessfulExecutionGroup>;
      }
    | undefined {
    const deferredFragmentRecord = this._deferredFragmentFactory.get(deferUsage, path);
    if (
      !this._rootNodes.has(deferredFragmentRecord) ||
      deferredFragmentRecord.pendingExecutionGroups.size > 0
    ) {
      return;
    }
    const successfulExecutionGroups = Array.from(deferredFragmentRecord.successfulExecutionGroups);
    this._rootNodes.delete(deferredFragmentRecord);
    for (const successfulExecutionGroup of successfulExecutionGroups) {
      const { deferUsages, path: resultPath } = successfulExecutionGroup.pendingExecutionGroup;
      for (const otherDeferUsage of deferUsages) {
        const otherDeferredFragmentRecord = this._deferredFragmentFactory.get(
          otherDeferUsage,
          resultPath,
        );
        otherDeferredFragmentRecord.successfulExecutionGroups.delete(successfulExecutionGroup);
      }
    }
    const newRootNodes = this._promoteNonEmptyToRoot(deferredFragmentRecord.children);
    return { deferredFragmentRecord, newRootNodes, successfulExecutionGroups };
  }

  removeDeferredFragment(
    deferUsage: DeferUsage,
    path: Path | undefined,
  ): DeferredFragmentRecord | undefined {
    const deferredFragmentRecord = this._deferredFragmentFactory.get(deferUsage, path);
    if (!this._rootNodes.has(deferredFragmentRecord)) {
      return;
    }
    this._rootNodes.delete(deferredFragmentRecord);
    return deferredFragmentRecord;
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
        const { deferUsages, path } = incrementalDataRecord;
        for (const deferUsage of deferUsages) {
          const deferredFragmentRecord = this._deferredFragmentFactory.get(deferUsage, path);
          this._addDeferredFragment(deferredFragmentRecord, initialResultChildren);
          deferredFragmentRecord.pendingExecutionGroups.add(incrementalDataRecord);
        }
        if (this._completesRootNode(incrementalDataRecord)) {
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
    maybeEmptyNewRootNodes: Set<DeliveryGroup>,
  ): ReadonlyArray<DeliveryGroup> {
    const newRootNodes: Array<DeliveryGroup> = [];
    for (const node of maybeEmptyNewRootNodes) {
      if (isDeferredFragmentRecord(node)) {
        if (node.pendingExecutionGroups.size > 0) {
          node.setAsPending();
          for (const pendingExecutionGroup of node.pendingExecutionGroups) {
            if (!this._completesRootNode(pendingExecutionGroup)) {
              this._onExecutionGroup(pendingExecutionGroup);
            }
          }
          this._rootNodes.add(node);
          newRootNodes.push(node);
          continue;
        }
        for (const child of node.children) {
          maybeEmptyNewRootNodes.add(child);
        }
      } else {
        this._rootNodes.add(node);
        newRootNodes.push(node);

        this._onStreamItems(node);
      }
    }
    return newRootNodes;
  }

  private _completesRootNode(pendingExecutionGroup: PendingExecutionGroup): boolean {
    const { deferUsages, path } = pendingExecutionGroup;
    for (const deferUsage of deferUsages) {
      const deferredFragmentRecord = this._deferredFragmentFactory.get(deferUsage, path);
      if (this._rootNodes.has(deferredFragmentRecord)) {
        return true;
      }
    }
    return false;
  }

  private _addDeferredFragment(
    deferredFragmentRecord: DeferredFragmentRecord,
    initialResultChildren: Set<DeliveryGroup> | undefined,
  ): void {
    if (this._rootNodes.has(deferredFragmentRecord)) {
      return;
    }
    const parentDeferUsage = deferredFragmentRecord.parentDeferUsage;
    if (parentDeferUsage === undefined) {
      invariant(initialResultChildren !== undefined);
      initialResultChildren.add(deferredFragmentRecord);
      return;
    }
    const parent = this._deferredFragmentFactory.get(parentDeferUsage, deferredFragmentRecord.path);
    parent.children.add(deferredFragmentRecord);
    this._addDeferredFragment(parent, initialResultChildren);
  }

  private _onExecutionGroup(pendingExecutionGroup: PendingExecutionGroup): void {
    const value = (pendingExecutionGroup.result as BoxedPromiseOrValue<CompletedExecutionGroup>)
      .value;
    if (isPromise(value)) {
      value.then(resolved => this._enqueue(resolved));
    } else {
      this._enqueue(value);
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

  private _enqueue(completed: IncrementalDataRecordResult): void {
    this._completedQueue.push(completed);
    const next = this._nextQueue.shift();
    if (next === undefined) {
      return;
    }
    next(this.currentCompletedBatch());
  }
}
