import { GraphQLResolveInfo, locatedError, graphql, OperationTypeNode } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';
import { createGraphQLError, ExecutionResult } from '@graphql-tools/utils';
import { stitchSchemas } from '@graphql-tools/stitch';

import { checkResultAndHandleErrors } from '../src/checkResultAndHandleErrors.js';
import { UNPATHED_ERRORS_SYMBOL } from '../src/symbols.js';
import { getUnpathedErrors } from '../src/mergeFields.js';
import { delegateToSchema, defaultMergedResolver, DelegationContext } from '../src/index.js';

describe('Errors', () => {
  describe('getUnpathedErrors', () => {
    test('should return all unpathed errors', () => {
      const error = {
        message: 'Test error without path',
      };
      const mockExternalObject: any = {
        responseKey: '',
        [UNPATHED_ERRORS_SYMBOL]: [error],
      };

      expect(getUnpathedErrors(mockExternalObject)).toEqual([mockExternalObject[UNPATHED_ERRORS_SYMBOL][0]]);
    });
  });

  describe('checkResultAndHandleErrors', () => {
    const fakeInfo: GraphQLResolveInfo = {
      fieldName: 'foo',
      fieldNodes: [],
      returnType: {} as any,
      parentType: {} as any,
      path: { prev: undefined, key: 'foo', typename: undefined } as any,
      schema: {} as any,
      fragments: {},
      rootValue: {},
      operation: {} as any,
      variableValues: {},
    };

    test('persists single error', () => {
      const result = {
        errors: [createGraphQLError('Test error')],
      };
      try {
        checkResultAndHandleErrors(result, {
          fieldName: 'responseKey',
          info: fakeInfo,
        } as DelegationContext);
      } catch (e: any) {
        expect(e.message).toEqual('Test error');
        expect(e.originalError.errors).toBeUndefined();
      }
    });

    test('persists single error with extensions', () => {
      const result = {
        errors: [
          createGraphQLError('Test error', {
            extensions: {
              code: 'UNAUTHENTICATED',
            },
          }),
        ],
      };
      try {
        checkResultAndHandleErrors(result, {
          fieldName: 'responseKey',
          info: fakeInfo,
        } as DelegationContext);
      } catch (e: any) {
        expect(e.message).toEqual('Test error');
        expect(e.extensions && e.extensions.code).toEqual('UNAUTHENTICATED');
        expect(e.originalError.errors).toBeUndefined();
      }
    });

    test('combines errors and persists the original errors', () => {
      const result = {
        errors: [createGraphQLError('Error1'), createGraphQLError('Error2')],
      };
      try {
        checkResultAndHandleErrors(result, {
          fieldName: 'responseKey',
          info: fakeInfo,
        } as DelegationContext);
      } catch (e: any) {
        expect(e.message).toEqual('Error1\nError2');
        expect(e.originalError).toBeDefined();
        expect(e.originalError.errors).toBeDefined();
        expect(e.originalError.errors).toHaveLength(result.errors.length);
        for (const i in result.errors) {
          const error = result.errors[i];
          expect(e.originalError.errors[i]).toEqual(error);
        }
      }
    });

    // see https://github.com/ardatan/graphql-tools/issues/1641
    describe('it proxies errors with invalid paths', () => {
      test('it works with bare delegation', async () => {
        const typeDefs = /* GraphQL */ `
          type Object {
            field1: String
            field2: String
          }
          type Query {
            object: Object
          }
        `;

        const unpathedError = locatedError(new Error('TestError'), undefined as any, ['_entities', 7, 'name']);

        const remoteSchema = makeExecutableSchema({
          typeDefs,
          resolvers: {
            Query: {
              object: () => ({
                field1: unpathedError,
                field2: 'data',
              }),
            },
          },
        });

        const gatewaySchema = makeExecutableSchema({
          typeDefs,
          resolvers: {
            Query: {
              object: (_parent, _args, context, info) =>
                delegateToSchema({
                  schema: remoteSchema,
                  operation: 'query' as OperationTypeNode,
                  context,
                  info,
                }),
            },
          },
        });

        const query = /* GraphQL */ `
          {
            object {
              field1
              field2
            }
          }
        `;

        const expectedResult: ExecutionResult = {
          data: {
            object: {
              field1: null,
              field2: 'data',
            },
          },
          errors: [unpathedError],
        };

        const gatewayResult = await graphql({
          schema: gatewaySchema,
          source: query,
          fieldResolver: defaultMergedResolver,
        });

        expect(gatewayResult).toEqual(expectedResult);
      });

      test('it works with stitched schemas', async () => {
        const typeDefs = /* GraphQL */ `
          type Object {
            field1: String
            field2: String
          }
          type Query {
            object: Object
          }
        `;

        const unpathedError = locatedError(new Error('TestError'), undefined as any, ['_entities', 7, 'name']);

        const remoteSchema = makeExecutableSchema({
          typeDefs,
          resolvers: {
            Query: {
              object: () => ({
                field1: unpathedError,
                field2: 'data',
              }),
            },
          },
        });

        const gatewaySchema = stitchSchemas({
          subschemas: [remoteSchema],
        });

        const query = /* GraphQL */ `
          {
            object {
              field1
              field2
            }
          }
        `;

        const expectedResult: ExecutionResult = {
          data: {
            object: {
              field1: null,
              field2: 'data',
            },
          },
          errors: [unpathedError],
        };

        const gatewayResult = await graphql({ schema: gatewaySchema, source: query });

        expect(gatewayResult).toEqual(expectedResult);
      });
    });
  });
});
