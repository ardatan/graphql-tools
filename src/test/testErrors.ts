import { assert } from 'chai';
import { GraphQLResolveInfo, GraphQLError } from 'graphql';
import { checkResultAndHandleErrors, getErrorsFromParent, ERROR_SYMBOL } from '../stitching/errors';

import 'mocha';

class ErrorWithResult extends GraphQLError {
  public result: any;
  constructor(message: string, result: any) {
    super(message);
    this.result = result;
  }
}

class ErrorWithExtensions extends GraphQLError {
  constructor(message: string, code: string) {
    super(message, null, null, null, null, null, { code });
  }
}

describe('Errors', () => {
  describe('getErrorsFromParent', () => {
    it('should return OWN error kind if path is not defined', () => {
      const mockErrors = {
        responseKey: '',
        [ERROR_SYMBOL]: [
          {
            message: 'Test error without path'
          }
        ]
      };

      assert.deepEqual(getErrorsFromParent(mockErrors, 'responseKey'), {
        kind: 'OWN',
        error: mockErrors[ERROR_SYMBOL][0]
      });
    });
  });

  describe('checkResultAndHandleErrors', () => {
    it('persists single error with a result', () => {
      const result = {
        errors: [new ErrorWithResult('Test error', 'result')]
      };
      try {
        checkResultAndHandleErrors(result, {} as GraphQLResolveInfo, 'responseKey');
      } catch (e) {
        assert.equal(e.message, 'Test error');
        assert.isUndefined(e.originalError.errors);
      }
    });

    it('persists single error with extensions', () => {
      const result = {
        errors: [new ErrorWithExtensions('Test error', 'UNAUTHENTICATED')]
      };
      try {
        checkResultAndHandleErrors(result, {} as GraphQLResolveInfo, 'responseKey');
      } catch (e) {
        assert.equal(e.message, 'Test error');
        assert.equal(e.extensions && e.extensions.code, 'UNAUTHENTICATED');
        assert.isUndefined(e.originalError.errors);
      }
    });

    it('persists original errors without a result', () => {
      const result = {
        errors: [new GraphQLError('Test error')]
      };
      try {
        checkResultAndHandleErrors(result, {} as GraphQLResolveInfo, 'responseKey');
      } catch (e) {
        assert.equal(e.message, 'Test error');
        assert.isNotEmpty(e.originalError);
        assert.isNotEmpty(e.originalError.errors);
        assert.lengthOf(e.originalError.errors, result.errors.length);
        result.errors.forEach((error, i) => {
          assert.deepEqual(e.originalError.errors[i], error);
        });
      }
    });

    it('combines errors and persists the original errors', () => {
      const result = {
        errors: [
          new GraphQLError('Error1'),
          new GraphQLError('Error2'),
        ]
      };
      try {
        checkResultAndHandleErrors(result, {} as GraphQLResolveInfo, 'responseKey');
      } catch (e) {
        assert.equal(e.message, 'Error1\nError2');
        assert.isNotEmpty(e.originalError);
        assert.isNotEmpty(e.originalError.errors);
        assert.lengthOf(e.originalError.errors, result.errors.length);
        result.errors.forEach((error, i) => {
          assert.deepEqual(e.originalError.errors[i], error);
        });
      }
    });

    it('persists single error that is instance of Error if the initial error has path and extensions and is instance of Object', () => {
      const result = {
        errors: [
          {
            message: 'Test error',
            extensions: {},
            path: [] as any,
          } as GraphQLError
        ]
      };
      try {
        checkResultAndHandleErrors(result, {} as GraphQLResolveInfo, 'responseKey');
      } catch (e) {
        assert.equal(e.message, 'Test error');
        assert.instanceOf(e, Error);
      }
    });
  });
});
