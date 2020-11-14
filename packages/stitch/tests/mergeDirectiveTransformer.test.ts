interface PreparsedMergeArgs {
  args: string;
  expansions?: Record<string, string>;
}

function preparseMergeArgs(args: string): PreparsedMergeArgs {
  const variableRegex = /\$[_A-Za-z][_A-Za-z0-9.]*/g;
  const dotRegex = /\./g;
  args = args.replace(variableRegex, (variable) => variable.replace(dotRegex, '__dot__'));

  const segments = args.split('[[');

  if (segments.length === 1) {
    return { args };
  }

  let finalSegments = [segments[0]];
  for (let i = 1; i < segments.length; i++) {
    const additionalSegments = segments[i].split(']]');
    if (additionalSegments.length !== 2) {
      throw new Error(`Each opening "[[" must be matched by a closing "]]" without nesting.`);
    }
    finalSegments = finalSegments.concat(additionalSegments);
  }

  const expansions = Object.create(null);
  let finalArgs = finalSegments[0];
  for (let i = 1; i < finalSegments.length - 1; i += 2) {
    const variableName = `__exp${(i - 1) / 2 + 1}`;
    expansions[variableName] = finalSegments[i];
    finalArgs += `\$${variableName}${finalSegments[i + 1]}`;
  }

  return { args: finalArgs, expansions };
}

describe('can preparseMergeArgs an expression', () => {
  test('throws if nested key expansions used', () => {
    expect(() => preparseMergeArgs(`[[[[]]]]`)).toThrowError('Each opening "[[" must be matched by a closing "]]" without nesting.');
  });

  test('throws with extra opening double brackets', () => {
    expect(() => preparseMergeArgs(`[[[[]]`)).toThrowError('Each opening "[[" must be matched by a closing "]]" without nesting.');
  });

  test('throws with extra closing double brackets', () => {
    expect(() => preparseMergeArgs(`[[]]]]`)).toThrowError('Each opening "[[" must be matched by a closing "]]" without nesting.');
  });

  test('can preparseMergeArgs without key expansion', () => {
    const args = `test`;
    const result = preparseMergeArgs(args);
    expect(result.args).toEqual('test');
    expect(result.expansions).toBeUndefined;
  });

  test('can preparseMergeArgs an empty single key expansion', () => {
    const args = `[[]]`;
    const result = preparseMergeArgs(args);
    expect(result.args).toEqual('$__exp1');
    expect(result.expansions).toEqual({ __exp1: '' });
  });

  test('can preparseMergeArgs a single key expansion', () => {
    const args = `[[$key]]`;
    const result = preparseMergeArgs(args);
    expect(result.args).toEqual('$__exp1');
    expect(result.expansions).toEqual({ __exp1: '$key' });
  });

  test('can preparseMergeArgs a nested key expansion', () => {
    const args = `{ input: { keys: [[$key]], scope: "public" } }`;
    const result = preparseMergeArgs(args);
    expect(result.args).toEqual('{ input: { keys: $__exp1, scope: "public" } }');
    expect(result.expansions).toEqual({ __exp1: '$key' });
  });

  test('can preparseMergeArgs a complex key expansion', () => {
    const args = `{ input: { keys: [[{ id: $key.network.id }]], scope: "public" } }`;
    const result = preparseMergeArgs(args);
    expect(result.args).toEqual('{ input: { keys: $__exp1, scope: "public" } }');
    expect(result.expansions).toEqual({ __exp1: '{ id: $key__dot__network__dot__id }'});
  });

  test('can preparseMergeArgs multiple key expansions', () => {
    const args = `{ input: { ids: [[$key.id]], networkIds: [[$key.networkId]] } }`;
    const result = preparseMergeArgs(args);
    expect(result.args).toEqual('{ input: { ids: $__exp1, networkIds: $__exp2 } }');
    expect(result.expansions).toEqual({ __exp1: '$key__dot__id', __exp2: '$key__dot__networkId'});
  });
});
