import { Kind, ObjectFieldNode, parseValue, valueFromASTUntyped, ValueNode, VariableNode, visit } from 'graphql';

import { Expansion, KeyDeclaration, ParsedMergeArgsExpr } from './types';

export interface PreparsedMergeArgsExpr {
  mergeArgsExpr: string;
  expansionExpressions: Record<string, string>;
}

type VariablePaths = Record<string, Array<string | number>>;

export const KEY_DELIMITER = '__dot__';
export const EXPANSION_PREFIX = '__exp';

export function parseMergeArgsExpr(mergeArgsExpr: string): ParsedMergeArgsExpr {
  const { mergeArgsExpr: newMergeArgsExpr, expansionExpressions } = preparseMergeArgsExpr(mergeArgsExpr);

  const inputValue = parseValue(`{ ${newMergeArgsExpr} }`, { noLocation: true });

  const { inputValue: newInputValue, variablePaths } = extractVariables(inputValue);

  const args: Record<string, any> = Object.create(null);
  Object.entries(valueFromASTUntyped(newInputValue)).forEach(([argName, argValue]) => {
    args[argName] = argValue;
  });

  if (!Object.keys(expansionExpressions).length) {
    if (!Object.keys(variablePaths).length) {
      throw new Error('Merge arguments must declare a key.');
    }

    const keyDeclarations = getKeyDeclarations(variablePaths);

    return { args, keyDeclarations, expansions: [] };
  }

  const expansionRegEx = new RegExp(`${EXPANSION_PREFIX}[0-9]+`);
  Object.keys(variablePaths).forEach(variableName => {
    if (!variableName.match(expansionRegEx)) {
      throw new Error('Expansions cannot be mixed with single key declarations.');
    }
  });

  const expansions: Array<Expansion> = [];
  Object.keys(expansionExpressions).forEach(variableName => {
    const str = expansionExpressions[variableName];
    const valuePath = variablePaths[variableName];
    const { inputValue: expansionInputValue, variablePaths: expansionVariablePaths } = extractVariables(
      parseValue(`${str}`, { noLocation: true })
    );
    if (!Object.keys(expansionVariablePaths).length) {
      throw new Error('Merge arguments must declare a key.');
    }

    const keyDeclarations = getKeyDeclarations(expansionVariablePaths);

    expansions.push({
      value: valueFromASTUntyped(expansionInputValue),
      valuePath,
      keyDeclarations,
    });
  });

  return { args, keyDeclarations: [], expansions };
}

export function preparseMergeArgsExpr(mergeArgsExpr: string): PreparsedMergeArgsExpr {
  const variableRegex = /\$[_A-Za-z][_A-Za-z0-9.]*/g;
  const dotRegex = /\./g;
  mergeArgsExpr = mergeArgsExpr.replace(variableRegex, variable => variable.replace(dotRegex, KEY_DELIMITER));

  const segments = mergeArgsExpr.split('[[');

  const expansionExpressions = Object.create(null);
  if (segments.length === 1) {
    return { mergeArgsExpr: mergeArgsExpr, expansionExpressions };
  }

  let finalSegments = [segments[0]];
  for (let i = 1; i < segments.length; i++) {
    const additionalSegments = segments[i].split(']]');
    if (additionalSegments.length !== 2) {
      throw new Error(`Each opening "[[" must be matched by a closing "]]" without nesting.`);
    }
    finalSegments = finalSegments.concat(additionalSegments);
  }

  let finalMergeArgsExpr = finalSegments[0];
  for (let i = 1; i < finalSegments.length - 1; i += 2) {
    const variableName = `${EXPANSION_PREFIX}${(i - 1) / 2 + 1}`;
    expansionExpressions[variableName] = finalSegments[i];
    finalMergeArgsExpr += `\$${variableName}${finalSegments[i + 1]}`;
  }

  return { mergeArgsExpr: finalMergeArgsExpr, expansionExpressions };
}

export function extractVariables(inputValue: ValueNode): { inputValue: ValueNode; variablePaths: VariablePaths } {
  const path: Array<string | number> = [];
  const variablePaths = Object.create(null);

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
        variablePaths[node.name.value] = path.concat([key]);
      } else {
        variablePaths[node.name.value] = path.slice();
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
    variablePaths,
  };
}

function getKeyDeclarations(variablePaths: VariablePaths): Array<KeyDeclaration> {
  let keyFieldsDeclared: boolean;
  const keyDeclarations: Array<KeyDeclaration> = [];
  Object.entries(variablePaths).forEach(([keyPath, valuePath]) => {
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
      valuePath,
      keyPath: splitKeyPath.slice(1),
    });
  });

  return keyDeclarations;
}
