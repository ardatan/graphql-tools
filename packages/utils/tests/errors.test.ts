import { ASTNode, GraphQLError, Kind } from 'graphql';
import { describeIf } from '../../../packages/testing/utils';
import { getSchemaCoordinate, locatedError, relocatedError } from '../src/errors';

describeIf(
  // Do not leak test this on Windows
  !(process.env['LEAK_TEST'] && process.platform === 'win32'),
)('Errors', () => {
  describe('relocatedError', () => {
    it('should adjust the path of a GraphqlError', () => {
      const originalError = new GraphQLError('test', {
        path: ['test'],
      });
      const newError = relocatedError(originalError, ['test', 1, 'id'], {
        fieldName: 'id',
        parentType: { name: 'Test' },
      });

      expect(newError.path).toEqual(['test', 1, 'id']);
      expect(getSchemaCoordinate(newError)).toEqual('Test.id');
    });
  });

  describe('locatedError', () => {
    it('should add path, nodes and coordinate to error', () => {
      const originalError = new GraphQLError('test');
      const nodes: ASTNode[] = [{ kind: Kind.DOCUMENT, definitions: [] }];
      const error = locatedError(originalError, nodes, ['test'], {
        fieldName: 'test',
        parentType: { name: 'Query' },
      });
      expect(error.nodes).toBe(nodes);
      expect(error.path).toEqual(['test']);
      expect(error.coordinate).toEqual('Query.test');
    });
  });

  describe('getSchemaCoordinate', () => {
    it('should always return the schema coordinate, even when typed as original graphql error', () => {
      const error = new GraphQLError('test');
      expect(getSchemaCoordinate(error)).toBe(undefined);
      // @ts-expect-error coordinate doesn't exists in `graphql` yet.
      error.coordinate = 'Query.test';
      expect(getSchemaCoordinate(error)).toBe('Query.test');
      expect(
        getSchemaCoordinate(
          relocatedError(new GraphQLError('test'), undefined, {
            fieldName: 'test',
            parentType: { name: 'Query' },
          }),
        ),
      ).toBe('Query.test');
    });
  });
});
