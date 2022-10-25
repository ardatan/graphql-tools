import { devAssert } from '../jsutils/devAssert.js';

import { GraphQLError } from '../error/GraphQLError.js';

import { assertName } from '../type/assertName.js';

/* c8 ignore start */
/**
 * Upholds the spec rules about naming.
 * @deprecated Please use `assertName` instead. Will be removed in v17
 */
export function assertValidName(name: string): string {
  const error = isValidNameError(name);
  if (error) {
    throw error;
  }
  return name;
}

/**
 * Returns an Error if a name is invalid.
 * @deprecated Please use `assertName` instead. Will be removed in v17
 */
export function isValidNameError(name: string): GraphQLError | undefined {
  devAssert(typeof name === 'string', 'Expected name to be a string.');

  if (name.startsWith('__')) {
    return new GraphQLError(`Name "${name}" must not begin with "__", which is reserved by GraphQL introspection.`);
  }

  try {
    assertName(name);
  } catch (error) {
    // @ts-expect-error We will fix this
    return error;
  }

  return undefined;
}
/* c8 ignore stop */
