import { parseSelectionSet } from '@graphql-tools/utils';

import { pathsFromSelectionSets } from '../src/pathsFromSelectionSets';

describe('can convert selectionSet hints to paths', () => {
  test('can convert a simple selection set', () => {
    const selectionSet = parseSelectionSet(`{ test }`);
    const result = pathsFromSelectionSets([selectionSet]);
    expect(result).toEqual([['test']]);
  });

  test('can convert a complex selection set', () => {
    const selectionSet = parseSelectionSet(`{ field1 field2 { subFieldA subFieldB } }`);
    const result = pathsFromSelectionSets([selectionSet]);
    expect(result).toEqual([['field1'], ['field2', 'subFieldA'], ['field2', 'subFieldB']]);
  });

  test('can convert multiple selection sets', () => {
    const selectionSet1 = parseSelectionSet(`{ field1 }`);
    const selectionSet2 = parseSelectionSet(`{ field2 }`);
    const result = pathsFromSelectionSets([selectionSet1, selectionSet2]);
    expect(result).toEqual([['field1'], ['field2']]);
  });
});
