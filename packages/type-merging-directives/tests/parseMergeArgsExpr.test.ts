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
    expect(result.keyDeclarations).toEqual([{ valuePath: ['test'], keyPath: ['test'] }]);
    expect(result.expansions).toEqual([]);
  });

  test('can parseMergeArgsExpr with nested key', () => {
    const args = `outer: { inner: $key.test }`;
    const result = parseMergeArgsExpr(args);
    expect(result.args).toEqual({ outer: { inner: null } });
    expect(result.keyDeclarations).toEqual([{ valuePath: ['outer', 'inner'], keyPath: ['test'] }]);
    expect(result.expansions).toEqual([]);
  });

  test('can parseMergeArgsExpr with complex key', () => {
    const args = `test: $key.outer.inner`;
    const result = parseMergeArgsExpr(args);
    expect(result.args).toEqual({ test: null });
    expect(result.keyDeclarations).toEqual([{ valuePath: ['test'], keyPath: ['outer', 'inner'] }]);
    expect(result.expansions).toEqual([]);
  });

  test('can parseMergeArgsExpr with key defined by selectionSet', () => {
    const selectionSet = parseSelectionSet(`{ field1 field2 { subFieldA subFieldB } }`);
    const args = `test: $key`;
    const result = parseMergeArgsExpr(args, [selectionSet]);
    expect(result).toEqual({
      args: { test: { field1: null, field2: { subFieldA: null, subFieldB: null }} },
      keyDeclarations: [
        { valuePath: ['test', 'field1'], keyPath: ['field1'] },
        { valuePath: ['test', 'field2', 'subFieldA'], keyPath: ['field2', 'subFieldA'] },
        { valuePath: ['test', 'field2', 'subFieldB'], keyPath: ['field2', 'subFieldB'] },
      ],
      expansions: [],
    });
  });

  test('can parseMergeArgsExpr with expansion', () => {
    const args = `test: [[$key.test]]`;
    const result = parseMergeArgsExpr(args);
    expect(result.args).toEqual({ test: null });
    expect(result.keyDeclarations).toEqual([]);
    expect(result.expansions).toEqual([{
      valuePath: ['test'],
      value: null,
      keyDeclarations: [{ valuePath: [], keyPath: ['test'] }],
    }]);
  });

  test('can parseMergeArgsExpr with nested expansion', () => {
    const args = `outer: { inner: [[$key.test]] }`;
    const result = parseMergeArgsExpr(args);
    expect(result.args).toEqual({ outer: { inner: null } });
    expect(result.keyDeclarations).toEqual([]);
    expect(result.expansions).toEqual([{
      valuePath: ['outer', 'inner'],
      value: null,
      keyDeclarations: [{ valuePath: [], keyPath: ['test'] }],
    }]);
  });

  test('can parseMergeArgsExpr with expansion with nested key', () => {
    const args = `outer: [[{ inner: $key.test }]]`;
    const result = parseMergeArgsExpr(args);
    expect(result.args).toEqual({ outer: null });
    expect(result.keyDeclarations).toEqual([]);
    expect(result.expansions).toEqual([{
      valuePath: ['outer'],
      value: { inner: null },
      keyDeclarations: [{ valuePath: ['inner'], keyPath: ['test'] }],
    }]);
  });

  test('can parseMergeArgsExpr with expansion with complex key', () => {
    const args = `test: [[$key.outer.inner]]`;
    const result = parseMergeArgsExpr(args);
    expect(result.args).toEqual({ test: null });
    expect(result.keyDeclarations).toEqual([]);
    expect(result.expansions).toEqual([{
      valuePath: ['test'],
      value: null,
      keyDeclarations: [{ valuePath: [], keyPath: ['outer', 'inner'] }],
    }]);
  });

  test('can parseMergeArgsExpr with expansion with complex key defined by selectionSet', () => {
    const selectionSet = parseSelectionSet(`{ field1 field2 { subFieldA subFieldB } }`);
    const args = `test: [[$key]]`;
    const result = parseMergeArgsExpr(args, [selectionSet]);
    expect(result.args).toEqual({ test: null });
    expect(result.keyDeclarations).toEqual([]);
    expect(result.expansions).toEqual([{
      valuePath: ['test'],
      value: { field1: null, field2: { subFieldA: null, subFieldB: null } },
      keyDeclarations: [
        { valuePath: ['field1'], keyPath: ['field1'] },
        { valuePath: ['field2', 'subFieldA'], keyPath: ['field2', 'subFieldA'] },
        { valuePath: ['field2', 'subFieldB'], keyPath: ['field2', 'subFieldB'] },
      ],
    }]);
  });
});
