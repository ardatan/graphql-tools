import { assert } from 'chai';
import { GraphQLResolveInfo } from 'graphql';
import { checkResultAndHandleErrors, getErrorsFromParent, ErrorSymbol } from '../stitching/errors';

import 'mocha';

class ErrorWithResult extends Error {
  public result: any;
  constructor(message: string, result: any) {
    super(message);
    this.result = result;
  }
}

describe('Errors', () => {
  describe('getErrorsFromParent', () => {
    it('should return OWN error kind if path is not defined', () => {
      const mockErrors = {
        responseKey: '',
        [ErrorSymbol]: [
          {
            message: 'Test error without path'
          }
        ]
      };

      assert.deepEqual(getErrorsFromParent(mockErrors, 'responseKey'), {
        kind: 'OWN',
        error: mockErrors[ErrorSymbol][0]
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

    it('persists original errors without a result', () => {
      const result = {
        errors: [new Error('Test error')]
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

    it('combines errors and perists the original errors', () => {
      const result = {
        errors: [new Error('Error1'), new Error('Error2')]
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
  });
});
