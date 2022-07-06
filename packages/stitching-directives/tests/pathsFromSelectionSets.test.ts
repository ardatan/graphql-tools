import { parseSelectionSet } from '@graphql-tools/utils';

import { pathsFromSelectionSet } from '../src/pathsFromSelectionSet.js';

describe('can convert selectionSet hints to paths', () => {
  test('can convert a simple selection set', () => {
    const selectionSet = parseSelectionSet(`{ test }`);
    const result = pathsFromSelectionSet(selectionSet);
    expect(result).toEqual([['test']]);
  });

  test('can convert a complex selection set', () => {
    const selectionSet = parseSelectionSet(`{ field1 field2 { subFieldA subFieldB } }`);
    const result = pathsFromSelectionSet(selectionSet);
    expect(result).toEqual([['field1'], ['field2', 'subFieldA'], ['field2', 'subFieldB']]);
  });
});
