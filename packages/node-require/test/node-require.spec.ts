import { readFileSync } from 'fs';
import { join } from 'path';
import { print } from 'graphql';
import { handleModule } from '../src/index.js';

describe('GraphQL Node Import', () => {
  it('should import correct definitions', () => {
    const filePath = './fixtures/test.graphql';
    const m: any = {};
    handleModule(m, join(__dirname, filePath));
    const typeDefs = m.exports;
    expect(print(typeDefs).replace(/\s\s+/g, ' ').trim()).toBe(
      readFileSync(require.resolve(filePath), 'utf8').replace(/\s\s+/g, ' ').trim(),
    );
  });
});
