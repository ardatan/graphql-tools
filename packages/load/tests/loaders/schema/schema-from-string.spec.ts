import '../../../../testing/to-be-similar-string';
import '../../../../testing/to-be-similar-gql-doc';
import { printSchema } from 'graphql';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadSchema, loadSchemaSync } from '@graphql-tools/load';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { runTests, useMonorepo } from '../../../../testing/utils.js';

const monorepo = useMonorepo({
  dirname: __dirname,
});
describe('schema from string', () => {
  monorepo.correctCWD();

  runTests({
    async: loadSchema,
    sync: loadSchemaSync,
  })(load => {
    it('should load schema from string', async () => {
      const schemaString = /* GraphQL */ `
        type Query {
          book: String
        }
      `;
      const schema = await load(schemaString, {
        loaders: [],
      });
      const printedSchema = printSchema(schema);
      expect(printedSchema).toBeSimilarString(schemaString);
    });
    it('should load schema from string with schema definition', async () => {
      const schemaString = /* GraphQL */ `
        schema {
          query: Query
        }

        type Query {
          book: String
        }
      `;
      const schema = await load(schemaString, {
        loaders: [],
      });
      const printedSchema = printSchemaWithDirectives(schema);
      expect(printedSchema).toBeSimilarString(schemaString);
    });
    it('should load schema from string with schema definition and convertExtensions flag', async () => {
      const schemaString = /* GraphQL */ `
        extend schema {
          query: query_root
        }

        type Query {
          not_book: String
        }

        type query_root {
          book: String
        }
      `;
      const schema = await load(schemaString, {
        loaders: [],
        convertExtensions: true,
      });
      const printedSchema = printSchemaWithDirectives(schema);
      expect(printedSchema).toBeSimilarGqlDoc(/* GraphQL */ `
        schema {
          query: query_root
        }

        type Query {
          not_book: String
        }

        type query_root {
          book: String
        }
      `);
    });
    it('should throw parse error', async () => {
      const schemaString = `
     extend type Query {
      test(id: String!): Test
        @resolveTo(
          sourceName: "Test"
          sourceTypeName: "Test"
          sourceFieldName: "test"
          requiredSelectionSet: "{ ...on Test { id name } }",
          sourceArgs: { testId: {root.id} }
          returnType: Test
        )
    }
      `;
      await expect(
        load(schemaString, {
          loaders: [new GraphQLFileLoader()],
        }),
      ).rejects.toThrow('Syntax Error');
    });
  });
});
