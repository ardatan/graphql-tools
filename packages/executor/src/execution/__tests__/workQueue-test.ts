import { promiseForObjectQueued } from '../promiseForObject.js';
import { WorkQueue } from '../workQueue.js';

describe('WorkQueue', () => {
  it('drains enqueued jobs on a microtask', async () => {
    const queue = new WorkQueue();
    const order: number[] = [];
    queue.enqueue(() => order.push(1));
    queue.enqueue(() => order.push(2));
    expect(order).toEqual([]);
    await Promise.resolve();
    expect(order).toEqual([1, 2]);
  });

  it('settles multi-promise objects via the queue', async () => {
    const result = await promiseForObjectQueued({
      a: Promise.resolve(1),
      b: Promise.resolve(2),
      c: 3,
    });
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });
});
