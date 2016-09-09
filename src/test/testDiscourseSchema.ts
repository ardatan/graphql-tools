import { readFile } from 'fs';
import { assert } from 'chai';
import { graphql } from 'graphql';
import { makeExecutableSchema } from '../schemaGenerator';
import resolveFunctions from './discourse-api/schema';

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
    readFile('./src/test/discourse-api/schema.gql', 'utf8', (err, data) => {
      if (err) {
          throw err;
      }

      // const rep = (key, val) => (typeof val === 'function') ? '[function]' : val;

      const schema = makeExecutableSchema({ typeDefs: data, resolvers: resolveFunctions });
      const introspectionPromise = graphql(schema, introspectionQuery);
      introspectionPromise.then((introspectionResult) => {
        assert.deepEqual(introspectionResult, solution);
        done();
      });
    });
  });
});
