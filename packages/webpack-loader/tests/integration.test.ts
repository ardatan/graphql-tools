import path from 'path';
import fs from 'fs';
import '../../testing/to-be-similar-gql-doc';
import loader from '../src/index';

test('support GraphQL Import when passing a file path', () => {
  const code = loader.call({cacheable() {}}, path.resolve(__dirname, './fixtures/query.graphql'));

  expect(code.startsWith('module.exports = ')).toBe(true);
  // Fragment Definition and Fragment Spread
  expect(code.split('chatFragment').length).toBe(3)
});

test('support GraphQL Import when passing file contents', () => {
  const code = loader.call({cacheable() {}}, fs.readFileSync(path.resolve(__dirname, './fixtures/query.graphql'), 'utf-8'));

  expect(code.startsWith('module.exports = ')).toBe(true);
  // Fragment Definition and Fragment Spread
  expect(code.split('chatFragment').length).toBe(3)
});
