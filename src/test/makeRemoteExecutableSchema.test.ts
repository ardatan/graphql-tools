import { forAwaitEach } from 'iterall';
import {
  GraphQLSchema,
  ExecutionResult,
  subscribe,
  parse,
  graphql,
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
});
