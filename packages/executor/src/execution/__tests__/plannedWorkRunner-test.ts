import { PlannedWorkRunner } from '../plannedWorkRunner.js';

describe('PlannedWorkRunner', () => {
  it('drains sync jobs LIFO without yielding', () => {
    const runner = new PlannedWorkRunner();
    const order: number[] = [];
    runner.enqueue(() => {
      order.push(1);
      runner.enqueue(() => order.push(3));
    });
    runner.enqueue(() => order.push(2));
    const settled = runner.runUntilSettled();
    expect(settled).toBeUndefined();
    expect(order).toEqual([2, 1, 3]);
  });

  it('awaits thenables and continues drain after resolve', async () => {
    const runner = new PlannedWorkRunner();
    const order: string[] = [];
    let resolveItem!: (value: string) => void;
    const item = new Promise<string>(resolve => {
      resolveItem = resolve;
    });

    runner.enqueue(() => {
      order.push('start');
      runner.awaitValue(
        item,
        value => {
          order.push(value);
          runner.enqueue(() => order.push('after'));
        },
        () => {
          order.push('reject');
        },
      );
    });

    const settled = runner.runUntilSettled();
    expect(settled).toBeInstanceOf(Promise);
    expect(order).toEqual(['start']);

    resolveItem('item');
    await settled;
    expect(order).toEqual(['start', 'item', 'after']);
    expect(runner.pending).toBe(0);
  });

  it('settles sync when no thenables remain', () => {
    const runner = new PlannedWorkRunner();
    runner.enqueue(() => undefined);
    expect(runner.runUntilSettled()).toBeUndefined();
  });

  it('defers thenable failure until runUntilSettled when reject is not attached yet', async () => {
    const runner = new PlannedWorkRunner();
    const boom = new Error('boom');
    runner.awaitValue(
      Promise.resolve(null),
      () => {
        throw boom;
      },
      () => undefined,
    );
    // Flush the already-resolved thenable before settle attaches reject.
    await Promise.resolve();
    expect(() => runner.runUntilSettled()).toThrow(boom);
  });

  it('forceSettle resolves waiters without waiting for remaining thenables', async () => {
    const runner = new PlannedWorkRunner();
    const never = new Promise<void>(() => undefined);
    let sawReject = false;
    runner.awaitValue(
      never,
      () => undefined,
      () => {
        sawReject = true;
      },
    );
    const settled = runner.runUntilSettled();
    expect(settled).toBeInstanceOf(Promise);
    runner.forceSettle();
    await settled;
    expect(sawReject).toBe(false);
    expect(runner.isBusy).toBe(false);
  });

  it('reports a job that throws undefined as failure', () => {
    const runner = new PlannedWorkRunner();
    runner.enqueue(() => {
      throw undefined;
    });
    expect(() => runner.runUntilSettled()).toThrow();
  });

  it('ignores a second settlement from a dual-callback thenable', async () => {
    const runner = new PlannedWorkRunner();
    const order: string[] = [];
    const dual = {
      then(onFulfilled: (v: string) => void, onRejected: (r: unknown) => void) {
        onFulfilled('ok');
        onRejected(new Error('also reject'));
      },
    };
    runner.awaitValue(
      dual as PromiseLike<string>,
      value => {
        order.push(value);
      },
      () => {
        order.push('reject');
      },
    );
    await runner.runUntilSettled();
    expect(order).toEqual(['ok']);
    expect(runner.pending).toBe(0);
  });

  it('routes a sync throw from .then through onReject and fails the runner if onReject throws', () => {
    const runner = new PlannedWorkRunner();
    const boom = new Error('then threw');
    const handled = new Error('onReject boom');
    runner.awaitValue(
      {
        then() {
          throw boom;
        },
      } as PromiseLike<unknown>,
      () => undefined,
      reason => {
        expect(reason).toBe(boom);
        throw handled;
      },
    );
    expect(() => runner.runUntilSettled()).toThrow(handled);
  });
});
