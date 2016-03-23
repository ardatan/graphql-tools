// import { readFile } from 'fs';
import { generateSchema } from '../src/schemaGenerator.js';
import { assert } from 'chai';
import { graphql } from 'graphql';

// read test.gql file
/* readFile('./test/discourse-api/schema.gql','utf8', (err, data) => {
  if (err) throw err;
  console.log( JSON.stringify(parse(data)));
}); */


describe('generating schema from shorthand', () => {
  it('can generate a schema', () => {
    const shorthand = `
      //Make birds great again!
      type BirdSpecies {
        name: String,
        wingspan: Int
      }
      //Ze Root Kwery
      type RootQuery {
        species(name: String!): BirdSpecies
      }
    `;

    const introspectionQuery = `{
    	species: __type(name: "BirdSpecies"){
        name,
        description,
        fields{
          name
          type{
            name
          }
        }
      }
      query: __type(name: "RootQuery"){
        name,
        description,
        fields{
          name
          type{
            name
          }
        }
      }
    }`;

    const solution = {
      data: {
        species: {
          name: 'BirdSpecies',
          description: 'Make birds great again!',
          fields: [
            {
              name: 'name',
              type: {
                name: 'String',
              },
            },
            {
              name: 'wingspan',
              type: {
                name: 'Int',
              },
            },
          ],
        },
        query: {
          name: 'RootQuery',
          description: 'Ze Root Kwery',
          fields: [
            {
              name: 'species',
              type: {
                name: 'BirdSpecies',
              },
            },
          ],
        },
      },
    };

    const jsSchema = generateSchema(shorthand);
    const resultPromise = graphql(jsSchema, introspectionQuery);
    return resultPromise.then((result) => {
      console.log('result', JSON.stringify(result, null, 2));
      assert.deepEqual(result, solution);
    });
  });
});
