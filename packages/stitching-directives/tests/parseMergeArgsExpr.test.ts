import { parseSelectionSet } from '@graphql-tools/utils';

import { parseMergeArgsExpr } from '../src/parseMergeArgsExpr.js';

describe('can parse merge arguments', () => {
  test('throws if no key declared', () => {
    expect(() => parseMergeArgsExpr(`test: "test"`)).toThrowError('Merge arguments must declare a key.');
  });

  test('throws if expansions are mixed with key declarations', () => {
    expect(() => parseMergeArgsExpr(`expansion: [[$key]], single: $key`)).toThrowError(
      'Expansions cannot be mixed with single key declarations.'
    );
    expect(() => parseMergeArgsExpr(`expansion: [[$key.test]], single: $key.test`)).toThrowError(
      'Expansions cannot be mixed with single key declarations.'
    );
  });

  test('can parseMergeArgsExpr with key', () => {
    const args = `test: $key.test`;
    const result = parseMergeArgsExpr(args);
    expect(result).toEqual({
      args: { test: null },
      usedProperties: { test: null },
      mappingInstructions: [{ destinationPath: ['test'], sourcePath: ['test'] }],
    });
  });

  test('can parseMergeArgsExpr with nested key', () => {
    const args = `outer: { inner: $key.test }`;
    const result = parseMergeArgsExpr(args);
    expect(result).toEqual({
      args: { outer: { inner: null } },
      usedProperties: { test: null },
      mappingInstructions: [{ destinationPath: ['outer', 'inner'], sourcePath: ['test'] }],
    });
  });

  test('can parseMergeArgsExpr with complex key', () => {
    const args = `test: $key.outer.inner`;
    const result = parseMergeArgsExpr(args);
    expect(result).toEqual({
      args: { test: null },
      usedProperties: { outer: { inner: null } },
      mappingInstructions: [{ destinationPath: ['test'], sourcePath: ['outer', 'inner'] }],
    });
  });

  test('can parseMergeArgsExpr with key defined by selectionSet', () => {
    const selectionSet = parseSelectionSet(`{ field1 field2 { subFieldA subFieldB } }`);
    const args = `test: $key`;
    const result = parseMergeArgsExpr(args, selectionSet);
    expect(result).toEqual({
      args: { test: null },
      usedProperties: {
        field1: null,
        field2: {
          subFieldA: null,
          subFieldB: null,
        },
        __typename: null,
      },
      mappingInstructions: [{ destinationPath: ['test'], sourcePath: [] }],
    });
  });

  test('can parseMergeArgsExpr with expansion', () => {
    const args = `test: [[$key.test]]`;
    const result = parseMergeArgsExpr(args);
    expect(result).toEqual({
      args: { test: null },
      usedProperties: { test: null },
      expansions: [
        {
          valuePath: ['test'],
          value: null,
          mappingInstructions: [{ destinationPath: [], sourcePath: ['test'] }],
        },
      ],
    });
  });

  test('can parseMergeArgsExpr with nested expansion', () => {
    const args = `outer: { inner: [[$key.test]] }`;
    const result = parseMergeArgsExpr(args);
    expect(result).toEqual({
      args: { outer: { inner: null } },
      usedProperties: { test: null },
      expansions: [
        {
          valuePath: ['outer', 'inner'],
          value: null,
          mappingInstructions: [{ destinationPath: [], sourcePath: ['test'] }],
        },
      ],
    });
  });

  test('can parseMergeArgsExpr with expansion with nested key', () => {
    const args = `outer: [[{ inner: $key.test }]]`;
    const result = parseMergeArgsExpr(args);
    expect(result).toEqual({
      args: { outer: null },
      usedProperties: { test: null },
      expansions: [
        {
          valuePath: ['outer'],
          value: { inner: null },
          mappingInstructions: [{ destinationPath: ['inner'], sourcePath: ['test'] }],
        },
      ],
    });
  });

  test('can parseMergeArgsExpr with expansion with complex key', () => {
    const args = `test: [[$key.outer.inner]]`;
    const result = parseMergeArgsExpr(args);
    expect(result).toEqual({
      args: { test: null },
      usedProperties: { outer: { inner: null } },
      expansions: [
        {
          valuePath: ['test'],
          value: null,
          mappingInstructions: [{ destinationPath: [], sourcePath: ['outer', 'inner'] }],
        },
      ],
    });
  });

  test('can parseMergeArgsExpr with expansion with complex key defined by selectionSet', () => {
    const selectionSet = parseSelectionSet(`{ field1 field2 { subFieldA subFieldB } }`);
    const args = `test: [[$key]]`;
    const result = parseMergeArgsExpr(args, selectionSet);
    expect(result).toEqual({
      args: { test: null },
      usedProperties: {
        field1: null,
        field2: {
          subFieldA: null,
          subFieldB: null,
        },
        __typename: null,
      },
      expansions: [
        {
          valuePath: ['test'],
          value: null,
          mappingInstructions: [{ destinationPath: [], sourcePath: [] }],
        },
      ],
    });
  });
});
