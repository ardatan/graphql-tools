import { generateSchema } from '../src/schemaGenerator.js';
import { assert } from 'chai';
import { graphql } from 'graphql';
import { Logger } from '../src/Logger.js';

describe('Logger', () => {
  it('logs the errors', (done) => {
    const shorthand = `
      type RootQuery {
        just_a_field: Int
      }
      type RootMutation {
        species(name: String): String
        stuff: String
      }
      schema {
        query: RootQuery
        mutation: RootMutation
      }
    `;
    const resolve = {
      RootMutation: {
        species: () => {
          throw new Error('oops!');
        },
        stuff: () => {
          throw new Error('oh noes!');
        },
      },
    };
    const logger = new Logger();
    const jsSchema = generateSchema(shorthand, resolve, logger);
    // calling the mutation here so the erros will be ordered.
    const testQuery = 'mutation { species, stuff }';
    const expected0 = 'Error in resolver RootMutation.species\noops!';
    const expected1 = 'Error in resolver RootMutation.stuff\noh noes!';
    graphql(jsSchema, testQuery).then(() => {
      assert.equal(logger.errors.length, 2);
      assert.equal(logger.errors[0].message, expected0);
      assert.equal(logger.errors[1].message, expected1);
      done();
    });
  });

  it('also forwards the errors when you tell it to', (done) => {
    const shorthand = `
      type RootQuery {
        species(name: String): String
      }
      schema {
        query: RootQuery
      }
    `;
    const resolve = {
      RootQuery: {
        species: () => {
          throw new Error('oops!');
        },
      },
    };
    let loggedErr = null;
    const logger = new Logger('LoggyMcLogface', (e) => { loggedErr = e; });
    const jsSchema = generateSchema(shorthand, resolve, logger);
    const testQuery = '{ species }';
    graphql(jsSchema, testQuery).then(() => {
      assert.equal(loggedErr, logger.errors[0]);
      done();
    });
  });

  it('prints the errors when you want it to', (done) => {
    const shorthand = `
      type RootQuery {
        species(name: String): String
      }
      schema {
        query: RootQuery
      }
    `;
    const resolve = {
      RootQuery: {
        species: (root, { name }) => {
          if (name) {
            throw new Error(name);
          }
          throw new Error('oops!');
        },
      },
    };
    const logger = new Logger();
    const jsSchema = generateSchema(shorthand, resolve, logger);
    const testQuery = '{ q: species, p: species(name: "Peter") }';
    graphql(jsSchema, testQuery).then(() => {
      const allErrors = logger.printAllErrors();
      assert.match(allErrors, /oops/);
      assert.match(allErrors, /Peter/);
      done();
    });
  });
});
