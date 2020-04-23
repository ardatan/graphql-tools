/* eslint-disable */
import { forAwaitEach } from 'iterall';
import {
  GraphQLSchema,
  ExecutionResult,
  subscribe,
  parse,
  graphql,
  execute,
  print,
} from 'graphql';

import { makeRemoteExecutableSchema } from '../wrap/index';

import {
  propertySchema,
  subscriptionSchema,
  subscriptionPubSubTrigger,
  subscriptionPubSub,
  makeSchemaRemoteFromLink,
} from './fixtures/schemas';

describe('remote queries', () => {
  let schema: GraphQLSchema;
  beforeAll(async () => {
    const remoteSubschemaConfig = await makeSchemaRemoteFromLink(
      propertySchema,
    );
    schema = makeRemoteExecutableSchema({
      schema: remoteSubschemaConfig.schema,
      link: remoteSubschemaConfig.link,
    });
  });

  test('should work', async () => {
    const query = `
      {
        interfaceTest(kind: ONE) {
          kind
          testString
          ...on TestImpl1 {
            foo
          }
          ...on TestImpl2 {
            bar
          }
        }
      }
    `;

    const expected = {
      data: {
        interfaceTest: {
          foo: 'foo',
          kind: 'ONE',
          testString: 'test',
        },
      },
    };

    const result = await graphql(schema, query);
    expect(result).toEqual(expected);
  });
});

describe('remote subscriptions', () => {
  let schema: GraphQLSchema;
  beforeAll(async () => {
    const remoteSubschemaConfig = await makeSchemaRemoteFromLink(
      subscriptionSchema,
    );
    schema = makeRemoteExecutableSchema({
      schema: remoteSubschemaConfig.schema,
      link: remoteSubschemaConfig.link,
    });
  });

  test('should work', (done) => {
    const mockNotification = {
      notifications: {
        text: 'Hello world',
      },
    };

    const subscription = parse(`
      subscription Subscription {
        notifications {
          text
        }
      }
    `);

    let notificationCnt = 0;
    subscribe(schema, subscription)
      .then((results) => {
        forAwaitEach(
          results as AsyncIterable<ExecutionResult>,
          (result: ExecutionResult) => {
            expect(result).toHaveProperty('data');
            expect(result.data).toEqual(mockNotification);
            if (!notificationCnt++) {
              done();
            }
          },
        ).catch(done);
      })
      .then(() =>
        subscriptionPubSub.publish(subscriptionPubSubTrigger, mockNotification),
      )
      .catch(done);
  });

  test('should work without triggering multiple times per notification', (done) => {
    const mockNotification = {
      notifications: {
        text: 'Hello world',
      },
    };

    const subscription = parse(`
        subscription Subscription {
          notifications {
            text
          }
        }
      `);

    let notificationCnt = 0;
    const sub1 = subscribe(schema, subscription).then((results) => {
      forAwaitEach(
        results as AsyncIterable<ExecutionResult>,
        (result: ExecutionResult) => {
          expect(result).toHaveProperty('data');
          expect(result.data).toEqual(mockNotification);
          notificationCnt++;
        },
      ).catch(done);
    });

    const sub2 = subscribe(schema, subscription).then((results) => {
      forAwaitEach(
        results as AsyncIterable<ExecutionResult>,
        (result: ExecutionResult) => {
          expect(result).toHaveProperty('data');
          expect(result.data).toEqual(mockNotification);
        },
      ).catch(done);
    });

    Promise.all([sub1, sub2])
      .then(() => {
        subscriptionPubSub
          .publish(subscriptionPubSubTrigger, mockNotification)
          .catch(done);
        subscriptionPubSub
          .publish(subscriptionPubSubTrigger, mockNotification)
          .catch(done);

        setTimeout(() => {
          expect(notificationCnt).toBe(2);
          done();
        }, 0);
      })
      .catch(done);
  });
});

describe('respects buildSchema options', () => {
  const schema = `
  type Query {
    # Field description
    custom: CustomScalar!
  }

  # Scalar description
  scalar CustomScalar
`;

  test('without comment descriptions', () => {
    const remoteSchema = makeRemoteExecutableSchema({ schema });

    const customScalar = remoteSchema.getType('CustomScalar');
    expect(customScalar.description).toBeUndefined();
  });

  test('with comment descriptions', () => {
    const remoteSchema = makeRemoteExecutableSchema({
      schema,
      buildSchemaOptions: { commentDescriptions: true },
    });

    const field = remoteSchema.getQueryType().getFields()['custom'];
    expect(field.description).toBe('Field description');
    const customScalar = remoteSchema.getType('CustomScalar');
    expect(customScalar.description).toBe('Scalar description');
  });

  describe('when query for multiple fields', () => {
    const schema = `
    type Query {
      fieldA: Int!
      fieldB: Int!
      field3: Int!
    }
  `;
    const query = parse(`
    query {
      fieldA
      fieldB
      field3
    }
  `);
    let calls: Array<any> = [];
    const fetcher = (args: any) => {
      calls.push(args);
      return Promise.resolve({
        data: {
          fieldA: 1,
          fieldB: 2,
          field3: 3,
        },
      });
    };
    const remoteSchema = makeRemoteExecutableSchema({
      fetcher,
      schema,
    });

    beforeEach(() => {
      calls = [];
    });

    // One of the two tests below should work depending upon what the correct intended behaviour is
    it.skip('forwards one upstream query', async () => {
      const result = await execute(remoteSchema, query);
      expect(result).toEqual({
        data: {
          fieldA: 1,
          fieldB: 2,
          field3: 3,
        },
      });

      expect(calls).toHaveLength(1);
      expect(print(calls[0].query)).toEqual(print(query));
    });

    it('forwards three upstream queries', async () => {
      const result = await execute(remoteSchema, query);
      expect(result).toEqual({
        data: {
          fieldA: 1,
          fieldB: 2,
          field3: 3,
        },
      });

      expect(calls).toHaveLength(3);
      expect(print(calls[0].query)).toEqual(`\
{
  fieldA
}
`);
      expect(print(calls[1].query)).toEqual(`\
{
  fieldB
}
`);
      expect(print(calls[2].query)).toEqual(`\
{
  field3
}
`);
    });
  });
});
