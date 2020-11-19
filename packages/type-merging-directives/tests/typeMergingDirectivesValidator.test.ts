import { makeExecutableSchema } from '@graphql-tools/schema';

import { typeMergingDirectives } from '../src';

describe('type merging directives', () => {
  const { typeMergingDirectivesTypeDefs, typeMergingDirectivesValidator } = typeMergingDirectives();

  test('throws an error if base selectionSet invalid', () => {
    const typeDefs = `
      ${typeMergingDirectivesTypeDefs}
      type Query {
        _user: User
      }

      type User @base(selectionSet: "** invalid **") {
        id: ID
        name: String
      }
    `;

    expect(() => makeExecutableSchema({ typeDefs })).not.toThrow();
    expect(() => makeExecutableSchema({ typeDefs, schemaTransforms: [typeMergingDirectivesValidator] })).toThrow();
  });

  test('does not throws an error if base selectionSet valid', () => {
    const typeDefs = `
      ${typeMergingDirectivesTypeDefs}
      type Query {
        _user: User
      }

      type User @base(selectionSet: "{ id }") {
        id: ID
        name: String
      }
    `;

    expect(() => makeExecutableSchema({ typeDefs })).not.toThrow();
    expect(() => makeExecutableSchema({ typeDefs, schemaTransforms: [typeMergingDirectivesValidator] })).not.toThrow();
  });

  test('throws an error if computed selectionSet invalid', () => {
    const typeDefs = `
      ${typeMergingDirectivesTypeDefs}
      type Query {
        _user: User
      }

      type User {
        id: ID
        name: String @computed(selectionSet: "*** invalid ***")
      }
    `;

    expect(() => makeExecutableSchema({ typeDefs })).not.toThrow();
    expect(() => makeExecutableSchema({ typeDefs, schemaTransforms: [typeMergingDirectivesValidator] })).toThrow();
  });

  test('does not throws an error if computed selectionSet valid', () => {
    const typeDefs = `
      ${typeMergingDirectivesTypeDefs}
      type Query {
        _user: User
      }

      type User {
        id: ID
        name: String @computed(selectionSet: "{ id }")
      }
    `;

    expect(() => makeExecutableSchema({ typeDefs })).not.toThrow();
    expect(() => makeExecutableSchema({ typeDefs, schemaTransforms: [typeMergingDirectivesValidator] })).not.toThrow();
  });

  test('throws an error if merge argsExpr invalid', () => {
    const typeDefs = `
      ${typeMergingDirectivesTypeDefs}
      scalar _Key

      type Query {
        _user(key: _Key): User @merge(argsExpr: "key: $$key")
      }

      type User @base(selectionSet: "{ id }") {
        id: ID
        name: String
      }
    `;

    expect(() => makeExecutableSchema({ typeDefs })).not.toThrow();
    expect(() => makeExecutableSchema({ typeDefs, schemaTransforms: [typeMergingDirectivesValidator] })).toThrow();
  });

  test('does not throws an error if merge argsExpr valid', () => {
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

    expect(() => makeExecutableSchema({ typeDefs })).not.toThrow();
    expect(() => makeExecutableSchema({ typeDefs, schemaTransforms: [typeMergingDirectivesValidator] })).not.toThrow();
  });

  test('does not throws an error if merge used without arguments', () => {
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

    expect(() => makeExecutableSchema({ typeDefs })).not.toThrow();
    expect(() => makeExecutableSchema({ typeDefs, schemaTransforms: [typeMergingDirectivesValidator] })).not.toThrow();
  });
});
