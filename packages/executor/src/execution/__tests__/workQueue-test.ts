import { promiseForObject, promiseForObjectQueued } from '../promiseForObject.js';
import { WorkQueue } from '../workQueue.js';

describe('WorkQueue', () => {
  it('flushes enqueued jobs synchronously', () => {
    const queue = new WorkQueue();
    const order: number[] = [];
    queue.enqueue(() => order.push(1));
    queue.enqueue(() => order.push(2));
    expect(order).toEqual([]);
    queue.flush();
    expect(order).toEqual([1, 2]);
  });

  it('scheduleFlush coalesces one microtask drain', async () => {
    const queue = new WorkQueue();
    const order: number[] = [];
    queue.enqueue(() => order.push(1));
    queue.enqueue(() => order.push(2));
    queue.scheduleFlush();
    queue.scheduleFlush();
    expect(order).toEqual([]);
    await Promise.resolve();
    expect(order).toEqual([1, 2]);
  });

  it('drains jobs enqueued during flush before returning', () => {
    const queue = new WorkQueue();
    const order: number[] = [];
    queue.enqueue(() => {
      order.push(1);
      queue.enqueue(() => order.push(2));
    });
    queue.flush();
    expect(order).toEqual([1, 2]);
  });

  it('settles multi-promise objects with the same result as promiseForObject', async () => {
    const input = {
      a: Promise.resolve(1),
      b: Promise.resolve(2),
      c: 3,
    };
    const queued = await promiseForObjectQueued(input);
    const classic = await promiseForObject(input);
    expect(queued).toEqual({ a: 1, b: 2, c: 3 });
    expect(queued).toEqual(classic);
  });

  it('flushes a provided WorkQueue before settling', async () => {
    const queue = new WorkQueue();
    let ran = false;
    queue.enqueue(() => {
      ran = true;
    });
    await promiseForObjectQueued({ a: Promise.resolve(1) }, undefined, undefined, queue);
    expect(ran).toBe(true);
  });
});
