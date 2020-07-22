import { compareNodes } from '@graphql-tools/utils';

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

function normalize(str: string) {
  return str.replace(/[\s,]+/g, ' ').trim();
}

expect.extend({
  toBeSimilarString(received: string, expected: string) {
    const strippedReceived = normalize(received);
    const strippedExpected = normalize(expected);

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
        message: () =>
          `expected
       ${received}
       to be a string containing (ignoring indents)
       ${expected}`,
        pass: false,
      };
    }
  },
});
