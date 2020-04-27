import { loadSchema, loadSchemaSync } from '@graphql-tools/core';
import { JsonFileLoader } from '@graphql-tools/json-file-loader';
import { isSchema, GraphQLObjectType, GraphQLInterfaceType } from 'graphql';
import { runTests, useMonorepo } from '../../../../testing/utils';

const monorepo = useMonorepo({
  dirname: __dirname,
});

describe('Schema From Export', () => {
  monorepo.correctCWD();

  runTests({
    async: loadSchema,
    sync: loadSchemaSync
  })(load => {
    it('should load the schema correctly from an introspection file', async () => {
      const schema = await load('./tests/loaders/schema/test-files/githunt.json', {
        loaders: [new JsonFileLoader()]
      });
      expect(isSchema(schema)).toBeTruthy();
    });
    it('should load the schema with correct descriptions', async () => {
      const schema = await load('./tests/loaders/schema/test-files/githunt.json', {
        loaders: [new JsonFileLoader()]
      });
      expect(isSchema(schema)).toBeTruthy();
      const introspectionSchema = require('./test-files/githunt.json').__schema;
      for (const typeName in schema.getTypeMap()) {
        const type = schema.getType(typeName);
        const introspectionType = introspectionSchema.types.find((t: { name: string; }) => t.name === typeName);
        if (type.description || introspectionType.description) {
          expect(type.description).toBe(introspectionType.description);
        }
        if (!typeName.startsWith('__') && (type instanceof GraphQLObjectType || type instanceof GraphQLInterfaceType)) {
          const fieldMap = type.getFields();
          for (const fieldName in fieldMap) {
            const field = fieldMap[fieldName];
            const introspectionField = introspectionType.fields.find((f: { name: string; }) => f.name === fieldName);
            if (field.description || introspectionField.description) {
              expect(field.description.trim()).toBe(introspectionField.description.trim());
            }
          }
        }
      }
    });
  })
});
