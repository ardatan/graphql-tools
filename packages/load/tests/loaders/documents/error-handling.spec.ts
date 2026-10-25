import { join } from 'path';
import { GraphQLError } from 'graphql';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadDocuments, loadDocumentsSync } from '@graphql-tools/load';
import { runTests } from '../../../../testing/utils.js';

const fixtures = join(__dirname, 'test-error-handling');
const graphqlGlob = join(fixtures, '*.query.graphql');
const codeGlob = join(fixtures, '*.ts');

function operationName(source: { document?: { definitions: readonly any[] } | null }) {
  const def = source.document?.definitions[0];
  return def?.kind === 'OperationDefinition' ? def.name?.value : undefined;
}

describe('loadDocuments errorHandling', () => {
  runTests({
    async: loadDocuments,
    sync: loadDocumentsSync,
  })(load => {
    describe('GraphQLFileLoader', () => {
      test('default throw raises the first parse error and drops the valid file', async () => {
        await expect(
          load(graphqlGlob, {
            loaders: [new GraphQLFileLoader()],
          }),
        ).rejects.toThrow(/Syntax Error/);
      });

      test('explicit throw matches the default', async () => {
        await expect(
          load(graphqlGlob, {
            loaders: [new GraphQLFileLoader()],
            errorHandling: 'throw',
          }),
        ).rejects.toThrow(/Syntax Error/);
      });

      test('aggregate throws AggregateError with every parse failure', async () => {
        try {
          await load(graphqlGlob, {
            loaders: [new GraphQLFileLoader()],
            errorHandling: 'aggregate',
          });
          expect(true).toBeFalsy();
        } catch (error: any) {
          expect(error).toBeInstanceOf(AggregateError);
          expect(error.errors).toHaveLength(2);
          expect(error.errors.every((item: Error) => item instanceof GraphQLError)).toBe(true);
          expect(error.errors.every((item: Error) => /Syntax Error/.test(item.message))).toBe(true);
        }
      });

      test('return keeps the valid document and failed sources without a document', async () => {
        const result = await load(graphqlGlob, {
          loaders: [new GraphQLFileLoader()],
          errorHandling: 'return',
        });

        const valid = result.filter(source => source.document);
        const failed = result.filter(source => source.error);

        expect(operationName(valid[0])).toBe('ValidQuery');
        expect(valid).toHaveLength(1);
        expect(failed).toHaveLength(2);
        expect(failed.every(source => source.document == null)).toBe(true);
        expect(failed.every(source => source.error instanceof GraphQLError)).toBe(true);
        expect(failed.some(source => source.location?.endsWith('broken-a.query.graphql'))).toBe(
          true,
        );
        expect(failed.some(source => source.location?.endsWith('broken-b.query.graphql'))).toBe(
          true,
        );
      });
    });

    describe('CodeFileLoader', () => {
      test('default still skips a broken file when another file parsed', async () => {
        const result = await load(codeGlob, {
          loaders: [new CodeFileLoader()],
        });

        expect(result).toHaveLength(1);
        expect(operationName(result[0])).toBe('ValidFromCode');
      });

      test('throw raises the first code-file parse error', async () => {
        await expect(
          load(codeGlob, {
            loaders: [new CodeFileLoader()],
            errorHandling: 'throw',
          }),
        ).rejects.toThrow(/Syntax Error/);
      });

      test('aggregate throws AggregateError for every broken code file', async () => {
        try {
          await load(codeGlob, {
            loaders: [new CodeFileLoader()],
            errorHandling: 'aggregate',
          });
          expect(true).toBeFalsy();
        } catch (error: any) {
          expect(error).toBeInstanceOf(AggregateError);
          expect(error.errors).toHaveLength(1);
          expect(error.errors[0]).toBeInstanceOf(GraphQLError);
          expect(error.errors[0].message).toMatch(/Syntax Error/);
        }
      });

      test('return keeps the valid code document and a failed source', async () => {
        const result = await load(codeGlob, {
          loaders: [new CodeFileLoader()],
          errorHandling: 'return',
        });

        const valid = result.filter(source => source.document);
        const failed = result.filter(source => source.error);

        expect(valid).toHaveLength(1);
        expect(operationName(valid[0])).toBe('ValidFromCode');
        expect(failed).toHaveLength(1);
        expect(failed[0].document).toBeUndefined();
        expect(failed[0].error).toBeInstanceOf(GraphQLError);
        expect(failed[0].location?.endsWith('broken.ts')).toBe(true);
      });
    });

    describe('GraphQLFileLoader and CodeFileLoader together', () => {
      const pointers = [graphqlGlob, codeGlob];
      const loaders = [new GraphQLFileLoader(), new CodeFileLoader()];

      test('throw raises a parse error from one of the loaders', async () => {
        await expect(
          load(pointers, {
            loaders,
            errorHandling: 'throw',
          }),
        ).rejects.toThrow(/Syntax Error/);
      });

      test('aggregate collects parse errors from both loaders', async () => {
        try {
          await load(pointers, {
            loaders,
            errorHandling: 'aggregate',
          });
          expect(true).toBeFalsy();
        } catch (error: any) {
          expect(error).toBeInstanceOf(AggregateError);
          expect(error.errors).toHaveLength(3);
          expect(error.errors.every((item: Error) => item instanceof GraphQLError)).toBe(true);
        }
      });

      test('return keeps documents from both loaders and failed sources from both', async () => {
        const result = await load(pointers, {
          loaders,
          errorHandling: 'return',
        });

        const names = result
          .filter(source => source.document)
          .map(operationName)
          .sort();
        const failed = result.filter(source => source.error);

        expect(names).toEqual(['ValidFromCode', 'ValidQuery']);
        expect(failed).toHaveLength(3);
        expect(failed.every(source => source.document == null)).toBe(true);
        expect(failed.every(source => source.error instanceof GraphQLError)).toBe(true);
        expect(failed.map(source => source.location?.split('/').pop()).sort()).toEqual([
          'broken-a.query.graphql',
          'broken-b.query.graphql',
          'broken.ts',
        ]);
      });
    });

    describe('document string pointer', () => {
      const brokenInline = 'query Foo { foo @ }';

      test('throw raises a parse error from an inline document', async () => {
        await expect(
          load(brokenInline, {
            loaders: [],
            errorHandling: 'throw',
          }),
        ).rejects.toThrow(/Syntax Error|Failed to parse the GraphQL document/);
      });

      test('return includes the inline parse error without a document', async () => {
        const result = await load(brokenInline, {
          loaders: [],
          errorHandling: 'return',
        });

        expect(result).toHaveLength(1);
        expect(result[0].document).toBeUndefined();
        expect(result[0].error).toBeDefined();
        expect(result[0].error?.message).toMatch(
          /Syntax Error|Failed to parse the GraphQL document/,
        );
      });
    });

    test('return does not throw NoTypeDefinitionsFound when every file failed', async () => {
      const result = await load(join(fixtures, 'broken-*.query.graphql'), {
        loaders: [new GraphQLFileLoader()],
        errorHandling: 'return',
      });

      expect(result).toHaveLength(2);
      expect(result.every(source => source.document == null && source.error != null)).toBe(true);
    });
  });
});
