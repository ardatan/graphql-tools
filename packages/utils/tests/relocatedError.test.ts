import { relocatedError, createGraphQLError } from '../src/errors.js';

describe('Errors', () => {
  describe('relocatedError', () => {
    test('should adjust the path of a GraphqlError', () => {
      const originalError = createGraphQLError('test', {
        path: ['test'],
      });
      const newError = relocatedError(originalError, ['test', 1]);
      const expectedError = createGraphQLError('test', {
        path: ['test', 1],
      });
      expect(newError).toEqual(expectedError);
    });
  });
});
