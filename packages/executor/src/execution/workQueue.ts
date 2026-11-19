/**
 * Sync-first microtask work queue for planned execution.
 *
 * Jobs pushed while idle are drained immediately on `flush()` (same stack as a
 * for-loop). `scheduleFlush()` coalesces a single microtask when work arrives
 * from promise callbacks across a turn — without scheduling a drain per job.
 *
 * The earlier settle path that `queueMicrotask`'d every write lost to
 * `Promise.all` on dense async-object benches; this queue must not insert an
 * extra hop on the hot settle path.
 */

export class WorkQueue {
  #jobs: Array<() => void> = [];
  #draining = false;
  #scheduled = false;

  enqueue(job: () => void): void {
    this.#jobs.push(job);
  }

  get pending(): number {
    return this.#jobs.length;
  }

  get isDraining(): boolean {
    return this.#draining;
  }

  /**
   * Drain all pending jobs now. Re-entrant enqueues during a job are drained
   * before returning (same as a recursive sync scheduler).
   */
  flush(): void {
    if (this.#draining) {
      return;
    }
    this.#draining = true;
    try {
      while (this.#jobs.length > 0) {
        const job = this.#jobs.shift()!;
        job();
      }
    } finally {
      this.#draining = false;
    }
  }

  /**
   * Coalesce at most one microtask drain. Safe when jobs are enqueued from
   * many promise callbacks in the same turn — one drain, not N.
   */
  scheduleFlush(): void {
    if (this.#scheduled || this.#draining || this.#jobs.length === 0) {
      return;
    }
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      this.flush();
    });
  }
}
