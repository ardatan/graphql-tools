import { graphql, execute, ExecutionResult } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';
import { delegateToSchema, SubschemaConfig, ExecutionParams, SyncExecutor } from '../src';

describe('batch execution', () => {
  it('should batch', async () => {
    const innerSchema = makeExecutableSchema({
      typeDefs: `
        type Query {
          field1: String
          field2: String
        }
      `,
      resolvers: {
        Query: {
          field1: () => 'test1',
          field2: () => 'test2',
        },
      },
    });

    let executions = 0;

    const innerSubschemaConfig: SubschemaConfig = {
      schema: innerSchema,
      batch: true,
      executor: ((params: ExecutionParams): ExecutionResult => {
        executions++;
        return execute(innerSchema, params.document, undefined, params.context, params.variables) as ExecutionResult;
      }) as SyncExecutor
    }

    const outerSchema = makeExecutableSchema({
      typeDefs: `
        type Query {
          field1: String
          field2: String
        }
      `,
      resolvers: {
        Query: {
          field1: (_parent, _args, context, info) => delegateToSchema({ schema: innerSubschemaConfig, context, info }),
          field2: (_parent, _args, context, info) => delegateToSchema({ schema: innerSubschemaConfig, context, info }),
        },
      },
    });

    const expectedResult = {
      data: {
        field1: 'test1',
        field2: 'test2',
      },
    };

    const result = await graphql(outerSchema, '{ field1 field2 }', undefined, {});

    expect(result).toEqual(expectedResult);
    expect(executions).toEqual(1);
  });
});
