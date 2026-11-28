export function coerceError(error: unknown): Error {
  // `instanceof` can throw on revoked Proxies (prototype access). Never escape.
  try {
    if (error instanceof Error) {
      return error;
    }
  } catch {
    return new Error('Unexpected error value');
  }

  // Property access / String(x) can throw (Object.create(null), hostile getters).
  // Never escape — nested walkers rely on coerceError staying inside the field
  // catch so siblings survive (CR 8456 / discussion_r4706996094).
  try {
    if (typeof error === 'object' && error != null) {
      if ('message' in error && typeof error.message === 'string') {
        let errorOptions: ErrorOptions | undefined;
        if ('cause' in error) {
          errorOptions = { cause: error.cause };
        }
        const coercedError = new Error(error.message, errorOptions);
        if ('stack' in error && typeof error.stack === 'string') {
          coercedError.stack = error.stack;
        }
        if ('name' in error && typeof error.name === 'string') {
          coercedError.name = error.name;
        }
        return coercedError;
      }
    }

    return new Error(String(error));
  } catch (thrown) {
    try {
      if (thrown instanceof Error) {
        return thrown;
      }
    } catch {
      // revoked Proxy / hostile prototype
    }
    return new Error('Unexpected error value');
  }
}
