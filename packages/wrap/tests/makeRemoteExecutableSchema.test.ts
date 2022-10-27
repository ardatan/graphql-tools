import { GraphQLSchema, parse, print, buildSchema, graphql } from 'graphql';

import { wrapSchema } from '../src/index.js';

import {
  propertySchema,
  subscriptionSchema,
  subscriptionPubSubTrigger,
  subscriptionPubSub,
  makeSchemaRemote,
} from '../../testing/fixtures/schemas.js';
import { subscribe } from '@graphql-tools/executor';
import { ExecutionResult } from '@graphql-tools/utils';

describe('remote queries', () => {
  let schema: GraphQLSchema;
  beforeAll(async () => {
    const remoteSubschemaConfig = await makeSchemaRemote(propertySchema);
    schema = wrapSchema(remoteSubschemaConfig);
  });

  test('should handle interfaces correctly', async () => {
    const query = /* GraphQL */ `
      {
        interfaceTest(kind: ONE) {
          kind
          testString
          ... on TestImpl1 {
            foo
          }
          ... on TestImpl2 {
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

    const result = await graphql({ schema, source: query });
    expect(result).toEqual(expected);
  });

  test('should handle aliases properly', async () => {
    const query = /* GraphQL */ `
      query AliasedExample {
        propertyInAnArray: properties(limit: 1) {
          id
          name
          loc: location {
            title: name
          }
        }
      }
    `;

    const result: any = await graphql({ schema, source: query });

    expect(result?.data?.['propertyInAnArray']).toHaveLength(1);
    expect(result?.data?.['propertyInAnArray'][0]['id']).toBeTruthy();
    expect(result?.data?.['propertyInAnArray'][0]['name']).toBeTruthy();
    expect(result?.data?.['propertyInAnArray'][0]['loc']).toBeTruthy();
    expect(result?.data?.['propertyInAnArray'][0]['loc']['title']).toBeTruthy();
  });
});

describe('remote subscriptions', () => {
  let schema: GraphQLSchema;
  beforeAll(async () => {
    const remoteSubschemaConfig = await makeSchemaRemote(subscriptionSchema);
    schema = wrapSchema(remoteSubschemaConfig);
  });

  test('should work', async () => {
    const mockNotification = {
      notifications: {
        text: 'Hello world',
      },
    };

    const subscription = parse(/* GraphQL */ `
      subscription Subscription {
        notifications {
          text
        }
      }
    `);

    const sub = (await subscribe({ schema, document: subscription })) as AsyncIterableIterator<ExecutionResult>;

    const payload = sub.next();

    await subscriptionPubSub.publish(subscriptionPubSubTrigger, mockNotification);

    expect(await payload).toEqual({ done: false, value: { data: mockNotification } });
  });

  test('should work without triggering multiple times per notification', done => {
    const mockNotification = {
      notifications: {
        text: 'Hello world',
      },
    };

    const subscription = parse(/* GraphQL */ `
      subscription Subscription {
        notifications {
          text
        }
      }
    `);

    let notificationCnt = 0;
    const sub1 = Promise.resolve(subscribe({ schema, document: subscription }));
    sub1.then(async results => {
      for await (const result of results as AsyncIterable<ExecutionResult>) {
        expect(result).toHaveProperty('data');
        expect(result.data).toEqual(mockNotification);
        notificationCnt++;
      }
    });

    const sub2 = Promise.resolve(subscribe({ schema, document: subscription }));
    sub2.then(async results => {
      for await (const result of results as AsyncIterable<ExecutionResult>) {
        expect(result).toHaveProperty('data');
        expect(result.data).toEqual(mockNotification);
      }
    });

    Promise.all([sub1, sub2]).then(() => {
      subscriptionPubSub.publish(subscriptionPubSubTrigger, mockNotification);
      subscriptionPubSub.publish(subscriptionPubSubTrigger, mockNotification);
      setTimeout(() => {
        expect(notificationCnt).toBe(2);
        done();
      }, 0);
    });
  });
});

describe('when query for multiple fields', () => {
  const typeDefs = /* GraphQL */ `
    type Query {
      fieldA: Int!
      fieldB: Int!
      field3: Int!
    }
  `;
  const query = /* GraphQL */ `
    query {
      fieldA
      fieldB
      field3
    }
  `;
  let calls: Array<any> = [];
  const executor = (args: any): any => {
    calls.push(args);
    return Promise.resolve({
      data: {
        fieldA: 1,
        fieldB: 2,
        field3: 3,
      },
    });
  };
  const remoteSchema = wrapSchema({
    schema: buildSchema(typeDefs),
    executor,
  });

  beforeEach(() => {
    calls = [];
  });

  it('forwards three upstream queries', async () => {
    const result = await graphql({ schema: remoteSchema, source: query });
    expect(result).toEqual({
      data: {
        fieldA: 1,
        fieldB: 2,
        field3: 3,
      },
    });

    expect(calls).toHaveLength(3);
    expect(print(calls[0].document).trim()).toEqual(
      `\
{
  fieldA
}
`.trim()
    );
    expect(print(calls[1].document).trim()).toEqual(
      `\
{
  fieldB
}
`.trim()
    );
    expect(print(calls[2].document).trim()).toEqual(
      `\
{
  field3
}
`.trim()
    );
  });
});
