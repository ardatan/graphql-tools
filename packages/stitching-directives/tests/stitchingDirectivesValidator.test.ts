import { makeExecutableSchema } from '@graphql-tools/schema';

import { stitchingDirectives } from '../src';

describe('type merging directives', () => {
  const { allStitchingDirectivesTypeDefs, stitchingDirectivesValidator } = stitchingDirectives();

  test('does not throw an error if no other typeDefs used', () => {
    const typeDefs = `
      ${allStitchingDirectivesTypeDefs}
    `;

    expect(() => makeExecutableSchema({ typeDefs })).not.toThrow();
    expect(() => makeExecutableSchema({ typeDefs, schemaTransforms: [stitchingDirectivesValidator] })).not.toThrow();
  });

  test('throws an error if type selectionSet invalid', () => {
    const typeDefs = `
      ${allStitchingDirectivesTypeDefs}
      type Query {
        _user: User
      }

      type User @key(selectionSet: "** invalid **") {
        id: ID
        name: String
      }
    `;

    expect(() => makeExecutableSchema({ typeDefs })).not.toThrow();
    expect(() => makeExecutableSchema({ typeDefs, schemaTransforms: [stitchingDirectivesValidator] })).toThrow();
  });

  test('does not throw an error if type selectionSet valid', () => {
    const typeDefs = `
      ${allStitchingDirectivesTypeDefs}
      type Query {
        _user: User
      }

      type User @key(selectionSet: "{ id }") {
        id: ID
        name: String
      }
    `;

    expect(() => makeExecutableSchema({ typeDefs })).not.toThrow();
    expect(() => makeExecutableSchema({ typeDefs, schemaTransforms: [stitchingDirectivesValidator] })).not.toThrow();
  });

  test('throws an error if computed selectionSet invalid', () => {
    const typeDefs = `
      ${allStitchingDirectivesTypeDefs}
      type Query {
        _user: User
      }

      type User {
        id: ID
        name: String @computed(selectionSet: "*** invalid ***")
      }
    `;

    expect(() => makeExecutableSchema({ typeDefs })).not.toThrow();
    expect(() => makeExecutableSchema({ typeDefs, schemaTransforms: [stitchingDirectivesValidator] })).toThrow();
  });

  test('does not throw an error if computed selectionSet valid', () => {
    const typeDefs = `
      ${allStitchingDirectivesTypeDefs}
      type Query {
        _user: User
      }

      type User {
        id: ID
        name: String @computed(selectionSet: "{ id }")
      }
    `;

    expect(() => makeExecutableSchema({ typeDefs })).not.toThrow();
    expect(() => makeExecutableSchema({ typeDefs, schemaTransforms: [stitchingDirectivesValidator] })).not.toThrow();
  });

  test('throws an error if merge argsExpr invalid', () => {
    const typeDefs = `
      ${allStitchingDirectivesTypeDefs}
      scalar _Key

      type Query {
        _user(key: _Key): User @merge(argsExpr: "key: $$key")
      }

      type User @key(selectionSet: "{ id }") {
        id: ID
        name: String
      }
    `;

    expect(() => makeExecutableSchema({ typeDefs })).not.toThrow();
    expect(() => makeExecutableSchema({ typeDefs, schemaTransforms: [stitchingDirectivesValidator] })).toThrow();
  });

  test('does not throw an error if merge argsExpr valid', () => {
    const typeDefs = `
      ${allStitchingDirectivesTypeDefs}
      scalar _Key

      type Query {
        _user(key: _Key): User @merge(argsExpr: "key: $key")
      }

      type User @key(selectionSet: "{ id }") {
        id: ID
        name: String
      }
    `;

    expect(() => makeExecutableSchema({ typeDefs })).not.toThrow();
    expect(() => makeExecutableSchema({ typeDefs, schemaTransforms: [stitchingDirectivesValidator] })).not.toThrow();
  });

  test('does not throw an error when using merge with argsExpr on a multiple args endpoint', () => {
    const typeDefs = `
      ${allStitchingDirectivesTypeDefs}
      
      type Query {
        _user(id: ID, name: String): User @merge(argsExpr: "id: $key.id, name: $key.name")
      }

      type User @key(selectionSet: "{ id name }") {
        id: ID
        name: String
      }
    `;

    expect(() => makeExecutableSchema({ typeDefs })).not.toThrow();
    expect(() => makeExecutableSchema({ typeDefs, schemaTransforms: [stitchingDirectivesValidator] })).not.toThrow();
  });

  test('does not throw an error if merge used without arguments', () => {
    const typeDefs = `
      ${allStitchingDirectivesTypeDefs}
      scalar _Key

      type Query {
        _user(key: _Key): User @merge
      }

      type User @key(selectionSet: "{ id }") {
        id: ID
        name: String
      }
    `;

    expect(() => makeExecutableSchema({ typeDefs })).not.toThrow();
    expect(() => makeExecutableSchema({ typeDefs, schemaTransforms: [stitchingDirectivesValidator] })).not.toThrow();
  });
});
