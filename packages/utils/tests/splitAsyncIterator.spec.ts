import { splitAsyncIterator } from '../src/splitAsyncIterator';

describe('splitAsyncIterator', () => {
  test('it works sequentially', async () => {
    const gen3 = async function* () {
      for (let i = 0; i < 3; i++) {
        yield i;
      }
    }();

    const [one, two] = splitAsyncIterator(gen3, 2, (x) => [0, x + 5]);

    let results = [];
    for await (const result of one) {
      results.push(result);
    }
    expect(results).toEqual([5, 6, 7]);

    results = [];
    for await (const result of two) {
      results.push(result);
    }
    expect(results).toEqual([]);
  });

  test('it works in parallel', async () => {
    const gen3 = async function* () {
      for (let i = 0; i < 3; i++) {
        yield i;
      }
    }();

    const [one, two] = splitAsyncIterator(gen3, 2, (x) => [0, x + 5]);

    const oneResults = [];
    const twoResults = [];
    for (let i = 0; i < 3; i++) {
      const results = await Promise.all([one.next(), two.next()]);
      oneResults.push(results[0].value);
      twoResults.push(results[1].value);
    }

    expect(oneResults).toEqual([5, 6, 7]);
    expect(twoResults).toEqual([undefined, undefined, undefined]);
  });
});
