import { wrapSchema, RemoveObjectFieldsWithDeprecation } from '@graphql-tools/wrap';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('RemoveObjectFieldsWithDeprecation', () => {
  const originalSchema = makeExecutableSchema({
    typeDefs: `
      type Test {
        id: ID!
        first: String! @deprecated(reason: "do not remove")
        second: String! @deprecated(reason: "remove this")
      }
    `
  });

  test('removes deprecated fields by reason', async () => {
    const transformedSchema = wrapSchema(originalSchema, [
      new RemoveObjectFieldsWithDeprecation('remove this')
    ]);

    const fields = transformedSchema.getType('Test').getFields();
    expect(fields.first).toBeDefined();
    expect(fields.second).toBeUndefined();
  });

  test('removes deprecated fields by reason regex', async () => {
    const transformedSchema = wrapSchema(originalSchema, [
      new RemoveObjectFieldsWithDeprecation(/remove/)
    ]);

    const fields = transformedSchema.getType('Test').getFields();
    expect(fields.first).toBeUndefined();
    expect(fields.second).toBeUndefined();
  });
});
