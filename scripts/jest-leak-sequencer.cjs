const Sequencer = require('@jest/test-sequencer').default;

/**
 * Run the disposable warmup suite first so Babel 8's first-isolate retention
 * (Jest --detectLeaks false positive) does not fail a real package test.
 *
 * Ported from ardatan/whatwg-node (scripts/jest-leak-sequencer.cjs).
 */
class LeakTestSequencer extends Sequencer {
  sort(tests) {
    const warmup = [];
    const rest = [];
    for (const test of tests) {
      if (test.path.endsWith('leak-warmup.spec.ts')) {
        warmup.push(test);
      } else {
        rest.push(test);
      }
    }
    return [...warmup, ...super.sort(rest)];
  }
}

module.exports = LeakTestSequencer;
