import {
  Kind,
  ObjectFieldNode,
  parseValue,
  SelectionNode,
  SelectionSetNode,
  valueFromASTUntyped,
  ValueNode,
  VariableNode,
  visit,
} from 'graphql';

import { Expansion, KeyDeclaration, ParsedMergeArgsExpr } from './types';

export interface PreparsedMergeArgsExpr {
  mergeArgsExpr: string;
  expansionExpressions: Record<string, string>;
}

type VariablePaths = Record<string, Array<string | number>>;

export const KEY_DELIMITER = '__dot__';
export const EXPANSION_PREFIX = '__exp';

export function parseMergeArgsExpr(
  mergeArgsExpr: string,
  selectionSets: Array<SelectionSetNode> = []
): ParsedMergeArgsExpr {
  const { mergeArgsExpr: newMergeArgsExpr, expansionExpressions } = preparseMergeArgsExpr(mergeArgsExpr);

  const inputValue = parseValue(`{ ${newMergeArgsExpr} }`, { noLocation: true });

  const { inputValue: newInputValue, variablePaths } = extractVariables(inputValue);

  if (!Object.keys(expansionExpressions).length) {
    if (!Object.keys(variablePaths).length) {
      throw new Error('Merge arguments must declare a key.');
    }

    const keyDeclarations = getKeyDeclarations(variablePaths);

    const value = valueFromASTUntyped(newInputValue);

    const { value: finalValue, keyDeclarations: finalKeyDeclarations } = expandUnqualifiedKeys(
      value,
      keyDeclarations,
      selectionSets
    );

    const args: Record<string, any> = Object.create(null);
    Object.entries(finalValue).forEach(([argName, argValue]) => {
      args[argName] = argValue;
    });

    return { args, keyDeclarations: finalKeyDeclarations, expansions: [] };
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

    const value = valueFromASTUntyped(expansionInputValue);

    const { value: finalValue, keyDeclarations: finalKeyDeclarations } = expandUnqualifiedKeys(
      value,
      keyDeclarations,
      selectionSets
    );

    expansions.push({
      valuePath,
      value: finalValue,
      keyDeclarations: finalKeyDeclarations,
    });
  });

  const args: Record<string, any> = Object.create(null);
  Object.entries(valueFromASTUntyped(newInputValue)).forEach(([argName, argValue]) => {
    args[argName] = argValue;
  });

  return { args, keyDeclarations: [], expansions };
}

export function addKey(object: Record<string, any>, path: Array<string | number>, value: any) {
  const initialSegment = path[0];
  if (path.length === 1) {
    object[initialSegment] = value;
    return;
  }

  let field = object[initialSegment];
  if (field != null) {
    addKey(field, path.slice(1), value);
    return;
  }

  if (typeof path[1] === 'string') {
    field = Object.create(null);
  } else {
    field = [];
  }
  addKey(field, path.slice(1), value);
  object[initialSegment] = field;
}

export function expandUnqualifiedKeys(
  value: any,
  keyDeclarations: Array<KeyDeclaration>,
  selectionSets: Array<SelectionSetNode>
): { value: any; keyDeclarations: Array<KeyDeclaration> } {
  const paths = selectionSetsToPaths(selectionSets);
  const newKeyDeclarations: Array<KeyDeclaration> = [];
  keyDeclarations.forEach(keyDeclaration => {
    if (keyDeclaration.keyPath.length) {
      newKeyDeclarations.push(keyDeclaration);
    } else {
      if (value == null) {
        value = Object.create(null);
      }
      paths.forEach(path => {
        const valuePath = keyDeclaration.valuePath.concat(path);
        addKey(value, valuePath, null);
        newKeyDeclarations.push({
          valuePath,
          keyPath: path,
        });
      });
    }
  });
  return {
    value,
    keyDeclarations: newKeyDeclarations,
  };
}

export function selectionSetsToPaths(
  selectionSets: Array<SelectionSetNode>,
  path: Array<string> = []
): Array<Array<string>> {
  let paths: Array<Array<string>> = [];
  selectionSets.forEach(selectionSet => {
    paths = paths.concat(selectionSetToPaths(selectionSet, path));
  });
  return paths;
}

function selectionSetToPaths(selectionSet: SelectionSetNode, path: Array<string>): Array<Array<string>> {
  let paths: Array<Array<string>> = [];
  selectionSet.selections.forEach(selection => {
    paths = paths.concat(selectionToPaths(selection, path));
  });
  return paths;
}

function selectionToPaths(selection: SelectionNode, path: Array<string>): Array<Array<string>> {
  if (selection.kind === Kind.FIELD) {
    const responseKey = selection.alias?.value ?? selection.name.value;
    if (selection.selectionSet) {
      return selectionSetToPaths(selection.selectionSet, path.concat([responseKey]));
    } else {
      return [path.concat([responseKey])];
    }
  } else if (selection.kind === Kind.INLINE_FRAGMENT) {
    return selectionSetToPaths(selection.selectionSet, path);
  }
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
  const keyDeclarations: Array<KeyDeclaration> = [];
  Object.entries(variablePaths).forEach(([keyPath, valuePath]) => {
    const splitKeyPath = keyPath.split(KEY_DELIMITER).slice(1);

    keyDeclarations.push({
      valuePath,
      keyPath: splitKeyPath,
    });
  });

  return keyDeclarations;
}
