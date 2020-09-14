import { buildSchema } from 'graphql';

import { pruneSchema } from '../src/prune';

describe('prune', () => {
  test('can handle recursive input types', () => {
    const schema = buildSchema(`
      input Input {
        moreInput: Input
      }

      type Query {
        someQuery(input: Input): Boolean
      }
      `);
    pruneSchema(schema);
  });
});
