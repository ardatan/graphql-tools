import type { GraphQLError } from 'graphql';
import { addPath, pathToArray } from '@graphql-tools/utils';
import { DeferredFragmentFactory, DeliveryGroup } from './DeferredFragments.js';
import { IncrementalGraph } from './IncrementalGraph.js';
import { invariant } from './invariant.js';
import type {
  CancellableStreamRecord,
  CompletedExecutionGroup,
  CompletedResult,
  IncrementalDataRecord,
  IncrementalDataRecordResult,
  IncrementalDeferResult,
  IncrementalExecutionResults,
  IncrementalResult,
  IncrementalStreamResult,
  InitialIncrementalExecutionResult,
  PendingResult,
  StreamItemsResult,
  SubsequentIncrementalExecutionResult,
} from './types.js';
import {
  isCancellableStreamRecord,
  isCompletedExecutionGroup,
  isFailedExecutionGroup,
} from './types.js';

export function buildIncrementalResponse<TData = any>(
  context: IncrementalPublisherContext,
  result: TData,
  errors: ReadonlyArray<GraphQLError> | undefined,
  incrementalDataRecords: ReadonlyArray<IncrementalDataRecord>,
): IncrementalExecutionResults<TData> {
  const incrementalPublisher = new IncrementalPublisher(context);
  return incrementalPublisher.buildResponse(result, errors, incrementalDataRecords);
}

interface IncrementalPublisherContext {
  useIncrementalNotifications: boolean;
  signal: AbortSignal | undefined;
  deferredFragmentFactory: DeferredFragmentFactory | undefined;
  cancellableStreams: Set<CancellableStreamRecord> | undefined;
}

interface SubsequentIncrementalExecutionResultContext<TData = any> {
  pending: Array<PendingResult>;
  incremental: Array<IncrementalResult<TData>>;
  completed: Array<CompletedResult>;
}

/**
 * The IncrementalPublisherState Enum tracks the state of the IncrementalPublisher, which is initialized to
 * "Started". When there are no more incremental results to publish, the state is set to "Completed". On the
 * next call to next, clean-up is potentially performed and the state is set to "Finished".
 *
 * If the IncrementalPublisher is ended early, it may be advanced directly from "Started" to "Finished".
 */
enum IncrementalPublisherState {
  Started = 1,
  Completed = 2,
  Finished = 3,
}

/**
 * This class is used to publish incremental results to the client, enabling semi-concurrent
 * execution while preserving result order.
 *
 * @internal
 */
class IncrementalPublisher {
  private _context: IncrementalPublisherContext;
  private _nextId: number;
  private _incrementalGraph: IncrementalGraph;

  constructor(context: IncrementalPublisherContext) {
    this._context = context;
    this._nextId = 0;
    let deferredFragmentFactory = context.deferredFragmentFactory;
    if (deferredFragmentFactory === undefined) {
      context.deferredFragmentFactory = deferredFragmentFactory = new DeferredFragmentFactory();
    }
    this._incrementalGraph = new IncrementalGraph(deferredFragmentFactory);
  }

  buildResponse<TData = unknown>(
    data: TData,
    errors: ReadonlyArray<GraphQLError> | undefined,
    incrementalDataRecords: ReadonlyArray<IncrementalDataRecord>,
  ): IncrementalExecutionResults<TData> {
    const newRootNodes = this._incrementalGraph.getNewRootNodes(incrementalDataRecords);

    const initialResult: InitialIncrementalExecutionResult<TData> = this._context
      .useIncrementalNotifications
      ? errors === undefined
        ? { data, pending: this._toPendingResults(newRootNodes), hasNext: true }
        : { errors, data, pending: this._toPendingResults(newRootNodes), hasNext: true }
      : errors === undefined
        ? { data, hasNext: true }
        : { errors, data, hasNext: true };

    return {
      initialResult,
      subsequentResults: this._subscribe(),
    };
  }

  private _toPendingResults(newRootNodes: ReadonlyArray<DeliveryGroup>): Array<PendingResult> {
    const pendingResults: Array<PendingResult> = [];
    for (const node of newRootNodes) {
      const id = String(this._getNextId());
      node.id = id;
      const pendingResult: PendingResult = {
        id,
        path: pathToArray(node.path),
      };
      if (node.label !== undefined) {
        pendingResult.label = node.label;
      }
      pendingResults.push(pendingResult);
    }
    return pendingResults;
  }

  private _getNextId(): string {
    return String(this._nextId++);
  }

  private _subscribe<TData = any>(): AsyncGenerator<
    SubsequentIncrementalExecutionResult<TData>,
    void,
    void
  > {
    let incrementalPublisherState: IncrementalPublisherState = IncrementalPublisherState.Started;

    const _finish = async (): Promise<void> => {
      incrementalPublisherState = IncrementalPublisherState.Finished;
      this._incrementalGraph.abort();
      await this._returnAsyncIterators();
    };

    this._context.signal?.addEventListener('abort', () => {
      this._incrementalGraph.abort();
    });

    const _next = async (): Promise<
      IteratorResult<SubsequentIncrementalExecutionResult<TData>, void>
    > => {
      switch (incrementalPublisherState) {
        case IncrementalPublisherState.Finished: {
          return { value: undefined, done: true };
        }
        case IncrementalPublisherState.Completed: {
          await _finish();
          return { value: undefined, done: true };
        }
        case IncrementalPublisherState.Started: {
          // continue
        }
      }

      const context: SubsequentIncrementalExecutionResultContext<TData> = {
        pending: [],
        incremental: [],
        completed: [],
      };

      let batch: Iterable<IncrementalDataRecordResult> | undefined =
        this._incrementalGraph.currentCompletedBatch();
      do {
        for (const completedResult of batch) {
          this._handleCompletedIncrementalData(completedResult, context);
        }

        const { incremental, completed } = context;
        if (incremental.length > 0 || completed.length > 0) {
          const hasNext = this._incrementalGraph.hasNext();

          if (!hasNext) {
            incrementalPublisherState = IncrementalPublisherState.Completed;
          }

          const subsequentIncrementalExecutionResult: SubsequentIncrementalExecutionResult<TData> =
            {
              hasNext,
            };

          const pending = context.pending;
          if (pending.length > 0) {
            subsequentIncrementalExecutionResult.pending = pending;
          }
          if (incremental.length > 0) {
            subsequentIncrementalExecutionResult.incremental = incremental;
          }
          if (completed.length > 0) {
            subsequentIncrementalExecutionResult.completed = completed;
          }

          return { value: subsequentIncrementalExecutionResult, done: false };
        }

        batch = await this._incrementalGraph.nextCompletedBatch();
      } while (batch !== undefined);

      if (this._context.signal?.aborted) {
        throw this._context.signal.reason;
      }

      return { value: undefined, done: true };
    };

    const _return = async (): Promise<
      IteratorResult<SubsequentIncrementalExecutionResult<TData>, void>
    > => {
      await _finish();
      return { value: undefined, done: true };
    };

    const _throw = async (
      error?: unknown,
    ): Promise<IteratorResult<SubsequentIncrementalExecutionResult<TData>, void>> => {
      await _finish();
      return Promise.reject(error);
    };

    return {
      [Symbol.asyncIterator]() {
        return this;
      },
      next: _next,
      return: _return,
      throw: _throw,
    };
  }

  private _handleCompletedIncrementalData(
    completedIncrementalData: IncrementalDataRecordResult,
    context: SubsequentIncrementalExecutionResultContext,
  ): void {
    if (isCompletedExecutionGroup(completedIncrementalData)) {
      this._handleCompletedExecutionGroup(completedIncrementalData, context);
    } else {
      this._handleCompletedStreamItems(completedIncrementalData, context);
    }
  }

  private _handleCompletedExecutionGroup(
    completedExecutionGroup: CompletedExecutionGroup,
    context: SubsequentIncrementalExecutionResultContext,
  ): void {
    const { deferUsages, path } = completedExecutionGroup.pendingExecutionGroup;
    if (isFailedExecutionGroup(completedExecutionGroup)) {
      for (const deferUsage of deferUsages) {
        const deferredFragmentRecord = this._incrementalGraph.removeDeferredFragment(
          deferUsage,
          path,
        );
        if (deferredFragmentRecord === undefined) {
          // This can occur if multiple deferred grouped field sets error for a fragment.
          continue;
        }
        if (this._context.useIncrementalNotifications) {
          const id = deferredFragmentRecord.id;
          invariant(id !== undefined);
          context.completed.push({
            id,
            errors: completedExecutionGroup.errors,
          });
        } else {
          const incrementalEntry: IncrementalDeferResult = {
            errors: completedExecutionGroup.errors,
            data: null,
          };
          const { path, label } = deferredFragmentRecord;
          incrementalEntry.path = pathToArray(path);
          if (label !== undefined) {
            incrementalEntry.label = label;
          }
          context.incremental.push(incrementalEntry);
        }
      }
      return;
    }

    this._incrementalGraph.addCompletedSuccessfulExecutionGroup(completedExecutionGroup);

    for (const deferUsage of deferUsages) {
      const completion = this._incrementalGraph.completeDeferredFragment(deferUsage, path);
      if (completion === undefined) {
        continue;
      }
      const incremental = context.incremental;
      const { deferredFragmentRecord, newRootNodes, successfulExecutionGroups } = completion;
      if (this._context.useIncrementalNotifications) {
        context.pending.push(...this._toPendingResults(newRootNodes));
        for (const successfulExecutionGroup of successfulExecutionGroups) {
          const { deferUsages: resultDeferUsages, path: resultPath } =
            successfulExecutionGroup.pendingExecutionGroup;
          const bestDeferredFragmentRecord =
            this._incrementalGraph.getDeepestDeferredFragmentAtRoot(
              deferUsage,
              resultDeferUsages,
              resultPath,
            );
          const bestId = bestDeferredFragmentRecord.id;
          invariant(bestId !== undefined);
          const incrementalEntry: IncrementalDeferResult = {
            ...successfulExecutionGroup.result,
            id: bestId,
          };
          const subPath = pathToArray(resultPath).slice(
            pathToArray(bestDeferredFragmentRecord.path).length,
          );
          if (subPath.length > 0) {
            incrementalEntry.subPath = subPath;
          }
          incremental.push(incrementalEntry);
        }
        const id = deferredFragmentRecord.id;
        invariant(id !== undefined);
        context.completed.push({ id });
      } else {
        for (const successfulExecutionGroup of successfulExecutionGroups) {
          const incrementalEntry: IncrementalDeferResult = {
            ...successfulExecutionGroup.result,
          };
          const { path, label } = deferredFragmentRecord;
          incrementalEntry.path = pathToArray(path);
          if (label !== undefined) {
            incrementalEntry.label = label;
          }
          incremental.push(incrementalEntry);
        }
      }
    }
  }

  private _handleCompletedStreamItems(
    streamItemsResult: StreamItemsResult,
    context: SubsequentIncrementalExecutionResultContext,
  ): void {
    const streamRecord = streamItemsResult.streamRecord;
    if (streamItemsResult.errors !== undefined) {
      if (this._context.useIncrementalNotifications) {
        const id = streamRecord.id;
        invariant(id !== undefined);
        context.completed.push({
          id,
          errors: streamItemsResult.errors,
        });
      } else {
        const incrementalEntry: IncrementalStreamResult = {
          errors: streamItemsResult.errors,
          items: null,
        };
        const { path, label, index } = streamRecord;
        incrementalEntry.path = pathToArray(addPath(path, index, undefined));
        if (label !== undefined) {
          incrementalEntry.label = label;
        }
        context.incremental.push(incrementalEntry);
      }
      this._incrementalGraph.removeStream(streamRecord);
      if (isCancellableStreamRecord(streamRecord)) {
        invariant(this._context.cancellableStreams !== undefined);
        this._context.cancellableStreams.delete(streamRecord);
        streamRecord.earlyReturn().catch(() => {
          /* c8 ignore next 1 */
          // ignore error
        });
      }
    } else if (streamItemsResult.result === undefined) {
      if (this._context.useIncrementalNotifications) {
        const id = streamRecord.id;
        invariant(id !== undefined);
        context.completed.push({ id });
      }
      this._incrementalGraph.removeStream(streamRecord);
      if (isCancellableStreamRecord(streamRecord)) {
        invariant(this._context.cancellableStreams !== undefined);
        this._context.cancellableStreams.delete(streamRecord);
      }
    } else {
      const bareResult = streamItemsResult.result;
      const incrementalEntry: IncrementalStreamResult = {
        ...bareResult,
      };
      if (this._context.useIncrementalNotifications) {
        const id = streamRecord.id;
        invariant(id !== undefined);
        incrementalEntry.id = id;
      } else {
        const { path, label, index } = streamRecord;
        incrementalEntry.path = pathToArray(addPath(path, index, undefined));
        streamRecord.index += bareResult.items.length;
        if (label !== undefined) {
          incrementalEntry.label = label;
        }
      }
      context.incremental.push(incrementalEntry);

      const incrementalDataRecords = streamItemsResult.incrementalDataRecords;
      if (incrementalDataRecords !== undefined) {
        const newPending = this._incrementalGraph.getNewRootNodes(incrementalDataRecords);
        if (this._context.useIncrementalNotifications) {
          context.pending.push(...this._toPendingResults(newPending));
        }
      }
    }
  }

  private async _returnAsyncIterators(): Promise<void> {
    await this._incrementalGraph.abort();

    const cancellableStreams = this._context.cancellableStreams;
    if (cancellableStreams === undefined) {
      return;
    }
    const promises: Array<Promise<unknown>> = [];
    for (const streamRecord of cancellableStreams) {
      if (streamRecord.earlyReturn !== undefined) {
        promises.push(streamRecord.earlyReturn());
      }
    }
    await Promise.all(promises);
  }
}
