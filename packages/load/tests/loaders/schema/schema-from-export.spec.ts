import { GraphQLSchema } from 'graphql';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { loadSchema, loadSchemaSync } from '@graphql-tools/load';
import { runTests, useMonorepo } from '../../../../testing/utils.js';

const monorepo = useMonorepo({
  dirname: __dirname,
});

function assertNonMaybe<T>(input: T): asserts input is Exclude<T, null | undefined> {
  if (input == null) {
    throw new Error('Value should be neither null nor undefined.');
  }
}

describe('Schema From Export', () => {
  monorepo.correctCWD();

  runTests({
    async: loadSchema,
    sync: loadSchemaSync,
  })((load, mode) => {
    it('should load the schema correctly from module.exports', async () => {
      const result = await load(
        '../../../../loaders/code-file/tests/test-files/loaders/module-exports.js',
        {
          loaders: [new CodeFileLoader()],
          cwd: __dirname,
        },
      );
      expect(result).toBeInstanceOf(GraphQLSchema);
    });

    it('should load the schema (with extend) correctly from module.exports', async () => {
      const result = await load(
        '../../../../loaders/code-file/tests/test-files/loaders/with-extend.js',
        {
          loaders: [new CodeFileLoader()],
          cwd: __dirname,
        },
      );
      expect(result).toBeInstanceOf(GraphQLSchema);
      const QueryType = result.getQueryType();
      assertNonMaybe(QueryType);
      expect(QueryType.getFields()['hello']).toBeDefined();
    });

    it('should load the schema correctly from variable export', async () => {
      const result = await load(
        '../../../../loaders/code-file/tests/test-files/loaders/schema-export.js',
        {
          loaders: [new CodeFileLoader()],
          cwd: __dirname,
        },
      );
      expect(result).toBeInstanceOf(GraphQLSchema);
    });

    it('should load the schema correctly from default export', async () => {
      const result = await load(
        '../../../../loaders/code-file/tests/test-files/loaders/default-export.js',
        {
          loaders: [new CodeFileLoader()],
          cwd: __dirname,
        },
      );
      expect(result).toBeInstanceOf(GraphQLSchema);
    });

    if (mode === 'async') {
      it('should load the schema correctly from promise export', async () => {
        const result = await load(
          '../../../../loaders/code-file/tests/test-files/loaders/promise-export.js',
          {
            loaders: [new CodeFileLoader()],
            cwd: __dirname,
          },
        );
        expect(result).toBeInstanceOf(GraphQLSchema);
      });

      it('should load the schema correctly from promise export', async () => {
        const result = await load(
          '../../../../loaders/code-file/tests/test-files/loaders/promise-export.js',
          {
            loaders: [new CodeFileLoader()],
            cwd: __dirname,
          },
        );
        expect(result).toBeInstanceOf(GraphQLSchema);
      });
    }

    it('should work with extensions (without schema definition)', async () => {
      const schemaPath = './test-files/schema-dir/extensions/export-schema.js';
      const schema = await load(schemaPath, {
        loaders: [new CodeFileLoader()],
        cwd: __dirname,
      });
      const QueryType = schema.getQueryType();
      assertNonMaybe(QueryType);
      const queryFields = Object.keys(QueryType.getFields());

      expect(queryFields).toContain('foo');
      expect(queryFields).toContain('bar');
    });

    it('should work with extensions (with schema definition)', async () => {
      const schemaPath = './test-files/schema-dir/extensions/export-schema-with-def.js';
      const schema = await load(schemaPath, {
        loaders: [new CodeFileLoader()],
        cwd: __dirname,
      });
      const QueryType = schema.getQueryType();
      assertNonMaybe(QueryType);
      const queryFields = Object.keys(QueryType.getFields());

      expect(queryFields).toContain('foo');
      expect(queryFields).toContain('bar');
    });
  });
});
