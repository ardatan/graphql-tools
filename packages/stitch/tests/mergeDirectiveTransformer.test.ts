function preparse(str: string): { str: string, expansions: Record<string, string> } {
  const variableRegex = /\$[_A-Za-z][_A-Za-z0-9.]*/g;
  const dotRegex = /\./g;
  str = str.replace(variableRegex, (variable) => variable.replace(dotRegex, '____'));

  const segments = str.split('[[');
  const expansions = Object.create(null);

  if (segments.length === 1) {
    return { str, expansions };
  }

  let finalSegments = [segments[0]];
  for (let i = 1; i < segments.length; i++) {
    const additionalSegments = segments[i].split(']]');
    if (additionalSegments.length !== 2) {
      throw new Error(`Each opening "[[" must be matched by a closing "]]" without nesting.`);
    }
    finalSegments = finalSegments.concat(additionalSegments);
  }

  let finalString = finalSegments[0];
  for (let i = 1; i < finalSegments.length - 1; i += 2) {
    const variableName = `_${(i - 1) / 2 + 1}`;
    expansions[variableName] = finalSegments[i];
    finalString += `\$${variableName}${finalSegments[i + 1]}`;
  }

  return { str: finalString, expansions };
}

describe('can preparse an expression', () => {
  test('throws if nested key expansions used', () => {
    expect(() => preparse(`[[[[]]]]`)).toThrowError('Each opening "[[" must be matched by a closing "]]" without nesting.');
  });

  test('throws with extra opening double brackets', () => {
    expect(() => preparse(`[[[[]]`)).toThrowError('Each opening "[[" must be matched by a closing "]]" without nesting.');
  });

  test('throws with extra closing double brackets', () => {
    expect(() => preparse(`[[]]]]`)).toThrowError('Each opening "[[" must be matched by a closing "]]" without nesting.');
  });

  test('can preparse without key expansion', () => {
    const str = `test`;
    const result = preparse(str);
    expect(result.str).toEqual('test');
    expect(result.expansions).toEqual({});
  });

  test('can preparse an empty single key expansion', () => {
    const str = `[[]]`;
    const result = preparse(str);
    expect(result.str).toEqual('$_1');
    expect(result.expansions).toEqual({ _1: '' });
  });

  test('can preparse a single key expansion', () => {
    const str = `[[$key]]`;
    const result = preparse(str);
    expect(result.str).toEqual('$_1');
    expect(result.expansions).toEqual({ _1: '$key' });
  });

  test('can preparse a nested key expansion', () => {
    const str = `{ input: { keys: [[$key]], scope: "public" } }`;
    const result = preparse(str);
    expect(result.str).toEqual('{ input: { keys: $_1, scope: "public" } }');
    expect(result.expansions).toEqual({ _1: '$key' });
  });

  test('can preparse a complex key expansion', () => {
    const str = `{ input: { keys: [[{ id: $key.network.id }]], scope: "public" } }`;
    const result = preparse(str);
    expect(result.str).toEqual('{ input: { keys: $_1, scope: "public" } }');
    expect(result.expansions).toEqual({ _1: '{ id: $key____network____id }'});
  });

  test('can preparse multiple key expansions', () => {
    const str = `{ input: { ids: [[$key.id]], networkIds: [[$key.networkId]] } }`;
    const result = preparse(str);
    expect(result.str).toEqual('{ input: { ids: $_1, networkIds: $_2 } }');
    expect(result.expansions).toEqual({ _1: '$key____id', _2: '$key____networkId'});
  });
});
