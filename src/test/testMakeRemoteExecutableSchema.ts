/* tslint:disable:no-unused-expression */

import { expect } from 'chai';
import { forAwaitEach } from 'iterall';
import { GraphQLSchema, ExecutionResult, subscribe, parse } from 'graphql';
import {
  subscriptionSchema,
  subscriptionPubSubTrigger,
  subscriptionPubSub,
  makeSchemaRemoteFromLink
} from '../test/testingSchemas';
import { makeRemoteExecutableSchema } from '../stitching';

describe('remote subscriptions', () => {
  let schema: GraphQLSchema;
  before(async () => {
    const remoteSchemaExecConfig = await makeSchemaRemoteFromLink(subscriptionSchema);
    schema = makeRemoteExecutableSchema({
      schema: remoteSchemaExecConfig.schema,
      link: remoteSchemaExecConfig.link
    });
  });

  it('should work', done => {
    const mockNotification = {
      notifications: {
        text: 'Hello world'
      }
    };

    const subscription = parse(`
      subscription Subscription {
        notifications {
          text
        }
      }
    `);

    let notificationCnt = 0;
    subscribe(schema, subscription).then(results => {
      forAwaitEach(results as AsyncIterable<ExecutionResult>, (result: ExecutionResult) => {
        expect(result).to.have.property('data');
        expect(result.data).to.deep.equal(mockNotification);
        !notificationCnt++ ? done() : null;
      });
    }).then(() => {
      subscriptionPubSub.publish(subscriptionPubSubTrigger, mockNotification);
    });
  });

  it('should work without triggering multiple times per notification', done => {
    const mockNotification = {
      notifications: {
        text: 'Hello world'
      }
    };

    const subscription = parse(`
      subscription Subscription {
        notifications {
          text
        }
      }
    `);

    let notificationCnt = 0;
    const sub1 = subscribe(schema, subscription).then(results => {
      forAwaitEach(results as AsyncIterable<ExecutionResult>, (result: ExecutionResult) => {
        expect(result).to.have.property('data');
        expect(result.data).to.deep.equal(mockNotification);
        notificationCnt++;
      });
    });

    const sub2 = subscribe(schema, subscription).then(results => {
      forAwaitEach(results as AsyncIterable<ExecutionResult>, (result: ExecutionResult) => {
        expect(result).to.have.property('data');
        expect(result.data).to.deep.equal(mockNotification);
      });
    });

    Promise.all([sub1, sub2]).then(() => {
      subscriptionPubSub.publish(subscriptionPubSubTrigger, mockNotification);
      subscriptionPubSub.publish(subscriptionPubSubTrigger, mockNotification);

      setTimeout(() => {
        expect(notificationCnt).to.eq(2);
        done();
      }, 0);
    });
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

  it('without comment descriptions', () => {
    const remoteSchema = makeRemoteExecutableSchema({ schema });

    const customScalar = remoteSchema.getType('CustomScalar');
    expect(customScalar.description).to.eq(undefined);
  });

  it('with comment descriptions', () => {
    const remoteSchema = makeRemoteExecutableSchema({
      schema,
      buildSchemaOptions: { commentDescriptions: true }
    });

    const field = remoteSchema.getQueryType().getFields()['custom'];
    expect(field.description).to.eq('Field description');
    const customScalar = remoteSchema.getType('CustomScalar');
    expect(customScalar.description).to.eq('Scalar description');
  });
});
