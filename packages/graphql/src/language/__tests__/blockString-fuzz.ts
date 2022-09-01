import { genFuzzStrings } from '../../__testUtils__/genFuzzStrings.js';

import { isPrintableAsBlockString, printBlockString } from '../blockString.js';
import { Lexer } from '../lexer.js';
import { Source } from '../source.js';

function lexValue(str: string): string {
  const lexer = new Lexer(new Source(str));
  const value = lexer.advance().value;

  expect(typeof value === 'string').toBeTruthy();
  expect(lexer.advance().kind === '<EOF>').toBeTruthy();
  return value;
}

function testPrintableBlockString(testValue: string, options?: { minimize: boolean }): void {
  const blockString = printBlockString(testValue, options);
  const printedValue = lexValue(blockString);
  expect(testValue === printedValue).toBeTruthy();
}

function testNonPrintableBlockString(testValue: string): void {
  const blockString = printBlockString(testValue);
  const printedValue = lexValue(blockString);
  expect(testValue !== printedValue).toBeTruthy();
}

describe('printBlockString', () => {
  it('correctly print random strings', () => {
    // Testing with length >7 is taking exponentially more time. However it is
    // highly recommended to test with increased limit if you make any change.
    for (const fuzzStr of genFuzzStrings({
      allowedChars: ['\n', '\t', ' ', '"', 'a', '\\'],
      maxLength: 7,
    })) {
      if (!isPrintableAsBlockString(fuzzStr)) {
        testNonPrintableBlockString(fuzzStr);
        continue;
      }

      testPrintableBlockString(fuzzStr);
      testPrintableBlockString(fuzzStr, { minimize: true });
    }
  });
});
