import { wrapSchema, RemoveObjectFieldsWithDirective } from '@graphql-tools/wrap';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('RemoveObjectFieldsWithDirective', () => {
  const originalSchema = makeExecutableSchema({
    typeDefs: `
      directive @alpha(arg: String) on FIELD_DEFINITION
      directive @bravo(arg: String) on FIELD_DEFINITION

      type Test {
        id: ID!
        first: String! @alpha(arg: "do not remove")
        second: String! @alpha(arg: "remove this")
        third: String @alpha(arg: "remove this")
        fourth: String @bravo(arg: "remove this")
      }
    `
  });

  test('removes directive fields by name', async () => {
    const transformedSchema = wrapSchema(originalSchema, [
      new RemoveObjectFieldsWithDirective('alpha')
    ]);

    const fields = transformedSchema.getType('Test').getFields();
    expect(fields.first).toBeUndefined();
    expect(fields.second).toBeUndefined();
    expect(fields.third).toBeUndefined();
    expect(fields.fourth).toBeDefined();
  });

  test('removes directive fields by name regex', async () => {
    const transformedSchema = wrapSchema(originalSchema, [
      new RemoveObjectFieldsWithDirective(/^alp/)
    ]);

    const fields = transformedSchema.getType('Test').getFields();
    expect(fields.first).toBeUndefined();
    expect(fields.second).toBeUndefined();
    expect(fields.third).toBeUndefined();
    expect(fields.fourth).toBeDefined();
  });

  test('removes directive fields by argument', async () => {
    const transformedSchema = wrapSchema(originalSchema, [
      new RemoveObjectFieldsWithDirective(/.+/, { arg: 'remove this' })
    ]);

    const fields = transformedSchema.getType('Test').getFields();
    expect(fields.first).toBeDefined();
    expect(fields.second).toBeUndefined();
    expect(fields.third).toBeUndefined();
    expect(fields.third).toBeUndefined();
  });

  test('removes directive fields by argument regex', async () => {
    const transformedSchema = wrapSchema(originalSchema, [
      new RemoveObjectFieldsWithDirective(/.+/, { arg: /remove/ })
    ]);

    const fields = transformedSchema.getType('Test').getFields();
    expect(fields.first).toBeUndefined();
    expect(fields.second).toBeUndefined();
    expect(fields.third).toBeUndefined();
    expect(fields.third).toBeUndefined();
  });
});
