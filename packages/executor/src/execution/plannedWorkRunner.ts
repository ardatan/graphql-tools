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
    try {
      promise.then(
        value => this._completeResolved(value, onResolve),
        (reason: unknown) => this._completeRejected(reason, onReject),
      );
    } catch (error) {
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
    if (this._failure !== undefined) {
      throw this._failure;
    }
    this._drain();
    if (this._failure !== undefined) {
      throw this._failure;
    }
    if (this._pending === 0) {
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
    this._settled = true;
    this._failure = error;
    this._jobs = undefined;
    const reject = this._reject;
    this._resolve = undefined;
    this._reject = undefined;
    if (reject !== undefined) {
      reject(error);
      return;
    }
    throw error;
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
