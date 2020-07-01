import path from 'path';
import '../../testing/to-be-similar-gql-doc';
import loader from '../src/index';

test('support GraphQL Import when passing a file path', () => {
  const code = loader.call({cacheable() {}, resourcePath: path.resolve(__dirname, './fixtures/query.graphql')});

  expect(code.startsWith('module.exports = ')).toBe(true);
  // Fragment Definition and Fragment Spread
  expect(code.split('chatFragment').length).toBe(3)
});
