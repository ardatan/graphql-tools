import { loadDocuments, loadDocumentsSync } from '@graphql-tools/load';
import { join } from 'path';
import { parse, separateOperations } from 'graphql';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { runTests } from '../../../../testing/utils.js';
import '../../../../testing/to-be-similar-string';
import globby from 'globby';
import { readFileSync } from 'fs';
import { removeLoc } from '@graphql-tools/optimize';

describe('documentsFromGlob', () => {
  runTests({
    async: loadDocuments,
    sync: loadDocumentsSync,
  })(load => {
    test(`Should load one GraphQL document from glob expression`, async () => {
      const glob = join(__dirname, 'test-files', '*.query.graphql');
      const result = await load(glob, {
        loaders: [new GraphQLFileLoader()],
      });
      expect(result).toHaveLength(1);
      const expectedFiles = globby.sync(glob);
      for (const expectedFileName of expectedFiles) {
        const fileNameResult = result?.find(({ location }) => location === expectedFileName);
        if (fileNameResult) {
          const fileContent = readFileSync(expectedFileName, 'utf-8');
          const expectedDocument: any = parse(fileContent);
          expect(removeLoc(fileNameResult!.document!)).toStrictEqual(removeLoc(expectedDocument));
          expect(fileNameResult!.rawSDL!).toBeSimilarString(fileContent);
        }
      }
    });

    test(`Should load multiple GraphQL document from glob expression`, async () => {
      const glob = join(__dirname, 'test-files', '*.graphql');
      const result = await load(glob, {
        loaders: [new GraphQLFileLoader()],
      });
      expect(result).toHaveLength(2);
      const expectedFiles = globby.sync(glob);
      for (const expectedFileName of expectedFiles) {
        const fileNameResult = result?.find(({ location }) => location === expectedFileName);
        if (fileNameResult) {
          const fileContent = readFileSync(expectedFileName, 'utf-8');
          const expectedDocument: any = parse(fileContent);
          expect(removeLoc(fileNameResult!.document!)).toStrictEqual(removeLoc(expectedDocument));
          expect(fileNameResult!.rawSDL!).toBeSimilarString(fileContent);
        }
      }
    });

    test(`Should load two GraphQL operations both for gatsby and graphql-tag by default`, async () => {
      const glob = join(__dirname, 'test-files', 'tags.js');
      const result = await load(glob, {
        loaders: [new CodeFileLoader()],
      });

      expect(result).toHaveLength(2);
    });

    test(`Should load GraphQL operations that match custom settings`, async () => {
      const glob = join(__dirname, 'test-files', 'tags.js');

      const result = await load(glob, {
        pluckConfig: {
          modules: [
            {
              name: 'parse-graphql',
              identifier: 'parse',
            },
          ],
          globalGqlIdentifierName: 'somethingElse',
        },
        loaders: [new CodeFileLoader()],
      });

      expect(result[0]?.document).toBeDefined();
      expect(Object.keys(separateOperations(result[0].document!))).toHaveLength(1);
    });

    test(`Should throw on syntax errors`, async () => {
      try {
        const glob = join(__dirname, 'test-invalid-syntax', 'invalid-syntax.query.graphql');
        await load(glob, {
          loaders: [new GraphQLFileLoader()],
        });
        expect(true).toBeFalsy();
      } catch (e: any) {
        expect(e).toBeDefined();
        expect(e.message).toContain('Syntax Error');
      }
    });

    test(`Should throw on empty files and empty result`, async () => {
      try {
        const glob = join(__dirname, 'test-files', '*.empty.graphql');
        await load(glob, {
          loaders: [new GraphQLFileLoader()],
        });
        expect(true).toBeFalsy();
      } catch (e: any) {
        expect(e).toBeDefined();
      }
    });

    test(`Should throw on invalid files`, async () => {
      try {
        const glob = join(__dirname, 'test-files', 'invalid*.*.graphql');
        await load(glob, {
          loaders: [new GraphQLFileLoader()],
        });
        expect(true).toBeFalsy();
      } catch (e: any) {
        expect(e).toBeDefined();
      }
    });

    test(`Should ignore schema definitions`, async () => {
      const glob = join(__dirname, 'test-files', '*.graphql');
      const result = await load(glob, {
        loaders: [new GraphQLFileLoader()],
      });
      expect(result.length).toBe(2);
    });

    test(`Should ignore files that is added to ignore glob (using options.ignore)`, async () => {
      const glob = join(__dirname, 'test-files', '*.graphql');
      const ignoreGlob = join(__dirname, 'test-files', '*.query.graphql');
      const result = await load([glob], {
        ignore: ignoreGlob,
        loaders: [new GraphQLFileLoader()],
      });
      expect(result.length).toBe(1);
    });

    test(`Should ignore files that is added to ignore glob (using negative glob)`, async () => {
      const glob = join(__dirname, 'test-files', '*.graphql');
      const ignoreGlob = `!${join(__dirname, 'test-files', '*.query.graphql')}`;
      const result = await load([glob, ignoreGlob], {
        loaders: [new GraphQLFileLoader()],
      });
      expect(result.length).toBe(1);
    });

    test(`should respect brackets in file path`, async () => {
      const glob = join(__dirname, 'test-with-brackets', '**/*.ts');
      const result = await load(glob, {
        loaders: [new CodeFileLoader()],
      });
      expect(result.length).toBe(1);
    });
    test(`should try next loader if first one fails`, async () => {
      const glob = join(__dirname, 'test-with-brackets', '**/*.ts');
      const result = await load(glob, {
        loaders: [new GraphQLFileLoader(), new CodeFileLoader()],
      });
      expect(result.length).toBe(1);
    });
    test(`should try loading using all loaders`, async () => {
      const glob = join(__dirname, 'test-files', '(tags.js|2.graphql)');
      const result = await load(glob, {
        loaders: [new GraphQLFileLoader(), new CodeFileLoader()],
      });
      // 1 from 2.graphql
      // 2 from tags.js
      expect(result.length).toEqual(3);
    });
    test(`should pass custom loader context to the custom loader correctly`, async () => {
      const customLoaderContext = {
        loaderType: 'documents',
      };
      const pointerOptions = {
        loader: join(__dirname, '../../custom-loader.js'),
        fooFieldName: 'myFooField',
      };
      const result = await load(
        {
          pointer: pointerOptions,
        },
        {
          loaders: [],
          customLoaderContext,
        }
      );
      expect(result).toHaveLength(1);
      expect(result[0].rawSDL).toContain(pointerOptions.fooFieldName);
    });
    test('should work only with a document string', async () => {
      const result = await load('query { foo }', {
        loaders: [],
      });
      expect(result).toHaveLength(1);
    });
  });
});
