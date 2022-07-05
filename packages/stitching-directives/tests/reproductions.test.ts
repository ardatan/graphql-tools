import { buildSchema, GraphQLObjectType } from 'graphql';
import { stitchSchemas } from '@graphql-tools/stitch';
import { stitchingDirectives } from '../src';

describe('Reproductions for issues', () => {
  it('issue #4554', () => {
    const { allStitchingDirectivesTypeDefs, stitchingDirectivesTransformer } = stitchingDirectives();
    const schema1 = buildSchema(/* GraphQL */ `
      ${allStitchingDirectivesTypeDefs}
      scalar ItemId
      scalar ItemId2
      scalar AField

      type Query {
        item(itemId: ItemId!, itemId2: ItemId2!): Item!
      }
      type Item @key(selectionSet: "{ itemId itemId2 }") {
        itemId: ItemId!
        itemId2: ItemId2!
        aField: AField
      }
    `);

    const schema2 = buildSchema(/* GraphQL */ `
      ${allStitchingDirectivesTypeDefs}
      scalar ItemId
      scalar ItemId2
      scalar AField

      type Query {
        _item(input: ItemInput!): Item
      }

      input ItemInput {
        itemId: ItemId!
        itemId2: ItemId2!
        aField: AField
      }

      type Item @key(selectionSet: "{ itemId itemId2 }") {
        itemId: ItemId!
        itemId2: ItemId2!

        giftOptionsList: [GiftOptions] @computed(selectionSet: "{ itemId aField }")
      }

      type GiftOptions {
        someOptions: [String]
      }
    `);
    const stitchedSchema = stitchSchemas({
      subschemas: [schema1, schema2],
      subschemaConfigTransforms: [stitchingDirectivesTransformer],
    });
    const giftOptionsType = stitchedSchema.getType('GiftOptions') as GraphQLObjectType;
    const giftOptionsTypeFields = giftOptionsType.getFields();
    expect(giftOptionsTypeFields['someOptions']).toBeDefined();
  });
});
