import { print } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';
import { parseSelectionSet } from '@graphql-tools/utils';

import { stitchingDirectives } from '../src';

describe('type merging directives', () => {
  const { stitchingDirectivesTypeDefs, stitchingDirectivesTransformer } = stitchingDirectives();

  test('adds base selection sets', () => {
    const typeDefs = `
      ${stitchingDirectivesTypeDefs}
      scalar _Key

      type Query {
        _user(key: _Key): User @merge
      }

      type User @base(selectionSet: "{ id }") {
        id: ID
        name: String
      }
    `;

    const schema = makeExecutableSchema({ typeDefs });

    const subschemaConfig = {
      schema,
    }

    const transformedSubschemaConfig = stitchingDirectivesTransformer(subschemaConfig);

    expect(transformedSubschemaConfig.merge.User.selectionSet).toEqual(print(parseSelectionSet('{ id }')));
    expect(transformedSubschemaConfig.merge.User.fieldName).toEqual('_user');
  });

  test('adds computed selection sets', () => {
    const typeDefs = `
      ${stitchingDirectivesTypeDefs}
      scalar _Key

      type Query {
        _user(key: _Key): User @merge
      }

      type User {
        id: ID
        name: String @computed(selectionSet: "{ id }")
      }
    `;

    const schema = makeExecutableSchema({ typeDefs });

    const subschemaConfig = {
      schema,
    }

    const transformedSubschemaConfig = stitchingDirectivesTransformer(subschemaConfig);

    expect(transformedSubschemaConfig.merge.User.computedFields.name.selectionSet).toEqual(print(parseSelectionSet('{ id }')));
    expect(transformedSubschemaConfig.merge.User.fieldName).toEqual('_user');
  });

  test('adds args function when used without arguments', () => {
    const typeDefs = `
      ${stitchingDirectivesTypeDefs}
      scalar _Key

      type Query {
        _user(key: _Key): User @merge
      }

      type User @base(selectionSet: "{ id }") {
        id: ID
        name: String
      }
    `;

    const schema = makeExecutableSchema({ typeDefs });

    const subschemaConfig = {
      schema,
    }

    const transformedSubschemaConfig = stitchingDirectivesTransformer(subschemaConfig);

    const argsFn = transformedSubschemaConfig.merge.User.args;

    const originalResult = {
      id: '5',
      email: 'email@email.com',
    };

    const args = argsFn(originalResult);

    expect(args).toEqual({
      key: {
        id: '5',
      },
    });
  });

  test('adds args function when used with argsExpr argument using an unqualified key', () => {
    const typeDefs = `
      ${stitchingDirectivesTypeDefs}
      scalar _Key

      type Query {
        _user(key: _Key): User @merge(argsExpr: "key: $key")
      }

      type User @base(selectionSet: "{ id }") {
        id: ID
        name: String
      }
    `;

    const schema = makeExecutableSchema({ typeDefs });

    const subschemaConfig = {
      schema,
    }

    const transformedSubschemaConfig = stitchingDirectivesTransformer(subschemaConfig);

    const argsFn = transformedSubschemaConfig.merge.User.args;

    const originalResult = {
      id: '5',
      email: 'email@email.com',
    };

    const args = argsFn(originalResult);

    expect(args).toEqual({
      key: {
        id: '5',
      },
    });
  });

  test('adds args function when used with argsExpr argument using a fully qualified key', () => {
    const typeDefs = `
      ${stitchingDirectivesTypeDefs}
      scalar _Key

      type Query {
        _user(key: _Key): User @merge(argsExpr: "key: { id: $key.id }")
      }

      type User @base(selectionSet: "{ id }") {
        id: ID
        name: String
      }
    `;

    const schema = makeExecutableSchema({ typeDefs });

    const subschemaConfig = {
      schema,
    }

    const transformedSubschemaConfig = stitchingDirectivesTransformer(subschemaConfig);

    const argsFn = transformedSubschemaConfig.merge.User.args;

    const originalResult = {
      id: '5',
      email: 'email@email.com',
    };

    const args = argsFn(originalResult);

    expect(args).toEqual({
      key: {
        id: '5',
      },
    });
  });

  test('adds args function when used with keyArg argument', () => {
    const typeDefs = `
      ${stitchingDirectivesTypeDefs}
      scalar _Key

      type Query {
        _user(key: _Key): User @merge(keyArg: "key")
      }

      type User @base(selectionSet: "{ id }") {
        id: ID
        name: String
      }
    `;

    const schema = makeExecutableSchema({ typeDefs });

    const subschemaConfig = {
      schema,
    }

    const transformedSubschemaConfig = stitchingDirectivesTransformer(subschemaConfig);

    const argsFn = transformedSubschemaConfig.merge.User.args;

    const originalResult = {
      id: '5',
      email: 'email@email.com',
    };

    const args = argsFn(originalResult);

    expect(args).toEqual({
      key: {
        id: '5',
      },
    });
  });

  test('adds args function when used with nested keyArg argument', () => {
    const typeDefs = `
      ${stitchingDirectivesTypeDefs}
      scalar _Key

      input UserInput {
        key: _Key
      }

      type Query {
        _user(input: UserInput, scope: String): User @merge(keyArg: "input.key", additionalArgs: """ scope: "full" """)
      }

      type User @base(selectionSet: "{ id }") {
        id: ID
        name: String
      }
    `;

    const schema = makeExecutableSchema({ typeDefs });

    const subschemaConfig = {
      schema,
    }

    const transformedSubschemaConfig = stitchingDirectivesTransformer(subschemaConfig);

    const argsFn = transformedSubschemaConfig.merge.User.args;

    const originalResult = {
      id: '5',
      email: 'email@email.com',
    };

    const args = argsFn(originalResult);

    expect(args).toEqual({
      input: {
        key: {
          id: '5',
        },
      },
      scope: 'full',
    });
  });

  test('adds args function when used with keyArg and additionalArgs arguments', () => {
    const typeDefs = `
      ${stitchingDirectivesTypeDefs}
      scalar _Key

      type Query {
        _user(key: _Key, scope: String): User @merge(keyArg: "key", additionalArgs: """ scope: "full" """)
      }

      type User @base(selectionSet: "{ id }") {
        id: ID
        name: String
      }
    `;

    const schema = makeExecutableSchema({ typeDefs });

    const subschemaConfig = {
      schema,
    }

    const transformedSubschemaConfig = stitchingDirectivesTransformer(subschemaConfig);

    const argsFn = transformedSubschemaConfig.merge.User.args;

    const originalResult = {
      id: '5',
      email: 'email@email.com',
    };

    const args = argsFn(originalResult);

    expect(args).toEqual({
      key: {
        id: '5',
      },
      scope: 'full',
    });
  });

  test('adds args function when used with keyField argument', () => {
    const typeDefs = `
      ${stitchingDirectivesTypeDefs}
      type Query {
        _user(id: ID): User @merge(keyField: "id")
      }

      type User @base(selectionSet: "{ id }") {
        id: ID
        name: String
      }
    `;

    const schema = makeExecutableSchema({ typeDefs });

    const subschemaConfig = {
      schema,
    }

    const transformedSubschemaConfig = stitchingDirectivesTransformer(subschemaConfig);

    const argsFn = transformedSubschemaConfig.merge.User.args;

    const originalResult = {
      id: '5',
      email: 'email@email.com',
    };

    const args = argsFn(originalResult);

    expect(args).toEqual({
      id: '5',
    });
  });

  test('adds args function when used with key argument', () => {
    const typeDefs = `
      ${stitchingDirectivesTypeDefs}
      scalar _Key

      type Query {
        _user(key: _Key): User @merge(key: ["id", "outer.inner.firstName:name.firstName"])
      }

      type User @base(selectionSet: "{ id name { firstName } }") {
        id: ID
        email: String
      }
    `;

    const schema = makeExecutableSchema({ typeDefs });

    const subschemaConfig = {
      schema,
    }

    const transformedSubschemaConfig = stitchingDirectivesTransformer(subschemaConfig);

    const argsFn = transformedSubschemaConfig.merge.User.args;

    const originalResult = {
      id: '5',
      name: {
        firstName: 'Tester',
      },
    };

    const args = argsFn(originalResult);

    expect(args).toEqual({
      key: {
        id: '5',
        outer: {
          inner: {
            firstName: 'Tester',
          },
        },
      },
    });
  });

  test('adds key and argsFromKeys functions when used without arguments', () => {
    const typeDefs = `
      ${stitchingDirectivesTypeDefs}
      scalar _Key

      type Query {
        _user(key: _Key): [User] @merge
      }

      type User @base(selectionSet: "{ id }") {
        id: ID
        name: String
      }
    `;

    const schema = makeExecutableSchema({ typeDefs });

    const subschemaConfig = {
      schema,
    }

    const transformedSubschemaConfig = stitchingDirectivesTransformer(subschemaConfig);

    const keyFn = transformedSubschemaConfig.merge.User.key;
    const argsFromKeysFn = transformedSubschemaConfig.merge.User.argsFromKeys;

    const originalResult = {
      id: '5',
      email: 'email@email.com',
    };

    const key = keyFn(originalResult);
    const args = argsFromKeysFn([key]);

    expect(key).toEqual({
      id: '5',
    });
    expect(args).toEqual({
      key: [{
        id: '5',
      }],
    });
  });

  test('adds key and argsFromKeys functions with argsExpr argument using an unqualified key', () => {
    const typeDefs = `
      ${stitchingDirectivesTypeDefs}
      scalar _Key

      type Query {
        _user(key: _Key): [User] @merge(argsExpr: "key: [[$key]]")
      }

      type User @base(selectionSet: "{ id }") {
        id: ID
        name: String
      }
    `;

    const schema = makeExecutableSchema({ typeDefs });

    const subschemaConfig = {
      schema,
    }

    const transformedSubschemaConfig = stitchingDirectivesTransformer(subschemaConfig);

    const keyFn = transformedSubschemaConfig.merge.User.key;
    const argsFromKeysFn = transformedSubschemaConfig.merge.User.argsFromKeys;

    const originalResult = {
      id: '5',
      email: 'email@email.com',
    };

    const key = keyFn(originalResult);
    const args = argsFromKeysFn([key]);

    expect(key).toEqual({
      id: '5',
    });
    expect(args).toEqual({
      key: [{
        id: '5',
      }],
    });
  });

  test('adds key and argsFromKeys functions with argsExpr argument using a fully qualified key', () => {
    const typeDefs = `
      ${stitchingDirectivesTypeDefs}
      scalar _Key

      type Query {
        _user(key: _Key): [User] @merge(argsExpr: "key: [[{ id: $key.id }]]")
      }

      type User @base(selectionSet: "{ id }") {
        id: ID
        name: String
      }
    `;

    const schema = makeExecutableSchema({ typeDefs });

    const subschemaConfig = {
      schema,
    }

    const transformedSubschemaConfig = stitchingDirectivesTransformer(subschemaConfig);

    const keyFn = transformedSubschemaConfig.merge.User.key;
    const argsFromKeysFn = transformedSubschemaConfig.merge.User.argsFromKeys;

    const originalResult = {
      id: '5',
      email: 'email@email.com',
    };

    const key = keyFn(originalResult);
    const args = argsFromKeysFn([key]);

    expect(key).toEqual({
      id: '5',
    });
    expect(args).toEqual({
      key: [{
        id: '5',
      }],
    });
  });
});
