/* tslint:disable:no-unused-expression */

import { expect } from 'chai';
import { forAwaitEach } from 'iterall';
import { GraphQLSchema, ExecutionResult, subscribe, parse } from 'graphql';
import {
  subscriptionSchema,
  subscriptionPubSubTrigger,
  subscriptionPubSub,
  makeSchemaRemoteFromLink,
} from '../test/testingSchemas';

describe('remote subscriptions', () => {
  let schema: GraphQLSchema;
  before(async () => {
    schema = await makeSchemaRemoteFromLink(subscriptionSchema);
  });

  it('should work', done => {
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
    subscribe(schema, subscription).then(results =>
      forAwaitEach(
        results as AsyncIterable<ExecutionResult>,
        (result: ExecutionResult) => {
          expect(result).to.have.property('data');
          expect(result.data).to.deep.equal(mockNotification);
          !notificationCnt++ ? done() : null;
        },
      ),
    );

    subscriptionPubSub.publish(subscriptionPubSubTrigger, mockNotification);
  });
});
