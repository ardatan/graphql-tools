import { GraphQLError, GraphQLResolveInfo } from 'graphql';

import { relocatedError, getErrors, ERROR_SYMBOL } from '@graphql-tools/utils';

import { checkResultAndHandleErrors } from '@graphql-tools/delegate';

class ErrorWithExtensions extends GraphQLError {
  constructor(message: string, code: string) {
    super(message, null, null, null, null, null, { code });
  }
}

describe('Errors', () => {
  describe('relocatedError', () => {
    test('should adjust the path of a GraphqlError', () => {
      const originalError = new GraphQLError('test', null, null, null, [
        'test',
      ]);
      const newError = relocatedError(originalError, ['test', 1]);
      const expectedError = new GraphQLError('test', null, null, null, [
        'test',
        1,
      ]);
      expect(newError).toEqual(expectedError);
    });
  });

  describe('getErrors', () => {
    test('should return all errors including if path is not defined', () => {
      const error = {
        message: 'Test error without path',
      };
      const mockErrors: any = {
        responseKey: '',
        [ERROR_SYMBOL]: [error],
      };

      expect(getErrors(mockErrors, 'responseKey')).toEqual([
        mockErrors[ERROR_SYMBOL][0],
      ]);
    });
  });

  describe('checkResultAndHandleErrors', () => {
    test('persists single error', () => {
      const result = {
        errors: [new GraphQLError('Test error')],
      };
      try {
        checkResultAndHandleErrors(
          result,
          {},
          ({} as unknown) as GraphQLResolveInfo,
          'responseKey',
        );
      } catch (e) {
        expect(e.message).toEqual('Test error');
        expect(e.originalError.errors).toBeUndefined();
      }
    });

    test('persists single error with extensions', () => {
      const result = {
        errors: [new ErrorWithExtensions('Test error', 'UNAUTHENTICATED')],
      };
      try {
        checkResultAndHandleErrors(
          result,
          {},
          ({} as unknown) as GraphQLResolveInfo,
          'responseKey',
        );
      } catch (e) {
        expect(e.message).toEqual('Test error');
        expect(e.extensions && e.extensions.code).toEqual('UNAUTHENTICATED');
        expect(e.originalError.errors).toBeUndefined();
      }
    });

    test('combines errors and persists the original errors', () => {
      const result = {
        errors: [new GraphQLError('Error1'), new GraphQLError('Error2')],
      };
      try {
        checkResultAndHandleErrors(
          result,
          {},
          ({} as unknown) as GraphQLResolveInfo,
          'responseKey',
        );
      } catch (e) {
        expect(e.message).toEqual('Error1\nError2');
        expect(e.originalError).toBeDefined();
        expect(e.originalError.errors).toBeDefined();
        expect(e.originalError.errors).toHaveLength(result.errors.length);
        result.errors.forEach((error, i) => {
          expect(e.originalError.errors[i]).toEqual(error);
        });
      }
    });
  });
});
