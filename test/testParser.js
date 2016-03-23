// import { readFile } from 'fs';
import { parse, SyntaxError } from '../src/shorthandParser.js';
import { assert, expect } from 'chai';

// read test.gql file
/* readFile('./test/discourse-api/schema.gql','utf8', (err, data) => {
  if (err) throw err;
  console.log( JSON.stringify(parse(data)));
}); */


describe('parsing graphql shorthand', () => {
  it('can parse a valid schema', () => {
    const schema = `
      //Make birds great again!
      type BirdSpecies {
        name: String!,
        wingspan: Int
      }
    `;

    const solution = [{
      type: 'TYPE',
      name: 'BirdSpecies',
      description: 'Make birds great again!',
      fields: {
        name: {
          type: 'String',
          required: true,
        },
        wingspan: {
          type: 'Int',
        },
      },
    }];

    const result = parse(schema);

    assert.deepEqual(result, solution);
  });

  it('throws a useful error if the schema is invalid', () => {
    const schema = `
      //A comment
      notValid Something{
        name: String!,
      }
    `;

    expect(parse.bind(null, schema)).to.throw(SyntaxError);
  });
});
