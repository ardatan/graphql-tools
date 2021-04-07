import { parseSelectionSet } from '@graphql-tools/utils';

import { MappingInstruction } from '../src/types';

import { expandUnqualifiedKeys } from '../src/expandUnqualifiedKeys';

describe('can expand unqualified keys', () => {
  test('can convert a simple selection set', () => {
    const selectionSet = parseSelectionSet(`{ field1 field2 }`);
    const result = expandUnqualifiedKeys({ test: null }, [{
      destinationPath: ['test'],
      sourcePath: [],
    }], [selectionSet]);

    const newValue: any = {
      test: {
        field1: null,
        field2: null,
        __typename: null,
      }
    };

    const newMappingInstructions: Array<MappingInstruction> = [{
      destinationPath: ['test', 'field1'],
      sourcePath: ['field1'],
    }, {
      destinationPath: ['test', 'field2'],
      sourcePath: ['field2'],
    }, {
      destinationPath: ['test', '__typename'],
      sourcePath: ['__typename'],
    }];

    expect(result.value).toEqual(newValue);
    expect(result.mappingInstructions).toEqual(newMappingInstructions);
  });
});
