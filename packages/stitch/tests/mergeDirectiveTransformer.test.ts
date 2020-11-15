import {
  FieldNode,
  Kind,
  ObjectFieldNode,
  OperationDefinitionNode,
  parse,
  ValueNode,
  VariableNode,
  visit
 } from "graphql";

interface PreparsedMergeArgs {
  args: string;
  expansions?: Record<string, string>;
}

function parseInputValue(inputValue: string): ValueNode {
  const query = parse(`{ parse(parse: ${inputValue}) { __typename } }`, { noLocation: true });
  return ((query.definitions[0] as OperationDefinitionNode).selectionSet.selections[0] as FieldNode).arguments[0].value;
}

function extractVariables(inputValue: ValueNode): { inputValue: ValueNode; variables: Record<string, string> } {
  const path: Array<string | number> = [];
  const variables = Object.create(null);

  const keyPathVisitor = {
    enter: (_node: any, key: string | number) => {
      if (typeof key === 'number') {
        path.push(key);
      }
    },
    leave: (_node: any, key: string | number) => {
      if (typeof key === 'number') {
        path.pop();
      }
    },
  };

  const fieldPathVisitor = {
    enter: (node: ObjectFieldNode) => {
      path.push(node.name.value);
    },
    leave: () => {
      path.pop();
    },
  };

  const variableVisitor = {
    enter: (node: VariableNode, key: string | number) => {
      if (typeof key === 'number') {
        variables[node.name.value] = `${path.join('.')}.${key}`;
      } else {
        variables[node.name.value] = path.join('.');
      }
      return {
        kind: Kind.NULL,
      };
    },
  };

  const newInputValue: ValueNode = visit(inputValue, {
    [Kind.OBJECT]: keyPathVisitor,
    [Kind.LIST]: keyPathVisitor,
    [Kind.OBJECT_FIELD]: fieldPathVisitor,
    [Kind.VARIABLE]: variableVisitor,
  });

  return {
    inputValue: newInputValue,
    variables,
  };
}

describe('can extract variables', () => {
  test('return unmodified input value if no variables present', () => {
    const str = `{ outer: [{ inner: [1, 2]}, {inner: [3, 4] }] }`;
    const inputValue = parseInputValue(str);
    const { inputValue: newInputValue, variables} = extractVariables(inputValue);

    const expectedInputValue = parseInputValue(`{ outer: [{ inner: [1, 2]}, { inner: [3, 4] }] }`);

    expect(newInputValue).toEqual(expectedInputValue);
    expect(variables).toEqual({});
  });

  test('return replaced input value and record with variable names and values', () => {
    const str = `{ outer: [{ inner: [$test1, 2]}, {inner: [3, $test4] }] }`;
    const inputValue = parseInputValue(str);
    const { inputValue: newInputValue, variables} = extractVariables(inputValue);

    const expectedInputValue = parseInputValue(`{ outer: [{ inner: [null, 2]}, { inner: [3, null] }] }`);

    expect(newInputValue).toEqual(expectedInputValue);
    expect(variables).toEqual({
      test1: 'outer.0.inner.0',
      test4: 'outer.1.inner.1',
    });
  });
});

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

describe('can preparse merge arguments', () => {
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
    const args = `input: { keys: [[$key]], scope: "public" }`;
    const result = preparseMergeArgs(args);
    expect(result.args).toEqual('input: { keys: $__exp1, scope: "public" }');
    expect(result.expansions).toEqual({ __exp1: '$key' });
  });

  test('can preparseMergeArgs a complex key expansion', () => {
    const args = `input: { keys: [[{ id: $key.network.id }]], scope: "public" }`;
    const result = preparseMergeArgs(args);
    expect(result.args).toEqual('input: { keys: $__exp1, scope: "public" }');
    expect(result.expansions).toEqual({ __exp1: '{ id: $key__dot__network__dot__id }'});
  });

  test('can preparseMergeArgs multiple key expansions', () => {
    const args = `input: { ids: [[$key.id]], networkIds: [[$key.networkId]] }`;
    const result = preparseMergeArgs(args);
    expect(result.args).toEqual('input: { ids: $__exp1, networkIds: $__exp2 }');
    expect(result.expansions).toEqual({ __exp1: '$key__dot__id', __exp2: '$key__dot__networkId'});
  });
});
