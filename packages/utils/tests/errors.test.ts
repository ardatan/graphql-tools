import { ASTNode, GraphQLError, Kind, versionInfo } from 'graphql';
import { describeIf, testIf } from '../../../packages/testing/utils';
import {
  createGraphQLError,
  getSchemaCoordinate,
  locatedError,
  relocatedError,
} from '../src/errors';

describe('Errors', () => {
  describe('relocatedError', () => {
    it('should adjust the path of a GraphqlError', () => {
      const originalError = createGraphQLError('test', {
        path: ['test'],
        coordinate: 'Query.test',
      });
      const newError = relocatedError(originalError, ['test', 1, 'id'], {
        fieldName: 'id',
        parentType: { name: 'Test' },
      });

      expect(newError.path).toEqual(['test', 1, 'id']);

      if (versionInfo.major >= 16) {
        expect(getSchemaCoordinate(newError)).toEqual('Test.id');
      }
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
      if (versionInfo.major >= 16) {
        expect(error.coordinate).toEqual('Query.test');
      }
    });
  });

  describeIf(versionInfo.major >= 16)('getSchemaCoordinate', () => {
    it('should always return the schema coordinate, even when typed as original graphql error', () => {
      const error = new GraphQLError('test');
      expect(getSchemaCoordinate(error)).toBe(undefined);
      // @ts-expect-error coordinate doesn't exists in `graphql` yet.
      error.coordinate = 'Query.test';
      expect(getSchemaCoordinate(error)).toBe('Query.test');
      expect(createGraphQLError('test', { coordinate: 'Query.test' }).coordinate).toBe(
        'Query.test',
      );
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

    testIf(versionInfo.major >= 16)('should handle coordinate', () => {
      const error = createGraphQLError('message', {
        coordinate: 'Query.test',
      });
      expect(error).toMatchObject({
        coordinate: 'Query.test',
      });
    });

    it('should not have coordinate in JSON representation', () => {
      // Since this an experiment, we don't want coordinate to leak to the client
      const error = createGraphQLError('message', {
        coordinate: 'Query.test',
      });
      expect(JSON.stringify(error)).toBe('{"message":"message"}');
    });
  });
});
