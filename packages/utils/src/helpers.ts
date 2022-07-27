import { parse, ASTNode } from 'graphql';

export const asArray = <T>(fns: T | T[]) => (Array.isArray(fns) ? fns : fns ? [fns] : []);

const invalidDocRegex = /\.[a-z0-9]+$/i;
export function isDocumentString(str: any): boolean {
  if (typeof str !== 'string') {
    return false;
  }

  // XXX: is-valid-path or is-glob treat SDL as a valid path
  // (`scalar Date` for example)
  // this why checking the extension is fast enough
  // and prevent from parsing the string in order to find out
  // if the string is a SDL
  if (invalidDocRegex.test(str)) {
    return false;
  }

  try {
    parse(str);
    return true;
  } catch (e: any) {}

  return false;
}

const invalidPathRegex = /[‘“!%^<=>`]/;
export function isValidPath(str: any): boolean {
  return typeof str === 'string' && !invalidPathRegex.test(str);
}

export function compareStrings<A, B>(a: A, b: B) {
  if (String(a) < String(b)) {
    return -1;
  }

  if (String(a) > String(b)) {
    return 1;
  }

  return 0;
}

export function nodeToString(a: ASTNode): string {
  let name: string | undefined;
  if ('alias' in a) {
    name = a.alias?.value;
  }
  if (name == null && 'name' in a) {
    name = a.name?.value;
  }
  if (name == null) {
    name = a.kind;
  }

  return name;
}

export function compareNodes(a: ASTNode, b: ASTNode, customFn?: (a: any, b: any) => number) {
  const aStr = nodeToString(a);
  const bStr = nodeToString(b);

  if (typeof customFn === 'function') {
    return customFn(aStr, bStr);
  }

  return compareStrings(aStr, bStr);
}

export function isSome<T>(input: T): input is Exclude<T, null | undefined> {
  return input != null;
}

export function assertSome<T>(
  input: T,
  message = 'Value should be something'
): asserts input is Exclude<T, null | undefined> {
  if (input == null) {
    throw new Error(message);
  }
}
