import { wrapSchema, RemoveDeprecations } from '@graphql-tools/wrap';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('RemoveDeprecations', () => {
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
      new RemoveDeprecations('remove this')
    ]);

    const fields = transformedSchema.getType('Test').getFields();
    expect(fields.first.deprecationReason).toEqual('do not remove');
    expect(fields.second.deprecationReason).toBeUndefined();
    expect(fields.first.astNode.directives.length).toEqual(1);
    expect(fields.second.astNode.directives.length).toEqual(0);
  });

  test('removes directives by name regex', async () => {
    const transformedSchema = wrapSchema(originalSchema, [
      new RemoveDeprecations(/remove/)
    ]);

    const fields = transformedSchema.getType('Test').getFields();
    expect(fields.first.deprecationReason).toBeUndefined();
    expect(fields.second.deprecationReason).toBeUndefined();
    expect(fields.first.astNode.directives.length).toEqual(0);
    expect(fields.second.astNode.directives.length).toEqual(0);
  });
});
