import { diff } from 'jest-diff';
import { expect } from '@jest/globals';
import { normalizeString } from './utils.js';

declare global {
  namespace jest {
    interface Matchers<R, T> {
      /**
       * Normalizes whitespace and performs string comparisons
       */
      toBeSimilarString(expected: string): R;
    }
  }
}

expect.extend({
  toBeSimilarString(received: string, expected: string) {
    const strippedReceived = normalizeString(received);
    const strippedExpected = normalizeString(expected);

    if (strippedReceived.trim() === strippedExpected.trim()) {
      return {
        message: () =>
          `expected
       ${received}
       not to be a string containing (ignoring indents)
       ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => diff(expected, received) || '',
        pass: false,
      };
    }
  },
});
