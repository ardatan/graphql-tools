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
});
