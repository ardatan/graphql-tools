import { assert } from 'chai';
import { GraphQLResolveInfo, GraphQLError } from 'graphql';
import {
  relocatedError,
  getErrorsFromParent,
  ERROR_SYMBOL
} from '../stitching/errors';
import { checkResultAndHandleErrors } from '../stitching/checkResultAndHandleErrors';

import 'mocha';

class ErrorWithExtensions extends GraphQLError {
  constructor(message: string, code: string) {
    super(message, null, null, null, null, null, { code });
  }
}

describe('Errors', () => {
  describe('relocatedError', () => {
    it('should adjust the path of a GraphqlError', () => {
      const originalError = new GraphQLError('test', null, null, null, ['test']);
      const newError = relocatedError(originalError, null, ['test', 1]);
      const expectedError = new GraphQLError('test', null, null, null, ['test', 1]);
      assert.deepEqual(newError, expectedError);
    });

    it('should also locate a non GraphQLError', () => {
      const originalError = new Error('test');
      const newError = relocatedError(originalError, null, ['test', 1]);
      const expectedError = new GraphQLError('test', null, null, null, ['test', 1]);
      assert.deepEqual(newError, expectedError);
    });
  });

  describe('getErrorsFromParent', () => {
    it('should return all errors including if path is not defined', () => {
      const mockErrors = {
        responseKey: '',
        [ERROR_SYMBOL]: [
          {
            message: 'Test error without path'
          } as GraphQLError
        ]
      };

      assert.deepEqual(getErrorsFromParent(mockErrors, 'responseKey'),
        [mockErrors[ERROR_SYMBOL][0]]
      );
    });
  });

  describe('checkResultAndHandleErrors', () => {
    it('persists single error', () => {
      const result = {
        errors: [new GraphQLError('Test error')]
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
  });
});
