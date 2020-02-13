import { relocatedError } from '../stitching/errors';
import { getErrors, ERROR_SYMBOL } from '../stitching/proxiedResult';
import { checkResultAndHandleErrors } from '../stitching/checkResultAndHandleErrors';
import { makeExecutableSchema } from '../makeExecutableSchema';
import { mergeSchemas } from '../stitching';
import { IGraphQLToolsResolveInfo } from '../Interfaces';

import { expect, assert } from 'chai';
import { GraphQLError, graphql } from 'graphql';

class ErrorWithExtensions extends GraphQLError {
  constructor(message: string, code: string) {
    super(message, null, null, null, null, null, { code });
  }
}

describe('Errors', () => {
  describe('relocatedError', () => {
    it('should adjust the path of a GraphqlError', () => {
      const originalError = new GraphQLError('test', null, null, null, ['test']);
      const newError = relocatedError(originalError, null, ['test', 1]);
      const expectedError = new GraphQLError('test', null, null, null, ['test', 1]);
      assert.deepEqual(newError, expectedError);
    });

    it('should also locate a non GraphQLError', () => {
      const originalError = new Error('test');
      const newError = relocatedError(originalError, null, ['test', 1]);
      const expectedError = new GraphQLError('test', null, null, null, ['test', 1]);
      assert.deepEqual(newError, expectedError);
    });
  });

  describe('getErrors', () => {
    it('should return all errors including if path is not defined', () => {
      const error = {
        message: 'Test error without path'
      };
      const mockErrors: any = {
        responseKey: '',
        [ERROR_SYMBOL]: [error],
      };

      assert.deepEqual(getErrors(mockErrors, 'responseKey'),
        [mockErrors[ERROR_SYMBOL][0]]
      );
    });
  });

  describe('checkResultAndHandleErrors', () => {
    it('persists single error', () => {
      const result = {
        errors: [new GraphQLError('Test error')]
      };
      try {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        checkResultAndHandleErrors(result, {}, {} as IGraphQLToolsResolveInfo, 'responseKey');
      } catch (e) {
        assert.equal(e.message, 'Test error');
        assert.isUndefined(e.originalError.errors);
      }
    });

    it('persists single error with extensions', () => {
      const result = {
        errors: [new ErrorWithExtensions('Test error', 'UNAUTHENTICATED')]
      };
      try {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        checkResultAndHandleErrors(result, {}, {} as IGraphQLToolsResolveInfo, 'responseKey');
      } catch (e) {
        assert.equal(e.message, 'Test error');
        assert.equal(e.extensions && e.extensions.code, 'UNAUTHENTICATED');
        assert.isUndefined(e.originalError.errors);
      }
    });

    it('combines errors and persists the original errors', () => {
      const result = {
        errors: [
          new GraphQLError('Error1'),
          new GraphQLError('Error2'),
        ]
      };
      try {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        checkResultAndHandleErrors(result, {}, {} as IGraphQLToolsResolveInfo, 'responseKey');
      } catch (e) {
        assert.equal(e.message, 'Error1\nError2');
        assert.isNotEmpty(e.originalError);
        assert.isNotEmpty(e.originalError.errors);
        assert.lengthOf(e.originalError.errors, result.errors.length);
        result.errors.forEach((error, i) => {
          assert.deepEqual(e.originalError.errors[i], error);
        });
      }
    });
  });
});

describe('passes along errors for missing fields on list', () => {
  it('if non-null', async () => {
    const typeDefs = `
      type Query {
        getOuter: Outer
      }
      type Outer {
        innerList: [Inner!]!
      }
      type Inner {
        mandatoryField: String!
      }
    `;

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Query: {
          getOuter: () => ({
            innerList: [{ mandatoryField: 'test'}, {}]
          })
        },
      }
    });

    const mergedSchema = mergeSchemas({
      schemas: [schema]
    });
    const result = await graphql(mergedSchema, '{ getOuter { innerList { mandatoryField } } }');
    expect(result).to.deep.equal({
      data: {
        getOuter: null,
      },
      errors: [{
        locations: [{
          column: 26,
          line: 1,
        }],
        message: 'Cannot return null for non-nullable field Inner.mandatoryField.',
        path: [
          'getOuter',
          'innerList',
          1,
          'mandatoryField',
        ],
      }]
    });
  });

  it('even if nullable', async () => {
    const typeDefs = `
      type Query {
        getOuter: Outer
      }
      type Outer {
        innerList: [Inner]!
      }
      type Inner {
        mandatoryField: String!
      }
    `;

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Query: {
          getOuter: () => ({
            innerList: [{ mandatoryField: 'test' }, {}]
          })
        },
      }
    });

    const mergedSchema = mergeSchemas({
      schemas: [schema]
    });
    const result = await graphql(mergedSchema, '{ getOuter { innerList { mandatoryField } } }');
    expect(result).to.deep.equal({
      data: {
        getOuter: {
          innerList: [{ mandatoryField: 'test'}, null],
        },
      },
      errors: [{
        locations: [{
          column: 26,
          line: 1,
        }],
        message: 'Cannot return null for non-nullable field Inner.mandatoryField.',
        path: [
          'getOuter',
          'innerList',
          1,
          'mandatoryField',
        ],
      }]
    });
  });
});

describe('passes along errors when list field errors', () => {
  it('if non-null', async () => {
    const typeDefs = `
      type Query {
        getOuter: Outer
      }
      type Outer {
        innerList: [Inner!]!
      }
      type Inner {
        mandatoryField: String!
      }
    `;

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Query: {
          getOuter: () => ({
            innerList: [{ mandatoryField: 'test' }, new Error('test')],
          }),
        },
      }
    });

    const mergedSchema = mergeSchemas({
      schemas: [schema]
    });
    const result = await graphql(mergedSchema, '{ getOuter { innerList { mandatoryField } } }');
    expect(result).to.deep.equal({
      data: {
        getOuter: null,
      },
      errors: [{
        locations: [{
          column: 14,
          line: 1,
        }],
        message: 'test',
        path: [
          'getOuter',
          'innerList',
          1,
        ],
      }]
    });
  });

  it('even if nullable', async () => {
    const typeDefs = `
      type Query {
        getOuter: Outer
      }
      type Outer {
        innerList: [Inner]!
      }
      type Inner {
        mandatoryField: String!
      }
    `;

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Query: {
          getOuter: () => ({
            innerList: [{ mandatoryField: 'test' }, new Error('test')],
          }),
        },
      }
    });

    const mergedSchema = mergeSchemas({
      schemas: [schema]
    });
    const result = await graphql(mergedSchema, '{ getOuter { innerList { mandatoryField } } }');
    expect(result).to.deep.equal({
      data: {
        getOuter: {
          innerList: [{ mandatoryField: 'test'}, null],
        },
      },
      errors: [{
        locations: [{
          column: 14,
          line: 1,
        }],
        message: 'test',
        path: [
          'getOuter',
          'innerList',
          1,
        ],
      }]
    });
  });
});
