import { parseValue } from 'graphql';

import { extractVariables } from '../src/extractVariables.js';

describe('can extract variables', () => {
  test('return unmodified input value if no variables present', () => {
    const str = `{ outer: [{ inner: [1, 2]}, {inner: [3, 4] }] }`;
    const inputValue = parseValue(str, { noLocation: true });
    const { inputValue: newInputValue, variablePaths } = extractVariables(inputValue);

    const expectedInputValue = parseValue(`{ outer: [{ inner: [1, 2]}, { inner: [3, 4] }] }`, { noLocation: true });

    expect(newInputValue).toEqual(expectedInputValue);
    expect(variablePaths).toEqual({});
  });

  test('return replaced input value and record with variable names and values', () => {
    const str = `{ outer: [{ inner: [$test1, 2]}, {inner: [3, $test4] }] }`;
    const inputValue = parseValue(str, { noLocation: true });
    const { inputValue: newInputValue, variablePaths } = extractVariables(inputValue);

    const expectedInputValue = parseValue(`{ outer: [{ inner: [null, 2]}, { inner: [3, null] }] }`, {
      noLocation: true,
    });

    expect(newInputValue).toEqual(expectedInputValue);
    expect(variablePaths).toEqual({
      test1: ['outer', 0, 'inner', 0],
      test4: ['outer', 1, 'inner', 1],
    });
  });
});
