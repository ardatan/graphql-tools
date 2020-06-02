import '../src';
import { print } from 'graphql';
import { readFileSync } from 'fs';

describe('GraphQL Node Import', () => {
  it.skip('should import correct definitions', () => {
    const filePath = './fixtures/test.graphql';
    const typeDefs = require(filePath);
    expect(print(typeDefs).replace(/\s\s+/g, ' ')).toBe(
      readFileSync(require.resolve(filePath), 'utf8').replace(/\s\s+/g, ' ')
    );
  });
});
