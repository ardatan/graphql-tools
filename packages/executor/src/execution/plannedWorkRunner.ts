import { isPromise, type MaybePromise } from '@whatwg-node/promise-helpers';

export type PlannedWorkJob = () => void;

/**
 * Sync-first work runner for the warm planned execute path.
 *
 * One runner per root execute: LIFO job stack, pending counter for thenables,
 * drain to exhaustion before yielding. Jobs are plain closures. Prefer
 * processing a whole field-set or leaf-list in one sync loop — do not enqueue
 * one job per property-bag field.
 */
export class PlannedWorkRunner {
  private _jobs: Array<PlannedWorkJob> | undefined;
  private _pending = 0;
  private _resolve: (() => void) | undefined;
  private _reject: ((reason: unknown) => void) | undefined;
  private _settled = false;
  /** Distinguishes “no failure” from a thrown `undefined` stored in `_failure`. */
  private _failed = false;
  private _failure: unknown;
  private _onDrained: (() => void) | undefined;

  enqueue(job: PlannedWorkJob): void {
    if (this._settled) {
      return;
    }
    (this._jobs ??= []).push(job);
  }

  /**
   * Register a thenable. `onResolve` / `onReject` run before pending is
   * decremented so they may enqueue more work that drains in the same turn.
   */
  awaitValue<T>(
    promise: PromiseLike<T>,
    onResolve: (value: T) => void,
    onReject: (reason: unknown) => void,
  ): void {
    if (this._settled) {
      return;
    }
    this._pending++;
    // One completion per registration: a thenable that both fulfills and
    // rejects (or a sync throw from `.then`) must not double-decrement
    // `_pending`. Keep the guard as a plain flag — do not allocate a nested
    // `complete(() => …)` closure per item (dense async leaf lists).
    let completed = false;
    try {
      promise.then(
        value => {
          if (completed) {
            return;
          }
          completed = true;
          this._completeResolved(value, onResolve);
        },
        (reason: unknown) => {
          if (completed) {
            return;
          }
          completed = true;
          this._completeRejected(reason, onReject);
        },
      );
    } catch (error) {
      if (completed) {
        return;
      }
      completed = true;
      this._pending--;
      onReject(error);
    }
  }

  /** True when thenables are outstanding or jobs remain (and not failed). */
  get isBusy(): boolean {
    if (this._settled) {
      return false;
    }
    return this._pending > 0 || (this._jobs !== undefined && this._jobs.length > 0);
  }

  get pending(): number {
    return this._pending;
  }

  /**
   * Drain the job stack. If thenables remain, returns a Promise that settles
   * when pending returns to 0 and the stack is empty again.
   */
  runUntilSettled(): MaybePromise<void> {
    if (this._failed) {
      throw this._failure;
    }
    if (this._settled) {
      return;
    }
    this._drain();
    if (this._failed) {
      throw this._failure;
    }
    if (this._settled || this._pending === 0) {
      return;
    }
    return new Promise<void>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  /** Run `callback` once when the queue next goes idle (pending==0, no jobs). */
  runWhenDrained(callback: () => void): void {
    this._onDrained = callback;
  }

  /**
   * Stop waiting for outstanding thenables without treating them as failure.
   * Used when a leaf list has already null-bubbled: remaining item promises
   * may never settle, and the field value is already written.
   * Late completions become no-ops via the existing `_settled` guards.
   */
  forceSettle(): void {
    if (this._settled || this._failed) {
      return;
    }
    this._settled = true;
    this._jobs = undefined;
    this._onDrained = undefined;
    const resolve = this._resolve;
    this._resolve = undefined;
    this._reject = undefined;
    if (resolve !== undefined) {
      resolve();
    }
  }

  drain(): void {
    this._drain();
  }

  private _drain(): void {
    try {
      while (true) {
        const jobs = this._jobs;
        if (jobs !== undefined) {
          let job: PlannedWorkJob | undefined;
          while ((job = jobs.pop()) !== undefined) {
            job();
          }
        }
        if (this._pending > 0) {
          return;
        }
        const onDrained = this._onDrained;
        if (onDrained !== undefined) {
          this._onDrained = undefined;
          onDrained();
          continue;
        }
        if (this._resolve !== undefined) {
          this._settled = true;
          const resolve = this._resolve;
          this._resolve = undefined;
          this._reject = undefined;
          resolve();
        }
        return;
      }
    } catch (error) {
      this._fail(error);
    }
  }

  private _fail(error: unknown): void {
    // Store failure without throwing when settle has not attached reject yet.
    // Already-resolved item thenables can microtask-fail before runUntilSettled
    // returns a Promise; the next runUntilSettled observes `_failed`.
    if (this._failed) {
      return;
    }
    this._failed = true;
    this._settled = true;
    this._failure = error;
    this._jobs = undefined;
    const reject = this._reject;
    this._resolve = undefined;
    this._reject = undefined;
    if (reject !== undefined) {
      reject(error);
    }
  }

  private _completeResolved<T>(value: T, onResolve: (value: T) => void): void {
    if (this._settled) {
      this._pending--;
      return;
    }
    try {
      onResolve(value);
      this._pending--;
      this._drainIfReadyOrQueued();
    } catch (error) {
      this._pending--;
      this._fail(error);
    }
  }

  private _completeRejected(reason: unknown, onReject: (reason: unknown) => void): void {
    if (this._settled) {
      this._pending--;
      return;
    }
    try {
      onReject(reason);
      this._pending--;
      this._drainIfReadyOrQueued();
    } catch (error) {
      // Non-null field bubbles from onReject must fail the runner (same as
      // sync onResolve throws) — never escape as an unhandled rejection.
      this._pending--;
      this._fail(error);
    }
  }

  private _drainIfReadyOrQueued(): void {
    if (
      this._pending === 0 ||
      this._onDrained !== undefined ||
      (this._jobs !== undefined && this._jobs.length > 0)
    ) {
      this._drain();
    }
  }
}

/** Settle a MaybePromise through the runner when async; else no-op. */
export function awaitMaybePromise(
  runner: PlannedWorkRunner,
  value: MaybePromise<unknown>,
  onResolve: (resolved: unknown) => void,
  onReject: (reason: unknown) => void,
): void {
  if (isPromise(value)) {
    runner.awaitValue(value, onResolve, onReject);
  } else {
    onResolve(value);
  }
}
