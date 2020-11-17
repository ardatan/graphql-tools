import { makeExecutableSchema, stitchingDirectives } from "../src";

describe('stitchingDirectives', () => {
  const { stitchingDirectiveTypeDefs, stitchingDirectivesTransformer } = stitchingDirectives();

  test('throws an error if selectionSet invalid', () => {
    const typeDefs = `
      ${stitchingDirectiveTypeDefs}
      type Query {
        User: User
      }

      type User @base(selectionSet: "* invalid selection set *") {
        id: ID
        name: String
      }
    `;

    expect(() => makeExecutableSchema({ typeDefs })).not.toThrowError();
    expect(() => makeExecutableSchema({ typeDefs, schemaTransforms: [stitchingDirectivesTransformer] })).toThrowError();
  });
});
