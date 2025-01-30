import { isUrl, isValidPath } from '../src/helpers';

describe('helpers', () => {
  it.each([
    `schema @transport(subgraph: "API", kind: "rest", location: "http://0.0.0.0:4001", headers: "{\"Content-Type\":\"application/json\"}") {
      query: Query
      mutation: Mutation
      subscription: Subscription
    }`,
    `
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

describe('isUrl', () => {
  function testCases() {
    it.each([
      'https://example.com',
      'http://localhost:3000',
      'file:///path/to/file',
      'http://user:pass@host.com:8080/path?query=string#hash',
    ])('should validate valid URL: %s', url => {
      expect(isUrl(url)).toBe(true);
    });

    it.each(['not-a-url', 'invalid://host', 'http://[invalid]'])(
      'should reject invalid URL: %s',
      url => {
        expect(isUrl(url)).toBe(false);
      },
    );
  }
  describe('when URL.canParse is available', () => {
    const originalCanParse = URL.canParse;

    beforeAll(() => {
      // Mock URL.canParse
      URL.canParse = jest.fn((url: string) => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      });
    });

    afterAll(() => {
      // Restore original URL.canParse
      URL.canParse = originalCanParse;
    });
    testCases();
  });

  describe('when URL.canParse is not available', () => {
    const originalCanParse = URL.canParse;

    beforeAll(() => {
      // @ts-expect-error - Remove URL.canParse
      delete URL.canParse;
    });

    afterAll(() => {
      // Restore URL.canParse
      URL.canParse = originalCanParse;
    });
    testCases();
  });
});
