import { graphql } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';
import { createDefaultExecutor, delegateToSchema, SubschemaConfig } from '../src/index.js';
import { stitchSchemas } from '@graphql-tools/stitch';
import { FilterObjectFields } from '@graphql-tools/wrap';
import { Executor } from '@graphql-tools/utils';

describe('batch execution', () => {
  it('should batch', async () => {
    const innerSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
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

    const defaultExecutor = createDefaultExecutor(innerSchema);
    const innerSubschemaConfig: SubschemaConfig = {
      schema: innerSchema,
      batch: true,
      executor: request => {
        executions++;
        return defaultExecutor(request);
      },
    };

    const outerSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
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

    const result = await graphql({ schema: outerSchema, source: '{ field1 field2 }' });

    expect(result).toEqual(expectedResult);
    expect(executions).toEqual(1);
  });

  it('should share batching dataloader between subschemas when using a common executor', async () => {
    const innerSchemaA = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Object {
          field1: String
          field2: String
        }
        type Query {
          objectA: Object
        }
      `,
      resolvers: {
        Query: {
          objectA: () => ({}),
        },
        Object: {
          field1: () => 'test1',
          field2: () => 'test2',
        },
      },
    });

    const innerSchemaB = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Object {
          field3: String
        }
        type Query {
          objectB: Object
        }
      `,
      resolvers: {
        Query: {
          objectB: () => ({}),
        },
        Object: {
          field3: () => 'test3',
        },
      },
    });

    let executions = 0;

    const defaultExecutor = createDefaultExecutor(innerSchemaA);
    const executor: Executor = request => {
      executions++;
      return defaultExecutor(request);
    };

    const innerSubschemaConfigA: Array<SubschemaConfig> = [
      {
        schema: innerSchemaA,
        transforms: [new FilterObjectFields((typeName, fieldName) => typeName !== 'Object' || fieldName !== 'field2')],
        merge: {
          Object: {
            fieldName: 'objectA',
            args: () => ({}),
          },
        },
        batch: true,
        executor,
      },
      {
        schema: innerSchemaA,
        transforms: [new FilterObjectFields((typeName, fieldName) => typeName !== 'Object' || fieldName !== 'field1')],
        merge: {
          Object: {
            fieldName: 'objectA',
            args: () => ({}),
          },
        },
        batch: true,
        executor,
      },
    ];

    const innerSubschemaConfigB: SubschemaConfig = {
      schema: innerSchemaB,
      merge: {
        Object: {
          fieldName: 'objectB',
          args: () => ({}),
        },
      },
    };

    const query = '{ objectB { field1 field2 field3 } }';

    const expectedResult = {
      data: {
        objectB: {
          field1: 'test1',
          field2: 'test2',
          field3: 'test3',
        },
      },
    };

    const outerSchemaWithSubschemasAsArray = stitchSchemas({
      subschemas: [...innerSubschemaConfigA, innerSubschemaConfigB],
    });

    const resultWhenAsArray = await graphql({ schema: outerSchemaWithSubschemasAsArray, source: query });

    expect(resultWhenAsArray).toEqual(expectedResult);
    expect(executions).toEqual(1);

    const outerSchemaWithSubschemasSpread = stitchSchemas({
      subschemas: [...innerSubschemaConfigA, innerSubschemaConfigB],
    });

    const resultWhenSpread = await graphql({ schema: outerSchemaWithSubschemasSpread, source: query });

    expect(resultWhenSpread).toEqual(expectedResult);
    expect(executions).toEqual(2);
  });
});
