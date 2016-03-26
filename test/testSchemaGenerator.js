import { readFile } from 'fs';
import { generateSchema } from '../src/schemaGenerator.js';
import { assert } from 'chai';
import { graphql } from 'graphql';



describe('generating schema from shorthand', () => {
  it('can generate a schema', (done) => {
    const shorthand = `
      //Make birds great again!
      type BirdSpecies {
        name: String!,
        wingspan: Int
      }
      //Ze Root Kwery
      type RootQuery {
        species(name: String!): [BirdSpecies]
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
            kind
            ofType{
              name
            }
          }
        }
      }
      query: __type(name: "RootQuery"){
        name,
        description,
        fields{
          name
          type {
            name
            kind
            ofType {
              name
            }
          }
          args {
            name
            type {
              name
              kind
              ofType {
                name
              }
            }
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
                kind: 'NON_NULL',
                name: null,
                ofType: {
                  name: 'String',
                },
              },
            },
            {
              name: 'wingspan',
              type: {
                kind: 'SCALAR',
                name: 'Int',
                ofType: null,
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
                kind: 'LIST',
                name: null,
                ofType: {
                  name: 'BirdSpecies',
                },
              },
              args: [{
                name: 'name',
                type: {
                  name: null,
                  kind: 'NON_NULL',
                  ofType: {
                    name: 'String',
                  },
                },
              }],
            },
          ],
        },
      },
    };

    const jsSchema = generateSchema(shorthand);
    const resultPromise = graphql(jsSchema, introspectionQuery);
    return resultPromise.then((result) => {
      assert.deepEqual(result, solution);
      done();
    });
  });

  it('Can parse the discourse schema and introspect the enum', (done) => {
    const introspectionQuery = `{
      __type(name: "TimePeriod") {
        name
        kind
        enumValues{
          name
        }
      }
    }`;

    const solution = JSON.parse(`{
      "data": {
        "__type": {
          "name": "TimePeriod",
          "kind": "ENUM",
          "enumValues": [
            {
              "name": "ALL"
            },
            {
              "name": "YEARLY"
            },
            {
              "name": "QUARTERLY"
            },
            {
              "name": "MONTHLY"
            },
            {
              "name": "WEEKLY"
            },
            {
              "name": "DAILY"
            }
          ]
        }
      }
    }`);

    // read discourse schema file
    readFile('./test/discourse-api/schema.gql', 'utf8', (err, data) => {
      if (err) throw err;
      const schema = generateSchema(data);
      const introspectionPromise = graphql(schema, introspectionQuery);
      introspectionPromise.then((introspectionResult) => {
        assert.deepEqual(introspectionResult, solution);
        done();
      });
    });
  });

  it('can generate a schema with resolve functions', (done) => {
    const shorthand = `
      //Make birds great again!
      type BirdSpecies {
        name: String!,
        wingspan: Int
      }
      //Ze Root Kwery
      type RootQuery {
        species(name: String!): [BirdSpecies]
      }
    `;

    const resolveFunctions = {
      RootQuery: {
        species: (root, { name }) => {
          return [{
            name: `Hello ${name}!`,
            wingspan: 200,
          }];
        },
      },
    };

    const testQuery = `{
      species(name: "BigBird"){
        name
        wingspan
      }
    }`;

    const solution = {
      data: {
        species: [
          {
            name: 'Hello BigBird!',
            wingspan: 200,
          },
        ],
      },
    };

    const jsSchema = generateSchema(shorthand, resolveFunctions);
    const resultPromise = graphql(jsSchema, testQuery);
    return resultPromise.then((result) => {
      assert.deepEqual(result, solution);
      done();
    });
  });
});
