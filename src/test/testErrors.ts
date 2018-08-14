import { assert } from 'chai';
import { GraphQLResolveInfo, ExecutionResult, GraphQLError } from 'graphql';
import { checkResultAndHandleErrors, getErrorsFromParent, ERROR_SYMBOL } from '../stitching/errors';

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

    it('should not join error when corresponding path exists', () => {
      const result: ExecutionResult = {
        data: {
          'a': null as any,
          'b': null as any
        },
        errors: [
          new GraphQLError('Error1', null, null, null, ['a']),
          new GraphQLError('Error2', null, null, null, ['b'])
        ]
      };

      const checkErrorTemplate = (key: string, expectedEntry: any) => {
        try {
          checkResultAndHandleErrors(result, { path: { key } } as any, key);
        } catch (e) {
          assert.equal(e.message, expectedEntry.message);
          assert.deepEqual(e.path, expectedEntry.path);
          assert.isNotEmpty(e.originalError);
          assert.isNotEmpty(e.originalError.errors);
          assert.lengthOf(e.originalError.errors, result.errors.length);
          result.errors.forEach((error, i) => {
            assert.deepEqual(e.originalError.errors[i], error);
          });
        }
      };

      checkErrorTemplate('a', result.errors[0]);
      checkErrorTemplate('b', result.errors[1]);
    });

    it('should not taint primitive values on error', () => {
      const result: ExecutionResult = {
        data: {
          'a': 'hello world',
          'b': 123,
          'c': true,
          'd': null as any
        },
        errors: [
          new GraphQLError('Error', null, null, null, ['d'])
        ]
      };

      const checkValueOnResult =
        (key: any) => checkResultAndHandleErrors(result, {} as GraphQLResolveInfo, key) === result.data[key];

      assert.isTrue(checkValueOnResult('a'));
      assert.isTrue(checkValueOnResult('b'));
      assert.isTrue(checkValueOnResult('c'));
    });
  });
});
