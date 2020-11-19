import { parseSelectionSet } from '@graphql-tools/utils';

import { KeyDeclaration } from '../src/types';

import { expandUnqualifiedKeys } from '../src/expandUnqualifiedKeys';

describe('can expand unqualified keys', () => {
  test('can convert a simple selection set', () => {
    const selectionSet = parseSelectionSet(`{ field1 field2 }`);
    const result = expandUnqualifiedKeys({ test: null }, [{
      valuePath: ['test'],
      keyPath: [],
    }], [selectionSet]);

    const newValue: any = {
      test: {
        field1: null,
        field2: null,
      }
    };

    const newKeyDeclarations: Array<KeyDeclaration> = [{
      valuePath: ['test', 'field1'],
      keyPath: ['field1'],
    }, {
      valuePath: ['test', 'field2'],
      keyPath: ['field2'],
    }];

    expect(result.value).toEqual(newValue);
    expect(result.keyDeclarations).toEqual(newKeyDeclarations);
  });
});
