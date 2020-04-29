import { parse, ASTNode } from 'graphql';

export const asArray = <T>(fns: T | T[]) => (Array.isArray(fns) ? fns : fns ? [fns] : []);

export function isEqual<T>(a: T, b: T): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }

    for (let index = 0; index < a.length; index++) {
      if (a[index] !== b[index]) {
        return false;
      }
    }

    return true;
  }

  return a === b || (!a && !b);
}

export function isNotEqual<T>(a: T, b: T): boolean {
  return !isEqual(a, b);
}

export function isDocumentString(str: string): boolean {
  // XXX: is-valid-path or is-glob treat SDL as a valid path
  // (`scalar Date` for example)
  // this why checking the extension is fast enough
  // and prevent from parsing the string in order to find out
  // if the string is a SDL
  if (/\.[a-z0-9]+$/i.test(str)) {
    return false;
  }

  try {
    parse(str);
    return true;
  } catch (e) {}

  return false;
}

const invalidPathRegex = /[‘“!$%&^<=>`]/;
export function isValidPath(str: string): boolean {
  return typeof str === 'string' && !invalidPathRegex.test(str);
}

export function compareStrings<A, B>(a: A, b: B) {
  if (a.toString() < b.toString()) {
    return -1;
  }

  if (a.toString() > b.toString()) {
    return 1;
  }

  return 0;
}

export function nodeToString(a: ASTNode) {
  if ('alias' in a) {
    return a.alias.value;
  }

  if ('name' in a) {
    return a.name.value;
  }

  return a.kind;
}

export function compareNodes(a: ASTNode, b: ASTNode, customFn?: (a: any, b: any) => number) {
  const aStr = nodeToString(a);
  const bStr = nodeToString(b);

  if (typeof customFn === 'function') {
    return customFn(aStr, bStr);
  }

  return compareStrings(aStr, bStr);
}
