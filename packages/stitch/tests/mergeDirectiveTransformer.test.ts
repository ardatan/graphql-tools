import {
  Kind,
  ObjectFieldNode,
  parseValue,
  valueFromASTUntyped,
  ValueNode,
  VariableNode,
  visit
 } from "graphql";

interface PreparsedMergeArgs {
  preparsedArgs: string;
  expansions: Record<string, string>;
}

interface ParsedMergeArgs {
  args: Record<string, any>;
  keyFieldsDeclared: boolean;
  keyDeclarations: Array<KeyDeclaration>;
}

interface KeyDeclaration {
  keyPath: Array<string>;
  valuePath: Array<string | number>;
}

const KEY_DELIMITER = '__dot__';

function generateKeyFn(keyPaths: Array<Array<string>>): ((originalResult: Record<string, any>) => any) {
  return (originalResult: Record<string, any>) => {
    //...
  };
}

function parseMergeArgs(args: string): ParsedMergeArgs {
  const { preparsedArgs, expansions } = preparseMergeArgs(args);
  if (!Object.keys(expansions).length) {
    const inputValue = parseValue(`{ ${preparsedArgs} }`, { noLocation: true });
    const { inputValue: newInputValue, variables } = extractVariables(inputValue);
    if (!Object.keys(variables).length) {
      throw new Error('Merge arguments must declare a key.');
    }

    const args: Record<string, any> = Object.create(null);
    Object.entries(valueFromASTUntyped(newInputValue)).forEach(([argName, argValue]) => {
      args[argName] = argValue;
    });

    let keyFieldsDeclared: boolean = undefined;
    const keyDeclarations: Array<KeyDeclaration> = [];
    Object.entries(variables).forEach(([keyPath, valuePath]) => {
      const splitKeyPath = keyPath.split(KEY_DELIMITER);

      if (keyFieldsDeclared === undefined) {
        keyFieldsDeclared = splitKeyPath.length > 1;
      } else if (
        (keyFieldsDeclared === true && splitKeyPath.length === 1) ||
        (keyFieldsDeclared === false && splitKeyPath.length > 1)
      ) {
        throw new Error('Cannot mix whole keys with keys declared via their selectionSet members.');
      }

      keyDeclarations.push({
        keyPath: splitKeyPath.slice(1),
        valuePath,
      });
    });

    return { args, keyDeclarations, keyFieldsDeclared };
  }

  // if there are expansions
  //parse resultant args, extractVariables and obtain map of variable names to paths
  //update expansions record to index by paths rather than variable names
    // for each expansion
      // do something like above
}

describe('can parse merge arguments', () => {
  test('throws if no key declared', () => {
    expect(() => parseMergeArgs(`test: "test"`)).toThrowError('Merge arguments must declare a key.');
  });

  test('throws if whole key declarations are mixed with keys declared by their selectionSet members', () => {
    expect(() => parseMergeArgs(`whole: $key, member: $key.test`)).toThrowError('Cannot mix whole keys with keys declared via their selectionSet members.');
    expect(() => parseMergeArgs(`member: $key.test, whole: $key`)).toThrowError('Cannot mix whole keys with keys declared via their selectionSet members.');
  });

  test('can parseMergeArgs with key', () => {
    const args = `test: $key.test`;
    const result = parseMergeArgs(args);
    expect(result.args).toEqual({ test: null });
    expect(result.keyDeclarations).toEqual([ { keyPath: ['test'], valuePath: ['test'] }]);
    expect(result.keyFieldsDeclared).toEqual(true);
  });
});

function extractVariables(inputValue: ValueNode): { inputValue: ValueNode; variables: Record<string, Array<string | number>> } {
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
        variables[node.name.value] = path.concat([key]);
      } else {
        variables[node.name.value] = path.slice();
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
    const inputValue = parseValue(str, { noLocation: true });
    const { inputValue: newInputValue, variables} = extractVariables(inputValue);

    const expectedInputValue = parseValue(`{ outer: [{ inner: [1, 2]}, { inner: [3, 4] }] }`, { noLocation: true });

    expect(newInputValue).toEqual(expectedInputValue);
    expect(variables).toEqual({});
  });

  test('return replaced input value and record with variable names and values', () => {
    const str = `{ outer: [{ inner: [$test1, 2]}, {inner: [3, $test4] }] }`;
    const inputValue = parseValue(str, { noLocation: true });
    const { inputValue: newInputValue, variables} = extractVariables(inputValue);

    const expectedInputValue = parseValue(`{ outer: [{ inner: [null, 2]}, { inner: [3, null] }] }`, { noLocation: true });

    expect(newInputValue).toEqual(expectedInputValue);
    expect(variables).toEqual({
      test1: ['outer', 0, 'inner', 0],
      test4: ['outer', 1, 'inner', 1],
    });
  });
});

function preparseMergeArgs(args: string): PreparsedMergeArgs {
  const variableRegex = /\$[_A-Za-z][_A-Za-z0-9.]*/g;
  const dotRegex = /\./g;
  args = args.replace(variableRegex, (variable) => variable.replace(dotRegex, KEY_DELIMITER));

  const segments = args.split('[[');

  const expansions = Object.create(null);
  if (segments.length === 1) {
    return { preparsedArgs: args, expansions };
  }

  let finalSegments = [segments[0]];
  for (let i = 1; i < segments.length; i++) {
    const additionalSegments = segments[i].split(']]');
    if (additionalSegments.length !== 2) {
      throw new Error(`Each opening "[[" must be matched by a closing "]]" without nesting.`);
    }
    finalSegments = finalSegments.concat(additionalSegments);
  }

  let preparsedArgs = finalSegments[0];
  for (let i = 1; i < finalSegments.length - 1; i += 2) {
    const variableName = `__exp${(i - 1) / 2 + 1}`;
    expansions[variableName] = finalSegments[i];
    preparsedArgs += `\$${variableName}${finalSegments[i + 1]}`;
  }

  return { preparsedArgs, expansions };
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
    expect(result.preparsedArgs).toEqual('test');
    expect(result.expansions).toBeUndefined;
  });

  test('can preparseMergeArgs an empty single key expansion', () => {
    const args = `[[]]`;
    const result = preparseMergeArgs(args);
    expect(result.preparsedArgs).toEqual('$__exp1');
    expect(result.expansions).toEqual({ __exp1: '' });
  });

  test('can preparseMergeArgs a single key expansion', () => {
    const args = `[[$key]]`;
    const result = preparseMergeArgs(args);
    expect(result.preparsedArgs).toEqual('$__exp1');
    expect(result.expansions).toEqual({ __exp1: '$key' });
  });

  test('can preparseMergeArgs a nested key expansion', () => {
    const args = `input: { keys: [[$key]], scope: "public" }`;
    const result = preparseMergeArgs(args);
    expect(result.preparsedArgs).toEqual('input: { keys: $__exp1, scope: "public" }');
    expect(result.expansions).toEqual({ __exp1: '$key' });
  });

  test('can preparseMergeArgs a complex key expansion', () => {
    const args = `input: { keys: [[{ id: $key.network.id }]], scope: "public" }`;
    const result = preparseMergeArgs(args);
    expect(result.preparsedArgs).toEqual('input: { keys: $__exp1, scope: "public" }');
    expect(result.expansions).toEqual({ __exp1: `{ id: $key${KEY_DELIMITER}network${KEY_DELIMITER}id }`});
  });

  test('can preparseMergeArgs multiple key expansions', () => {
    const args = `input: { ids: [[$key.id]], networkIds: [[$key.networkId]] }`;
    const result = preparseMergeArgs(args);
    expect(result.preparsedArgs).toEqual('input: { ids: $__exp1, networkIds: $__exp2 }');
    expect(result.expansions).toEqual({ __exp1: `$key${KEY_DELIMITER}id`, __exp2: `$key${KEY_DELIMITER}networkId`});
  });
});
