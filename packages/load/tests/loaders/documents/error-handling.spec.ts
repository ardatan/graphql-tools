import { join } from 'path';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadDocuments, loadDocumentsSync } from '@graphql-tools/load';
import { runTests } from '../../../../testing/utils.js';

const fixtures = join(__dirname, 'test-error-handling');

describe('loadDocuments errorHandling', () => {
  runTests({
    async: loadDocuments,
    sync: loadDocumentsSync,
  })(load => {
    test('throw (default) still raises the first parse error', async () => {
      const glob = join(fixtures, '*.query.graphql');

      await expect(
        load(glob, {
          loaders: [new GraphQLFileLoader()],
        }),
      ).rejects.toThrow(/Syntax Error/);
    });

    test('aggregate throws AggregateError with every parse failure', async () => {
      const glob = join(fixtures, '*.query.graphql');

      try {
        await load(glob, {
          loaders: [new GraphQLFileLoader()],
          errorHandling: 'aggregate',
        });
        expect(true).toBeFalsy();
      } catch (error: any) {
        expect(error).toBeInstanceOf(AggregateError);
        expect(error.errors.length).toBe(2);
        expect(error.errors.every((item: Error) => /Syntax Error/.test(item.message))).toBe(true);
      }
    });

    test('return keeps valid documents and failed sources', async () => {
      const glob = join(fixtures, '*.query.graphql');
      const result = await load(glob, {
        loaders: [new GraphQLFileLoader()],
        errorHandling: 'return',
      });

      const valid = result.filter(source => source.document);
      const failed = result.filter(source => source.error);

      expect(valid).toHaveLength(1);
      expect(valid[0].document?.definitions[0]).toMatchObject({
        kind: 'OperationDefinition',
        name: { value: 'ValidQuery' },
      });
      expect(failed).toHaveLength(2);
      expect(failed.every(source => source.document == null)).toBe(true);
      expect(failed.every(source => /Syntax Error/.test(source.error!.message))).toBe(true);
    });

    test('return does not throw NoTypeDefinitionsFound when every file failed', async () => {
      const glob = join(fixtures, 'broken-*.query.graphql');
      const result = await load(glob, {
        loaders: [new GraphQLFileLoader()],
        errorHandling: 'return',
      });

      expect(result).toHaveLength(2);
      expect(result.every(source => source.error != null)).toBe(true);
    });

    test('return includes a plucked code-file parse error', async () => {
      const result = await load(join(fixtures, 'broken.ts'), {
        loaders: [new CodeFileLoader()],
        errorHandling: 'return',
      });

      expect(result).toHaveLength(1);
      expect(result[0].document).toBeUndefined();
      expect(result[0].error).toBeDefined();
    });
  });
});
