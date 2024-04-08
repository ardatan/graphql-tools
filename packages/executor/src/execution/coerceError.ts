export function coerceError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

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
}
