// Backwards compability for old versions of TypeScript
interface AggregateError extends Error {
  errors: any[];
}

interface AggregateErrorConstructor {
  new (errors: Iterable<any>, message?: string): AggregateError;
  (errors: Iterable<any>, message?: string): AggregateError;
  readonly prototype: AggregateError;
}

let AggregateErrorImpl: AggregateErrorConstructor;

if (typeof AggregateError === 'undefined') {
  class AggregateErrorClass extends Error implements AggregateError {
    constructor(public errors: any[], message = '') {
      super(message);
      this.name = 'AggregateError';
      Error.captureStackTrace(this, AggregateErrorClass);
    }
  }
  AggregateErrorImpl = function (errors: any[], message?: string) {
    return new AggregateErrorClass(errors, message);
  } as AggregateErrorConstructor;
} else {
  AggregateErrorImpl = AggregateError;
}

export { AggregateErrorImpl as AggregateError };

export function isAggregateError(error: Error): error is AggregateError {
  return 'errors' in error && Array.isArray(error['errors']);
}
