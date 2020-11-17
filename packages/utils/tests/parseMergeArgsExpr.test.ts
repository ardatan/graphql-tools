import { parseValue } from "graphql";

import {
  parseMergeArgsExpr,
  preparseMergeArgsExpr,
  extractVariables,
  EXPANSION_PREFIX,
  KEY_DELIMITER,
} from '../src/parseMergeArgsExpr';

describe('can parse merge arguments', () => {
  test('throws if no key declared', () => {
    expect(() => parseMergeArgsExpr(`test: "test"`)).toThrowError('Merge arguments must declare a key.');
  });

  test('throws if whole key declarations are mixed with keys declared by their selectionSet members', () => {
    expect(() => parseMergeArgsExpr(`whole: $key, member: $key.test`)).toThrowError('Cannot mix whole keys with keys declared via their selectionSet members.');
    expect(() => parseMergeArgsExpr(`member: $key.test, whole: $key`)).toThrowError('Cannot mix whole keys with keys declared via their selectionSet members.');
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

  test('can parseMergeArgsExpr with expansion', () => {
    const args = `test: [[$key.test]]`;
    const result = parseMergeArgsExpr(args);
    expect(result.args).toEqual({ test: null });
    expect(result.keyDeclarations).toEqual([]);
    expect(result.expansions).toEqual([{
      value: null,
      valuePath: ['test'],
      keyDeclarations: [{ valuePath: [], keyPath: ['test'] }],
    }]);
  });

  test('can parseMergeArgsExpr with nested expansion', () => {
    const args = `outer: { inner: [[$key.test]] }`;
    const result = parseMergeArgsExpr(args);
    expect(result.args).toEqual({ outer: { inner: null } });
    expect(result.keyDeclarations).toEqual([]);
    expect(result.expansions).toEqual([{
      value: null,
      valuePath: ['outer', 'inner'],
      keyDeclarations: [{ valuePath: [], keyPath: ['test'] }],
    }]);
  });

  test('can parseMergeArgsExpr with expansion with nested key', () => {
    const args = `outer: [[{ inner: $key.test }]]`;
    const result = parseMergeArgsExpr(args);
    expect(result.args).toEqual({ outer: null });
    expect(result.keyDeclarations).toEqual([]);
    expect(result.expansions).toEqual([{
      value: { inner: null },
      valuePath: ['outer'],
      keyDeclarations: [{ valuePath: ['inner'], keyPath: ['test'] }],
    }]);
  });

  test('can parseMergeArgsExpr with expansion with complex key', () => {
    const args = `test: [[$key.outer.inner]]`;
    const result = parseMergeArgsExpr(args);
    expect(result.args).toEqual({ test: null });
    expect(result.keyDeclarations).toEqual([]);
    expect(result.expansions).toEqual([{
      value: null,
      valuePath: ['test'],
      keyDeclarations: [{ valuePath: [], keyPath: ['outer', 'inner'] }],
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
    expect(result.expansionExpressions).toBeUndefined;
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
