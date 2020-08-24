import { wrapSchema, RemoveObjectFieldDirectives } from '@graphql-tools/wrap';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('RemoveObjectFieldDirectives', () => {
  const originalSchema = makeExecutableSchema({
    typeDefs: `
      directive @alpha(arg: String) on FIELD_DEFINITION
      directive @bravo(arg: String) on FIELD_DEFINITION

      type Test {
        id: ID! @bravo(arg: "remove this")
        first: String! @alpha(arg: "do not remove")
        second: String! @alpha(arg: "remove this")
        third: String @alpha(arg: "remove this")
      }
    `
  });

  test('removes directives by name', async () => {
    const transformedSchema = wrapSchema(originalSchema, [
      new RemoveObjectFieldDirectives('alpha')
    ]);

    const fields = transformedSchema.getType('Test').getFields();
    expect(fields.id.astNode.directives.length).toEqual(1);
    expect(fields.first.astNode.directives.length).toEqual(0);
    expect(fields.second.astNode.directives.length).toEqual(0);
    expect(fields.third.astNode.directives.length).toEqual(0);
  });

  test('removes directives by name regex', async () => {
    const transformedSchema = wrapSchema(originalSchema, [
      new RemoveObjectFieldDirectives(/^alp/)
    ]);

    const fields = transformedSchema.getType('Test').getFields();
    expect(fields.id.astNode.directives.length).toEqual(1);
    expect(fields.first.astNode.directives.length).toEqual(0);
    expect(fields.second.astNode.directives.length).toEqual(0);
    expect(fields.third.astNode.directives.length).toEqual(0);
  });

  test('removes directives by argument', async () => {
    const transformedSchema = wrapSchema(originalSchema, [
      new RemoveObjectFieldDirectives(/.+/, { arg: 'remove this' })
    ]);

    const fields = transformedSchema.getType('Test').getFields();
    expect(fields.id.astNode.directives.length).toEqual(0);
    expect(fields.first.astNode.directives.length).toEqual(1);
    expect(fields.second.astNode.directives.length).toEqual(0);
    expect(fields.third.astNode.directives.length).toEqual(0);
  });

  test('removes directives by argument regex', async () => {
    const transformedSchema = wrapSchema(originalSchema, [
      new RemoveObjectFieldDirectives(/.+/, { arg: /remove/ })
    ]);

    const fields = transformedSchema.getType('Test').getFields();
    expect(fields.id.astNode.directives.length).toEqual(0);
    expect(fields.first.astNode.directives.length).toEqual(0);
    expect(fields.second.astNode.directives.length).toEqual(0);
    expect(fields.third.astNode.directives.length).toEqual(0);
  });
});
