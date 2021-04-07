import { parseSelectionSet } from '@graphql-tools/utils';

import { parseMergeArgsExpr } from '../src/parseMergeArgsExpr';

describe('can parse merge arguments', () => {
  test('throws if no key declared', () => {
    expect(() => parseMergeArgsExpr(`test: "test"`)).toThrowError('Merge arguments must declare a key.');
  });

  test('throws if expansions are mixed with key declarations', () => {
    expect(() => parseMergeArgsExpr(`expansion: [[$key]], single: $key`)).toThrowError('Expansions cannot be mixed with single key declarations.');
    expect(() => parseMergeArgsExpr(`expansion: [[$key.test]], single: $key.test`)).toThrowError('Expansions cannot be mixed with single key declarations.');
  });

  test('can parseMergeArgsExpr with key', () => {
    const args = `test: $key.test`;
    const result = parseMergeArgsExpr(args);
    expect(result.args).toEqual({ test: null });
    expect(result.mappingInstructions).toEqual([{ destinationPath: ['test'], sourcePath: ['test'] }]);
    expect(result.expansions).toEqual([]);
  });

  test('can parseMergeArgsExpr with nested key', () => {
    const args = `outer: { inner: $key.test }`;
    const result = parseMergeArgsExpr(args);
    expect(result.args).toEqual({ outer: { inner: null } });
    expect(result.mappingInstructions).toEqual([{ destinationPath: ['outer', 'inner'], sourcePath: ['test'] }]);
    expect(result.expansions).toEqual([]);
  });

  test('can parseMergeArgsExpr with complex key', () => {
    const args = `test: $key.outer.inner`;
    const result = parseMergeArgsExpr(args);
    expect(result.args).toEqual({ test: null });
    expect(result.mappingInstructions).toEqual([{ destinationPath: ['test'], sourcePath: ['outer', 'inner'] }]);
    expect(result.expansions).toEqual([]);
  });

  test('can parseMergeArgsExpr with key defined by selectionSet', () => {
    const selectionSet = parseSelectionSet(`{ field1 field2 { subFieldA subFieldB } }`);
    const args = `test: $key`;
    const result = parseMergeArgsExpr(args, [selectionSet]);
    expect(result).toEqual({
      args: { test: { field1: null, field2: { subFieldA: null, subFieldB: null }, __typename: null } },
      mappingInstructions: [
        { destinationPath: ['test', 'field1'], sourcePath: ['field1'] },
        { destinationPath: ['test', 'field2', 'subFieldA'], sourcePath: ['field2', 'subFieldA'] },
        { destinationPath: ['test', 'field2', 'subFieldB'], sourcePath: ['field2', 'subFieldB'] },
        { destinationPath: ['test', '__typename'], sourcePath: ['__typename'] },
      ],
      expansions: [],
    });
  });

  test('can parseMergeArgsExpr with expansion', () => {
    const args = `test: [[$key.test]]`;
    const result = parseMergeArgsExpr(args);
    expect(result.args).toEqual({ test: null });
    expect(result.mappingInstructions).toEqual([]);
    expect(result.expansions).toEqual([{
      valuePath: ['test'],
      value: null,
      mappingInstructions: [{ destinationPath: [], sourcePath: ['test'] }],
    }]);
  });

  test('can parseMergeArgsExpr with nested expansion', () => {
    const args = `outer: { inner: [[$key.test]] }`;
    const result = parseMergeArgsExpr(args);
    expect(result.args).toEqual({ outer: { inner: null } });
    expect(result.mappingInstructions).toEqual([]);
    expect(result.expansions).toEqual([{
      valuePath: ['outer', 'inner'],
      value: null,
      mappingInstructions: [{ destinationPath: [], sourcePath: ['test'] }],
    }]);
  });

  test('can parseMergeArgsExpr with expansion with nested key', () => {
    const args = `outer: [[{ inner: $key.test }]]`;
    const result = parseMergeArgsExpr(args);
    expect(result.args).toEqual({ outer: null });
    expect(result.mappingInstructions).toEqual([]);
    expect(result.expansions).toEqual([{
      valuePath: ['outer'],
      value: { inner: null },
      mappingInstructions: [{ destinationPath: ['inner'], sourcePath: ['test'] }],
    }]);
  });

  test('can parseMergeArgsExpr with expansion with complex key', () => {
    const args = `test: [[$key.outer.inner]]`;
    const result = parseMergeArgsExpr(args);
    expect(result.args).toEqual({ test: null });
    expect(result.mappingInstructions).toEqual([]);
    expect(result.expansions).toEqual([{
      valuePath: ['test'],
      value: null,
      mappingInstructions: [{ destinationPath: [], sourcePath: ['outer', 'inner'] }],
    }]);
  });

  test('can parseMergeArgsExpr with expansion with complex key defined by selectionSet', () => {
    const selectionSet = parseSelectionSet(`{ field1 field2 { subFieldA subFieldB } }`);
    const args = `test: [[$key]]`;
    const result = parseMergeArgsExpr(args, [selectionSet]);
    expect(result.args).toEqual({ test: null });
    expect(result.mappingInstructions).toEqual([]);
    expect(result.expansions).toEqual([{
      valuePath: ['test'],
      value: { field1: null, field2: { subFieldA: null, subFieldB: null }, __typename: null },
      mappingInstructions: [
        { destinationPath: ['field1'], sourcePath: ['field1'] },
        { destinationPath: ['field2', 'subFieldA'], sourcePath: ['field2', 'subFieldA'] },
        { destinationPath: ['field2', 'subFieldB'], sourcePath: ['field2', 'subFieldB'] },
        { destinationPath: ['__typename'], sourcePath: ['__typename'] },
      ],
    }]);
  });
});
