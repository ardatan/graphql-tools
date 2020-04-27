/* eslint-disable promise/param-names */
import { graphql } from 'graphql';

import { makeExecutableSchema } from '../src/generate/index';

import { Logger } from './Logger';

describe('Logger', () => {
  test('logs the errors', () => {
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
    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: resolve,
      logger,
    });
    // calling the mutation here so the erros will be ordered.
    const testQuery = 'mutation { species, stuff }';
    const expected0 = 'Error in resolver RootMutation.species\noops!';
    const expected1 = 'Error in resolver RootMutation.stuff\noh noes!';
    return graphql(jsSchema, testQuery).then(() => {
      expect(logger.errors.length).toEqual(2);
      expect(logger.errors[0].message).toEqual(expected0);
      expect(logger.errors[1].message).toEqual(expected1);
    });
  });

  test('also forwards the errors when you tell it to', () => {
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
    let loggedErr: Error = null;
    const logger = new Logger('LoggyMcLogface', (e: Error) => {
      loggedErr = e;
    });
    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: resolve,
      logger,
    });
    const testQuery = '{ species }';
    return graphql(jsSchema, testQuery).then(() => {
      expect(loggedErr).toEqual(logger.errors[0]);
    });
  });

  test('prints the errors when you want it to', () => {
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
        species: (_root: any, { name }: { name: string }) => {
          if (name) {
            throw new Error(name);
          }
          throw new Error('oops!');
        },
      },
    };
    const logger = new Logger();
    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: resolve,
      logger,
    });
    const testQuery = '{ q: species, p: species(name: "Peter") }';
    return graphql(jsSchema, testQuery).then(() => {
      const allErrors = logger.printAllErrors();
      expect(allErrors).toMatch(/oops/);
      expect(allErrors).toMatch(/Peter/);
    });
  });

  test('logs any Promise reject errors', () => {
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
        species: () =>
          new Promise((_, reject) => {
            reject(new Error('oops!'));
          }),
        stuff: () =>
          new Promise((_, reject) => {
            reject(new Error('oh noes!'));
          }),
      },
    };
    const logger = new Logger();
    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: resolve,
      logger,
    });

    const testQuery = 'mutation { species, stuff }';
    const expected0 = 'Error in resolver RootMutation.species\noops!';
    const expected1 = 'Error in resolver RootMutation.stuff\noh noes!';
    return graphql(jsSchema, testQuery).then(() => {
      expect(logger.errors.length).toEqual(2);
      expect(logger.errors[0].message).toEqual(expected0);
      expect(logger.errors[1].message).toEqual(expected1);
    });
  });

  test('all Promise rejects will log an Error', () => {
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
        species: () =>
          new Promise((_, reject) => {
            reject(new Error('oops!'));
          }),
      },
    };

    let loggedErr: Error = null;
    const logger = new Logger('LoggyMcLogface', (e: Error) => {
      loggedErr = e;
    });
    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: resolve,
      logger,
    });

    const testQuery = '{ species }';
    return graphql(jsSchema, testQuery).then(() => {
      expect(loggedErr).toEqual(logger.errors[0]);
    });
  });
});
