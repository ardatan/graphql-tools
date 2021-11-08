import { loadSchema, loadSchemaSync } from '@graphql-tools/load';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { printSchema, buildSchema } from 'graphql';
import { runTests, useMonorepo } from '../../../../testing/utils';
import '../../../../testing/to-be-similar-gql-doc';

const monorepo = useMonorepo({
  dirname: __dirname,
});

describe('loadSchema', () => {
  monorepo.correctCWD();

  runTests({
    async: loadSchema,
    sync: loadSchemaSync,
  })(load => {
    test('should throw when all files are invalid and unable to load it', async () => {
      const schemaPath = './tests/loaders/schema/test-files/error.ts';
      try {
        await load(schemaPath, {
          loaders: [new CodeFileLoader()],
        });
        expect(true).toBeFalsy(); // should throw
      } catch (e: any) {
        expect(e.toString()).toContain(`SyntaxError`);
      }
    });

    test('should work with ts files and without globs correctly', async () => {
      const schemaPath = './tests/loaders/schema/test-files/schema-dir/type-defs/graphql-tag.ts';
      const schema = await load(schemaPath, {
        loaders: [new CodeFileLoader()],
      });
      expect(schema.getTypeMap()['User']).toBeDefined();
      expect(schema.getTypeMap()['Query']).toBeDefined();
    });

    test('should work with graphql single file', async () => {
      const schemaPath = './tests/loaders/schema/test-files/schema-dir/user.graphql';
      const schema = await load(schemaPath, {
        loaders: [new GraphQLFileLoader()],
      });

      expect(schema.getTypeMap()['User']).toBeDefined();
    });

    test('import and merge Query types from few different files', async () => {
      const schema = await load('../import/tests/schema/fixtures/multiple-root/*/schema.graphql', {
        loaders: [new GraphQLFileLoader()],
      });
      const schemaStr = printSchema(schema);

      expect(schemaStr).toBeSimilarGqlDoc(/* GraphQL */ `
        type Query {
          a: A
          b: B
          c: C
        }

        type A {
          text: String
        }

        type B {
          text: String
        }

        type C {
          text: String
        }
      `);
    });

    test('should sort the final schema if "sort" option provided', async () => {
      const schemaPath = './tests/loaders/schema/test-files/schema-dir/non-sorted.graphql';
      const schema = await load(schemaPath, {
        loaders: [new GraphQLFileLoader()],
        sort: true,
      });
      expect(printSchema(schema)).toBeSimilarGqlDoc(/* GraphQL */ `
        type A {
          b: String
          s: String
        }

        type Query {
          a: String
          d: String
          z: String
        }

        type User {
          a: String
          aa: String
        }
      `);
    });

    test('should add schemas from options.schemas to generated schema', async () => {
      const schemaPath = './tests/loaders/schema/test-files/schema-dir/non-sorted.graphql';
      const schema = await load(schemaPath, {
        loaders: [new GraphQLFileLoader()],
        sort: true,
        schemas: [buildSchema(`scalar DateTime`)],
      });
      expect(printSchema(schema)).toBeSimilarGqlDoc(/* GraphQL */ `
        scalar DateTime

        type A {
          b: String
          s: String
        }

        type Query {
          a: String
          d: String
          z: String
        }

        type User {
          a: String
          aa: String
        }
      `);
    });
  });
});
