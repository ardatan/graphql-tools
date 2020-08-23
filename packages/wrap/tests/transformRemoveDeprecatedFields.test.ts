import { wrapSchema, RemoveFieldsWithDeprecation } from '@graphql-tools/wrap';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('RemoveFieldsWithDeprecation', () => {
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
      new RemoveFieldsWithDeprecation('remove this')
    ]);

    const fields = transformedSchema.getType('Test').getFields();
    expect(fields.first).toBeDefined();
    expect(fields.second).toBeUndefined();
  });

  test('removes deprecated fields by reason regex', async () => {
    const transformedSchema = wrapSchema(originalSchema, [
      new RemoveFieldsWithDeprecation(/remove/)
    ]);

    const fields = transformedSchema.getType('Test').getFields();
    expect(fields.first).toBeUndefined();
    expect(fields.second).toBeUndefined();
  });
});
