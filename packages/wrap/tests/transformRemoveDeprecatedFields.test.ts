import { wrapSchema, RemoveDeprecatedFields } from '@graphql-tools/wrap';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('RemoveDeprecatedFields', () => {
  const originalSchema = makeExecutableSchema({
    typeDefs: `
      type Test {
        id: ID!
        first: String! @deprecated(reason: "do not remove")
        second: String! @deprecated(reason: "remove this")
      }
    `
  });

  test('removes directives by name', async () => {
    const transformedSchema = wrapSchema(originalSchema, [
      new RemoveDeprecatedFields('remove this')
    ]);

    const fields = transformedSchema.getType('Test').getFields();
    expect(fields.first).toBeDefined();
    expect(fields.second).toBeUndefined();
  });

  test('removes directives by name regex', async () => {
    const transformedSchema = wrapSchema(originalSchema, [
      new RemoveDeprecatedFields(/remove/)
    ]);

    const fields = transformedSchema.getType('Test').getFields();
    expect(fields.first).toBeUndefined();
    expect(fields.second).toBeUndefined();
  });
});
