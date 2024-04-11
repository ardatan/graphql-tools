import { isValidPath } from '../src/helpers';

describe('helpers', () => {
  it.each([
    `schema @transport(subgraph: "API", kind: "rest", location: "http://0.0.0.0:4001", headers: "{\"Content-Type\":\"application/json\"}") {
      query: Query
      mutation: Mutation
      subscription: Subscription
    }`,
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
