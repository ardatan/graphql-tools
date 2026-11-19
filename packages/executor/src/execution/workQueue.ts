/**
 * Tiny microtask work queue for planned async field settlement.
 *
 * Tools-native stand-in for a CompiledExecutor-style scheduler: batch
 * then-callbacks onto one drain instead of relying solely on Promise.all
 * microtask fan-out. Sync executeFields stays synchronous — only promise
 * settlement is queued.
 */

export class WorkQueue {
  #jobs: Array<() => void> = [];
  #scheduled = false;

  enqueue(job: () => void): void {
    this.#jobs.push(job);
    if (!this.#scheduled) {
      this.#scheduled = true;
      queueMicrotask(() => this.#drain());
    }
  }

  get pending(): number {
    return this.#jobs.length;
  }

  #drain(): void {
    this.#scheduled = false;
    const jobs = this.#jobs;
    this.#jobs = [];
    for (let i = 0; i < jobs.length; i++) {
      jobs[i]();
    }
    if (this.#jobs.length > 0 && !this.#scheduled) {
      this.#scheduled = true;
      queueMicrotask(() => this.#drain());
    }
  }
}
