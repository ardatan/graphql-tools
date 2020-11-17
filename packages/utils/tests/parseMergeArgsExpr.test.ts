import { parseValue } from "graphql";

import {
  EXPANSION_PREFIX,
  KEY_DELIMITER,
  extractVariables,
  parseMergeArgsExpr,
  preparseMergeArgsExpr,
  selectionSetsToPaths,
  expandUnqualifiedKeys,
} from '../src/parseMergeArgsExpr';

import { parseSelectionSet } from '../src/selectionSets';
import { KeyDeclaration } from '../src/types';

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

describe('can extract variables', () => {
  test('return unmodified input value if no variables present', () => {
    const str = `{ outer: [{ inner: [1, 2]}, {inner: [3, 4] }] }`;
    const inputValue = parseValue(str, { noLocation: true });
    const { inputValue: newInputValue, variablePaths} = extractVariables(inputValue);

    const expectedInputValue = parseValue(`{ outer: [{ inner: [1, 2]}, { inner: [3, 4] }] }`, { noLocation: true });

    expect(newInputValue).toEqual(expectedInputValue);
    expect(variablePaths).toEqual({});
  });

  test('return replaced input value and record with variable names and values', () => {
    const str = `{ outer: [{ inner: [$test1, 2]}, {inner: [3, $test4] }] }`;
    const inputValue = parseValue(str, { noLocation: true });
    const { inputValue: newInputValue, variablePaths} = extractVariables(inputValue);

    const expectedInputValue = parseValue(`{ outer: [{ inner: [null, 2]}, { inner: [3, null] }] }`, { noLocation: true });

    expect(newInputValue).toEqual(expectedInputValue);
    expect(variablePaths).toEqual({
      test1: ['outer', 0, 'inner', 0],
      test4: ['outer', 1, 'inner', 1],
    });
  });
});

describe('can preparse merge arguments', () => {
  test('throws if nested key expansions used', () => {
    expect(() => preparseMergeArgsExpr(`[[[[]]]]`)).toThrowError('Each opening "[[" must be matched by a closing "]]" without nesting.');
  });

  test('throws with extra opening double brackets', () => {
    expect(() => preparseMergeArgsExpr(`[[[[]]`)).toThrowError('Each opening "[[" must be matched by a closing "]]" without nesting.');
  });

  test('throws with extra closing double brackets', () => {
    expect(() => preparseMergeArgsExpr(`[[]]]]`)).toThrowError('Each opening "[[" must be matched by a closing "]]" without nesting.');
  });

  test('can preparseMergeArgsExpr without key expansion', () => {
    const args = `test`;
    const result = preparseMergeArgsExpr(args);
    expect(result.mergeArgsExpr).toEqual('test');
    expect(result.expansionExpressions).toEqual({});
  });

  test('can preparseMergeArgsExpr an empty single key expansion', () => {
    const args = `[[]]`;
    const result = preparseMergeArgsExpr(args);
    expect(result.mergeArgsExpr).toEqual(`$${EXPANSION_PREFIX}1`);
    expect(result.expansionExpressions).toEqual({ [`${EXPANSION_PREFIX}1`]: '' });
  });

  test('can preparseMergeArgsExpr a single key expansion', () => {
    const args = `[[$key]]`;
    const result = preparseMergeArgsExpr(args);
    expect(result.mergeArgsExpr).toEqual(`$${EXPANSION_PREFIX}1`);
    expect(result.expansionExpressions).toEqual({ [`${EXPANSION_PREFIX}1`]: '$key' });
  });

  test('can preparseMergeArgsExpr a nested key expansion', () => {
    const args = `input: { keys: [[$key]], scope: "public" }`;
    const result = preparseMergeArgsExpr(args);
    expect(result.mergeArgsExpr).toEqual(`input: { keys: $${EXPANSION_PREFIX}1, scope: "public" }`);
    expect(result.expansionExpressions).toEqual({ [`${EXPANSION_PREFIX}1`]: '$key' });
  });

  test('can preparseMergeArgsExpr a complex key expansion', () => {
    const args = `input: { keys: [[{ id: $key.network.id }]], scope: "public" }`;
    const result = preparseMergeArgsExpr(args);
    expect(result.mergeArgsExpr).toEqual(`input: { keys: $${EXPANSION_PREFIX}1, scope: "public" }`);
    expect(result.expansionExpressions).toEqual({ [`${EXPANSION_PREFIX}1`]: `{ id: $key${KEY_DELIMITER}network${KEY_DELIMITER}id }`});
  });

  test('can preparseMergeArgsExpr multiple key expansions', () => {
    const args = `input: { ids: [[$key.id]], networkIds: [[$key.networkId]] }`;
    const result = preparseMergeArgsExpr(args);
    expect(result.mergeArgsExpr).toEqual(`input: { ids: $${EXPANSION_PREFIX}1, networkIds: $${EXPANSION_PREFIX}2 }`);
    expect(result.expansionExpressions).toEqual({ [`${EXPANSION_PREFIX}1`]: `$key${KEY_DELIMITER}id`, [`${EXPANSION_PREFIX}2`]: `$key${KEY_DELIMITER}networkId`});
  });
});

describe('can convert selectionSet hints to paths', () => {
  test('can convert a simple selection set', () => {
    const selectionSet = parseSelectionSet(`{ test }`);
    const result = selectionSetsToPaths([selectionSet]);
    expect(result).toEqual([['test']]);
  });

  test('can convert a complex selection set', () => {
    const selectionSet = parseSelectionSet(`{ field1 field2 { subFieldA subFieldB } }`);
    const result = selectionSetsToPaths([selectionSet]);
    expect(result).toEqual([['field1'], ['field2', 'subFieldA'], ['field2', 'subFieldB']]);
  });

  test('can convert multiple selection sets', () => {
    const selectionSet1 = parseSelectionSet(`{ field1 }`);
    const selectionSet2 = parseSelectionSet(`{ field2 }`);
    const result = selectionSetsToPaths([selectionSet1, selectionSet2]);
    expect(result).toEqual([['field1'], ['field2']]);
  });
});

describe('can compile references', () => {
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
