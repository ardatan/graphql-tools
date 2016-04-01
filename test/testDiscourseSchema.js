import { readFile } from 'fs';
import { generateSchema } from '../src/schemaGenerator.js';
import { assert } from 'chai';
import { graphql } from 'graphql';
import resolveFunctions from './discourse-api/schema.js';



describe('generating the discourse schema with resolvers', () => {
  it('Can produce the full discourse schema with resolvers', (done) => {
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

    // read test.gql file
    readFile('./test/discourse-api/schema.gql', 'utf8', (err, data) => {
      if (err) throw err;
      // const rep = (key, val) => (typeof val === 'function') ? '[function]' : val;

      const schema = generateSchema(data, resolveFunctions);
      const introspectionPromise = graphql(schema, introspectionQuery);
      introspectionPromise.then((introspectionResult) => {
        assert.deepEqual(introspectionResult, solution);
        done();
      });
    });
  });
});
