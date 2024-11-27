import { isValidPath } from '../src/helpers';

describe('helpers', () => {
  it.each([
    `schema @transport(subgraph: "API", kind: "rest", location: "http://0.0.0.0:4001", headers: "{\"Content-Type\":\"application/json\"}") {
      query: Query
      mutation: Mutation
      subscription: Subscription
    }`,
    /* GraphQL*/ `
     extend type Query {
      test(id: String!): Test
        @resolveTo(
          sourceName: "Test"
          sourceTypeName: "Test"
          sourceFieldName: "test"
          requiredSelectionSet: "{ ...on Test { id name } }",
          sourceArgs: { testId: {root.id} }
          returnType: Test
        )
    }
    `,
  ])('should detect "%s" as NOT a valid path', str => {
    expect(isValidPath(str)).toBeFalsy();
  });

  it.each(['file', 'file.tsx', 'some/where/file.tsx', '/some/where/file.tsx'])(
    'should detect "%s" as a valid path',
    str => {
      expect(isValidPath(str)).toBeTruthy();
    },
  );
});
