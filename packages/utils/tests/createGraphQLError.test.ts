import { GraphQLError } from 'graphql';
import { createGraphQLError } from '../src/errors';

it('should handle non Error originalError', () => {
  const error = createGraphQLError('message', {
    originalError: {
      message: 'originalError',
      extensions: { code: 'ORIGINAL_ERROR' },
    } as any,
  });
  expect(error.originalError).toBeInstanceOf(GraphQLError);
  expect(error).toMatchObject({
    message: 'message',
    originalError: {
      message: 'originalError',
      extensions: { code: 'ORIGINAL_ERROR' },
    },
  });
});
