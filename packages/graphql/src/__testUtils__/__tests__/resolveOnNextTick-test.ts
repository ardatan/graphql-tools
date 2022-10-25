import { resolveOnNextTick } from '../resolveOnNextTick.js';

describe('resolveOnNextTick', () => {
  it('resolves promise on the next tick', async () => {
    const output = [];

    const promise1 = resolveOnNextTick().then(() => {
      output.push('second');
    });
    const promise2 = resolveOnNextTick().then(() => {
      output.push('third');
    });
    output.push('first');

    await Promise.all([promise1, promise2]);
    expect(output).toEqual(['first', 'second', 'third']);
  });
});
