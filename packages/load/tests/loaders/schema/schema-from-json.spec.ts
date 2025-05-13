import { readFileSync } from 'fs';
import { join } from 'path';
import { GraphQLSchema } from 'graphql';
import { JsonFileLoader } from '@graphql-tools/json-file-loader';
import { loadSchema, loadSchemaSync } from '@graphql-tools/load';
import { isSpecifiedScalarType } from '@graphql-tools/utils';
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
  })(load => {
    it('should load the schema correctly from an introspection file', async () => {
      const schema = await load('./test-files/githunt.json', {
        loaders: [new JsonFileLoader()],
        cwd: __dirname,
      });
      expect(schema).toBeInstanceOf(GraphQLSchema);
    });
    it('should load the schema with correct descriptions', async () => {
      const schema = await load('./test-files/githunt.json', {
        loaders: [new JsonFileLoader()],
        cwd: __dirname,
      });
      expect(schema).toBeInstanceOf(GraphQLSchema);
      for (const typeName in schema.getTypeMap()) {
        const githuntJsonFile = readFileSync(join(__dirname, './test-files/githunt.json'), 'utf-8');
        const introspectionSchema = JSON.parse(githuntJsonFile).__schema;
        if (!typeName.startsWith('__')) {
          const type = schema.getType(typeName);
          if (type != null && isSpecifiedScalarType(type)) {
            continue;
          }
          assertNonMaybe(type);
          const introspectionType = introspectionSchema.types.find(
            (t: { name: string }) => t.name === typeName,
          );
          if (type.description || introspectionType.description) {
            expect(type.description).toBe(introspectionType.description);
          }
          if ('getFields' in type) {
            const fieldMap = type.getFields();
            for (const fieldName in fieldMap) {
              const field = fieldMap[fieldName];
              const introspectionField = introspectionType.fields.find(
                (f: { name: string }) => f.name === fieldName,
              );
              if (field.description || introspectionField.description) {
                assertNonMaybe(field.description);
                expect(field.description.trim()).toBe(introspectionField.description.trim());
              }
            }
          }
        }
      }
    });
  });
});
