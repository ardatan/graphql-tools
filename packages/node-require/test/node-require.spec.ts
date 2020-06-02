import { registerGraphQLExtensions } from '../src';
import { print } from 'graphql';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

describe('GraphQL Node Import', () => {
  it('should import correct definitions', () => {
    const require = createRequire(__dirname);
    registerGraphQLExtensions(require);
    const filePath = './fixtures/test.graphql';
    const typeDefs = require(filePath);
    expect(print(typeDefs).replace(/\s\s+/g, ' ')).toBe(
      readFileSync(require.resolve(filePath), 'utf8').replace(/\s\s+/g, ' ')
    );
  });
});
