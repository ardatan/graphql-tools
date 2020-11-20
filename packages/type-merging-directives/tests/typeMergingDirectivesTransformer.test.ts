import { print } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';
import { parseSelectionSet } from '@graphql-tools/utils';

import { typeMergingDirectives } from '../src';

describe('type merging directives', () => {
  const { typeMergingDirectivesTypeDefs, typeMergingDirectivesTransformer } = typeMergingDirectives();

  test('adds base selection sets', () => {
    const typeDefs = `
      ${typeMergingDirectivesTypeDefs}
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

    const transformedSubschemaConfig = typeMergingDirectivesTransformer(subschemaConfig);

    expect(transformedSubschemaConfig.merge.User.selectionSet).toEqual(print(parseSelectionSet('{ id }')));
    expect(transformedSubschemaConfig.merge.User.fieldName).toEqual('_user');
  });

  test('adds computed selection sets', () => {
    const typeDefs = `
      ${typeMergingDirectivesTypeDefs}
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

    const transformedSubschemaConfig = typeMergingDirectivesTransformer(subschemaConfig);

    expect(transformedSubschemaConfig.merge.User.computedFields.name.selectionSet).toEqual(print(parseSelectionSet('{ id }')));
    expect(transformedSubschemaConfig.merge.User.fieldName).toEqual('_user');
  });

  test('adds args function when used without arguments', () => {
    const typeDefs = `
      ${typeMergingDirectivesTypeDefs}
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

    const transformedSubschemaConfig = typeMergingDirectivesTransformer(subschemaConfig);

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

  test('adds args function when used with argsExpr argument usnig an unqualified key', () => {
    const typeDefs = `
      ${typeMergingDirectivesTypeDefs}
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

    const transformedSubschemaConfig = typeMergingDirectivesTransformer(subschemaConfig);

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
      ${typeMergingDirectivesTypeDefs}
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

    const transformedSubschemaConfig = typeMergingDirectivesTransformer(subschemaConfig);

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

  test('adds key and argsFromKeys functions when used without arguments', () => {
    const typeDefs = `
      ${typeMergingDirectivesTypeDefs}
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

    const transformedSubschemaConfig = typeMergingDirectivesTransformer(subschemaConfig);

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
      ${typeMergingDirectivesTypeDefs}
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

    const transformedSubschemaConfig = typeMergingDirectivesTransformer(subschemaConfig);

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
      ${typeMergingDirectivesTypeDefs}
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

    const transformedSubschemaConfig = typeMergingDirectivesTransformer(subschemaConfig);

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
