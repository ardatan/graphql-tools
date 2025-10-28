import { ASTNode, GraphQLError, Kind, versionInfo } from 'graphql';
import {
  createGraphQLError,
  ERROR_EXTENSION_SCHEMA_COORDINATE,
  locatedError,
  relocatedError,
} from '../src/errors';

describe('Errors', () => {
  describe('relocatedError', () => {
    it('should adjust the path of a GraphqlError', () => {
      const originalError = createGraphQLError('test', {
        path: ['test'],
        extensions: {
          [ERROR_EXTENSION_SCHEMA_COORDINATE]: 'Query.test',
        },
      });
      const newError = relocatedError(originalError, ['test', 1, 'id'], {
        fieldName: 'id',
        parentType: { name: 'Test' },
      });
      const expectedError = createGraphQLError('test', {
        path: ['test', 1, 'id'],
        extensions: {
          [ERROR_EXTENSION_SCHEMA_COORDINATE]: 'Query.test',
        },
      });
      expect(newError).toEqual(expectedError);
    });
  });

  describe('locatedError', () => {
    it('should add path, nodes and coordinate to error', () => {
      const originalError = createGraphQLError('test');
      const nodes: ASTNode[] = [{ kind: Kind.DOCUMENT, definitions: [] }];
      const error = locatedError(originalError, nodes, ['test'], {
        fieldName: 'test',
        parentType: { name: 'Query' },
      });
      expect(error.nodes).toBe(nodes);
      expect(error.path).toEqual(['test']);
      if (versionInfo.major !== 16) {
        expect(error.extensions).toEqual({
          [ERROR_EXTENSION_SCHEMA_COORDINATE]: 'Query.test',
        });
      }
    });
  });

  describe('createGraphQLError', () => {
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

    it('should handle coordinate', () => {
      if (versionInfo.major !== 16) {
        const error = createGraphQLError('message', {
          extensions: {
            [ERROR_EXTENSION_SCHEMA_COORDINATE]: 'Query.test',
          },
        });
        expect(error.extensions).toMatchObject({
          [ERROR_EXTENSION_SCHEMA_COORDINATE]: 'Query.test',
        });
      }
    });
  });
});
