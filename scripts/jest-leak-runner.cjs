const JestRunner = require('jest-runner').default;

/**
 * Babel 8 is ESM-only; the first Jest isolate under `--detectLeaks` is retained
 * even when the suite itself does not leak. Clear that false positive for the
 * disposable warmup suite so later suites are still checked for real leaks.
 *
 * Also ignore suites that executed no tests (e.g. only `it.skip`): loading a
 * module into a fresh isolate can still trip detectLeaks without any app code
 * running.
 *
 * Emittery delivers a single `[test, testResult]` payload for `test-file-success`
 * (same shape `@jest/core` destructures). Defend against positional args too.
 *
 * Ported from ardatan/whatwg-node (scripts/jest-leak-runner.cjs).
 */
class LeakTestRunner extends JestRunner {
  on(eventName, listener) {
    if (eventName !== 'test-file-success') {
      return super.on(eventName, listener);
    }
    return super.on(eventName, (...args) => {
      const event = args[0];
      const test = Array.isArray(event) ? event[0] : args[0];
      const testResult = Array.isArray(event) ? event[1] : args[1];
      if (testResult && typeof test?.path === 'string') {
        const noExecutedTests =
          (testResult.numPassingTests ?? 0) === 0 && (testResult.numFailingTests ?? 0) === 0;
        if (test.path.endsWith('leak-warmup.spec.ts') || noExecutedTests) {
          testResult.leaks = false;
        }
      }
      return listener(...args);
    });
  }
}

module.exports = LeakTestRunner;
