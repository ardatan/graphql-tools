import { wrapSchema, RemoveObjectFieldDeprecations } from '@graphql-tools/wrap';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('RemoveObjectFieldDeprecations', () => {
  const originalSchema = makeExecutableSchema({
    typeDefs: `
      type Test {
        id: ID!
        first: String! @deprecated(reason: "do not remove")
        second: String! @deprecated(reason: "remove this")
      }
    `
  });

  test('removes deprecations by reason', async () => {
    const transformedSchema = wrapSchema(originalSchema, [
      new RemoveObjectFieldDeprecations('remove this')
    ]);

    const fields = transformedSchema.getType('Test').getFields();
    expect(fields.first.deprecationReason).toEqual('do not remove');
    expect(fields.second.deprecationReason).toBeUndefined();
    expect(fields.first.astNode.directives.length).toEqual(1);
    expect(fields.second.astNode.directives.length).toEqual(0);
  });

  test('removes deprecations by reason regex', async () => {
    const transformedSchema = wrapSchema(originalSchema, [
      new RemoveObjectFieldDeprecations(/remove/)
    ]);

    const fields = transformedSchema.getType('Test').getFields();
    expect(fields.first.deprecationReason).toBeUndefined();
    expect(fields.second.deprecationReason).toBeUndefined();
    expect(fields.first.astNode.directives.length).toEqual(0);
    expect(fields.second.astNode.directives.length).toEqual(0);
  });
});
