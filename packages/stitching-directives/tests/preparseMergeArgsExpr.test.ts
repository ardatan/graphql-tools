import { EXPANSION_PREFIX, KEY_DELIMITER, preparseMergeArgsExpr } from '../src/preparseMergeArgsExpr.js';

describe('can preparse merge arguments', () => {
  test('throws if nested key expansions used', () => {
    expect(() => preparseMergeArgsExpr(`[[[[]]]]`)).toThrowError(
      'Each opening "[[" must be matched by a closing "]]" without nesting.'
    );
  });

  test('throws with extra opening double brackets', () => {
    expect(() => preparseMergeArgsExpr(`[[[[]]`)).toThrowError(
      'Each opening "[[" must be matched by a closing "]]" without nesting.'
    );
  });

  test('throws with extra closing double brackets', () => {
    expect(() => preparseMergeArgsExpr(`[[]]]]`)).toThrowError(
      'Each opening "[[" must be matched by a closing "]]" without nesting.'
    );
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
    expect(result.expansionExpressions).toEqual({
      [`${EXPANSION_PREFIX}1`]: `{ id: $key${KEY_DELIMITER}network${KEY_DELIMITER}id }`,
    });
  });

  test('can preparseMergeArgsExpr multiple key expansions', () => {
    const args = `input: { ids: [[$key.id]], networkIds: [[$key.networkId]] }`;
    const result = preparseMergeArgsExpr(args);
    expect(result.mergeArgsExpr).toEqual(`input: { ids: $${EXPANSION_PREFIX}1, networkIds: $${EXPANSION_PREFIX}2 }`);
    expect(result.expansionExpressions).toEqual({
      [`${EXPANSION_PREFIX}1`]: `$key${KEY_DELIMITER}id`,
      [`${EXPANSION_PREFIX}2`]: `$key${KEY_DELIMITER}networkId`,
    });
  });
});
