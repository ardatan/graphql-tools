/* eslint-disable promise/param-names */
import { graphql } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';

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



describe('providing useful errors from resolvers', () => {
  test('logs an error if a resolver fails', () => {
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
        species: (): string => {
          throw new Error('oops!');
        },
      },
    };

    // TODO: Should use a spy here instead of logger class
    // to make sure we don't duplicate tests from Logger.
    const logger = new Logger();
    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: resolve,
      logger,
    });
    const testQuery = '{ species }';
    const expected = 'Error in resolver RootQuery.species\noops!';
    return graphql(jsSchema, testQuery).then((_res) => {
      expect(logger.errors.length).toEqual(1);
      expect(logger.errors[0].message).toEqual(expected);
    });
  });

  test('will throw errors on undefined if you tell it to', () => {
    const shorthand = `
      type RootQuery {
        species(name: String): String
        stuff: String
      }
      schema {
        query: RootQuery
      }
    `;
    const resolve = {
      RootQuery: {
        species: (): string => undefined,
        stuff: () => 'stuff',
      },
    };

    const logger = new Logger();
    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: resolve,
      logger,
      allowUndefinedInResolve: false,
    });
    const testQuery = '{ species, stuff }';
    const expectedErr = /Resolver for "RootQuery.species" returned undefined/;
    const expectedResData = { species: null as string, stuff: 'stuff' };
    return graphql(jsSchema, testQuery).then((res) => {
      expect(logger.errors.length).toEqual(1);
      expect(logger.errors[0].message).toMatch(expectedErr);
      expect(res.data).toEqual(expectedResData);
    });
  });

  test('decorateToCatchUndefined preserves default resolvers', () => {
    const shorthand = `
      type Thread {
        name: String
      }
      type RootQuery {
        thread(name: String): Thread
      }
      schema {
        query: RootQuery
      }
    `;
    const resolve = {
      RootQuery: {
        thread(_root: any, args: Record<string, any>) {
          return args;
        },
      },
    };

    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: resolve,
      allowUndefinedInResolve: false,
    });
    const testQuery = `{
        thread(name: "SomeThread") {
            name
        }
    }`;
    const expectedResData = {
      thread: {
        name: 'SomeThread',
      },
    };
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data).toEqual(expectedResData);
    });
  });

  test('decorateToCatchUndefined throws even if default resolvers are preserved', () => {
    const shorthand = `
        type Thread {
          name: String
        }
        type RootQuery {
          thread(name: String): Thread
        }
        schema {
          query: RootQuery
        }
      `;
    const resolve = {
      RootQuery: {
        thread(_root: any, _args: Record<string, any>) {
          return { name: (): any => undefined };
        },
      },
    };

    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: resolve,
      allowUndefinedInResolve: false,
    });
    const testQuery = `{
          thread {
              name
          }
      }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.errors[0].originalError.message).toBe(
        'Resolver for "Thread.name" returned undefined',
      );
    });
  });

  test('will use default resolver when returning function properties ', () => {
    const shorthand = `
      type Thread {
        name: String
      }
      type RootQuery {
        thread(name: String): Thread
      }
      schema {
        query: RootQuery
      }
    `;
    const resolve = {
      RootQuery: {
        thread(_root: any, args: Record<string, any>) {
          return { name: () => args.name };
        },
      },
    };

    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: resolve,
      allowUndefinedInResolve: false,
    });
    const testQuery = `{
        thread(name: "SomeThread") {
            name
        }
    }`;
    const expectedResData = {
      thread: {
        name: 'SomeThread',
      },
    };
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data).toEqual(expectedResData);
    });
  });

  test('will not throw errors on undefined by default', () => {
    const shorthand = `
      type RootQuery {
        species(name: String): String
        stuff: String
      }
      schema {
        query: RootQuery
      }
    `;
    const resolve = {
      RootQuery: {
        species: (): string => undefined,
        stuff: () => 'stuff',
      },
    };

    const logger = new Logger();
    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: resolve,
      logger,
    });
    const testQuery = '{ species, stuff }';
    const expectedResData = { species: null as string, stuff: 'stuff' };
    return graphql(jsSchema, testQuery).then((res) => {
      expect(logger.errors.length).toEqual(0);
      expect(res.data).toEqual(expectedResData);
    });
  });
});
