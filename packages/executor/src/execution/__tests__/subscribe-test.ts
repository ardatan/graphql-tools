import { expectJSON } from '../../__testUtils__/expectJSON.js';
import { resolveOnNextTick } from '../../__testUtils__/resolveOnNextTick.js';

import {
  parse,
  GraphQLList,
  GraphQLObjectType,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLString,
  GraphQLSchema,
} from 'graphql';

import { ExecutionArgs, createSourceEventStream, subscribe } from '../execute.js';

import { SimplePubSub } from './simplePubSub.js';
import { ExecutionResult, isAsyncIterable, isPromise, MaybePromise } from '@graphql-tools/utils';

interface Email {
  from: string;
  subject: string;
  message: string;
  unread: boolean;
}

const EmailType = new GraphQLObjectType({
  name: 'Email',
  fields: {
    from: { type: GraphQLString },
    subject: { type: GraphQLString },
    asyncSubject: {
      type: GraphQLString,
      resolve: email => Promise.resolve(email.subject),
    },
    message: { type: GraphQLString },
    unread: { type: GraphQLBoolean },
  },
});

const InboxType = new GraphQLObjectType({
  name: 'Inbox',
  fields: {
    total: {
      type: GraphQLInt,
      resolve: inbox => inbox.emails.length,
    },
    unread: {
      type: GraphQLInt,
      resolve: inbox => inbox.emails.filter((email: any) => email.unread).length,
    },
    emails: { type: new GraphQLList(EmailType) },
  },
});

const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    inbox: { type: InboxType },
  },
});

const EmailEventType = new GraphQLObjectType({
  name: 'EmailEvent',
  fields: {
    email: { type: EmailType },
    inbox: { type: InboxType },
  },
});

const emailSchema = new GraphQLSchema({
  query: QueryType,
  subscription: new GraphQLObjectType({
    name: 'Subscription',
    fields: {
      importantEmail: {
        type: EmailEventType,
        args: {
          priority: { type: GraphQLInt },
        },
      },
    },
  }),
});

function createSubscription(pubsub: SimplePubSub<Email>, variableValues?: { readonly [variable: string]: unknown }) {
  const document = parse(`
    subscription ($priority: Int = 0, $shouldDefer: Boolean = false, $asyncResolver: Boolean = false) {
      importantEmail(priority: $priority) {
        email {
          from
          subject
          ... @include(if: $asyncResolver) {
            asyncSubject
          }
        }
        ... @defer(if: $shouldDefer) {
          inbox {
            unread
            total
          }
        }
      }
    }
  `);

  const emails = [
    {
      from: 'joe@graphql.org',
      subject: 'Hello',
      message: 'Hello World',
      unread: false,
    },
  ];

  const data: any = {
    inbox: { emails },
    // FIXME: we shouldn't use mapAsyncIterator here since it makes tests way more complex
    importantEmail: pubsub.getSubscriber(newEmail => {
      emails.push(newEmail);

      return {
        importantEmail: {
          email: newEmail,
          inbox: data.inbox,
        },
      };
    }),
  };

  return subscribe({
    schema: emailSchema,
    document,
    rootValue: data,
    variableValues,
  });
}

// TODO: consider adding this method to testUtils (with tests)
function expectPromise(maybePromise: unknown) {
  expect(isPromise(maybePromise)).toBeTruthy();

  return {
    toResolve() {
      return maybePromise;
    },
    async toRejectWith(message: string) {
      let caughtError: Error;

      try {
        /* c8 ignore next 2 */
        await maybePromise;
      } catch (error) {
        caughtError = error as Error;
        expect(caughtError).toBeInstanceOf(Error);
        expect(caughtError).toHaveProperty('message', message);
      }
    },
  };
}

// TODO: consider adding this method to testUtils (with tests)
function expectEqualPromisesOrValues<T>(value1: MaybePromise<T>, value2: MaybePromise<T>): MaybePromise<T> {
  if (isPromise(value1)) {
    expect(isPromise(value2)).toBeTruthy();
    return Promise.all([value1, value2]).then(resolved => {
      expectJSON(resolved[1]).toDeepEqual(resolved[0]);
      return resolved[0];
    });
  }

  expect(!isPromise(value2)).toBeTruthy();
  expectJSON(value2).toDeepEqual(value1);
  return value1;
}

const DummyQueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    dummy: { type: GraphQLString },
  },
});

function subscribeWithBadFn(subscribeFn: () => unknown): MaybePromise<ExecutionResult | AsyncIterable<unknown>> {
  const schema = new GraphQLSchema({
    query: DummyQueryType,
    subscription: new GraphQLObjectType({
      name: 'Subscription',
      fields: {
        foo: { type: GraphQLString, subscribe: subscribeFn },
      },
    }),
  });
  const document = parse('subscription { foo }');

  return subscribeWithBadArgs({ schema, document });
}

function subscribeWithBadArgs(args: ExecutionArgs): MaybePromise<ExecutionResult | AsyncIterable<unknown>> {
  return expectEqualPromisesOrValues(subscribe(args), createSourceEventStream(args));
}

// Check all error cases when initializing the subscription.
describe('Subscription Initialization Phase', () => {
  it('accepts multiple subscription fields defined in schema', async () => {
    const schema = new GraphQLSchema({
      query: DummyQueryType,
      subscription: new GraphQLObjectType({
        name: 'Subscription',
        fields: {
          foo: { type: GraphQLString },
          bar: { type: GraphQLString },
        },
      }),
    });

    async function* fooGenerator() {
      yield { foo: 'FooValue' };
    }

    const subscription = subscribe({
      schema,
      document: parse('subscription { foo }'),
      rootValue: { foo: fooGenerator },
    });
    expect(isAsyncIterable(subscription)).toBeTruthy();

    // @ts-expect-error
    expect(await subscription.next()).toEqual({
      done: false,
      value: { data: { foo: 'FooValue' } },
    });

    // @ts-expect-error
    expect(await subscription.next()).toEqual({
      done: true,
      value: undefined,
    });
  });

  it('accepts type definition with sync subscribe function', async () => {
    async function* fooGenerator() {
      yield { foo: 'FooValue' };
    }

    const schema = new GraphQLSchema({
      query: DummyQueryType,
      subscription: new GraphQLObjectType({
        name: 'Subscription',
        fields: {
          foo: {
            type: GraphQLString,
            subscribe: fooGenerator,
          },
        },
      }),
    });

    const subscription = subscribe({
      schema,
      document: parse('subscription { foo }'),
    });
    expect(isAsyncIterable(subscription)).toBeTruthy();

    // @ts-expect-error
    expect(await subscription.next()).toEqual({
      done: false,
      value: { data: { foo: 'FooValue' } },
    });

    // @ts-expect-error
    expect(await subscription.next()).toEqual({
      done: true,
      value: undefined,
    });
  });

  it('accepts type definition with async subscribe function', async () => {
    async function* fooGenerator() {
      yield { foo: 'FooValue' };
    }

    const schema = new GraphQLSchema({
      query: DummyQueryType,
      subscription: new GraphQLObjectType({
        name: 'Subscription',
        fields: {
          foo: {
            type: GraphQLString,
            async subscribe() {
              await resolveOnNextTick();
              return fooGenerator();
            },
          },
        },
      }),
    });

    const promise = subscribe({
      schema,
      document: parse('subscription { foo }'),
    });
    expect(isPromise(promise)).toBeTruthy();

    const subscription = await promise;
    expect(isAsyncIterable(subscription)).toBeTruthy();

    // @ts-expect-error
    expect(await subscription.next()).toEqual({
      done: false,
      value: { data: { foo: 'FooValue' } },
    });

    // @ts-expect-error
    expect(await subscription.next()).toEqual({
      done: true,
      value: undefined,
    });
  });

  it('uses a custom default subscribeFieldResolver', async () => {
    const schema = new GraphQLSchema({
      query: DummyQueryType,
      subscription: new GraphQLObjectType({
        name: 'Subscription',
        fields: {
          foo: { type: GraphQLString },
        },
      }),
    });

    async function* fooGenerator() {
      yield { foo: 'FooValue' };
    }

    const subscription = subscribe({
      schema,
      document: parse('subscription { foo }'),
      rootValue: { customFoo: fooGenerator },
      subscribeFieldResolver: root => root.customFoo(),
    });
    expect(isAsyncIterable(subscription)).toBeTruthy();

    // @ts-expect-error
    expect(await subscription.next()).toEqual({
      done: false,
      value: { data: { foo: 'FooValue' } },
    });

    // @ts-expect-error
    expect(await subscription.next()).toEqual({
      done: true,
      value: undefined,
    });
  });

  it('should only resolve the first field of invalid multi-field', async () => {
    async function* fooGenerator() {
      yield { foo: 'FooValue' };
    }

    let didResolveFoo = false;
    let didResolveBar = false;

    const schema = new GraphQLSchema({
      query: DummyQueryType,
      subscription: new GraphQLObjectType({
        name: 'Subscription',
        fields: {
          foo: {
            type: GraphQLString,
            subscribe() {
              didResolveFoo = true;
              return fooGenerator();
            },
          },
          bar: {
            type: GraphQLString,
            /* c8 ignore next 3 */
            subscribe() {
              didResolveBar = true;
            },
          },
        },
      }),
    });

    const subscription = subscribe({
      schema,
      document: parse('subscription { foo bar }'),
    });
    expect(isAsyncIterable(subscription)).toBeTruthy();

    expect(didResolveFoo).toEqual(true);
    expect(didResolveBar).toEqual(false);

    // @ts-expect-error
    expect(await subscription.next()).toHaveProperty('done', false);

    // @ts-expect-error
    expect(await subscription.next()).toEqual({
      done: true,
      value: undefined,
    });
  });

  it('resolves to an error if schema does not support subscriptions', async () => {
    const schema = new GraphQLSchema({ query: DummyQueryType });
    const document = parse('subscription { unknownField }');

    const result = subscribeWithBadArgs({ schema, document });
    expectJSON(result).toDeepEqual({
      errors: [
        {
          message: 'Schema is not configured to execute subscription operation.',
          locations: [{ line: 1, column: 1 }],
        },
      ],
    });
  });

  it('resolves to an error for unknown subscription field', async () => {
    const schema = new GraphQLSchema({
      query: DummyQueryType,
      subscription: new GraphQLObjectType({
        name: 'Subscription',
        fields: {
          foo: { type: GraphQLString },
        },
      }),
    });
    const document = parse('subscription { unknownField }');

    const result = subscribeWithBadArgs({ schema, document });
    expectJSON(result).toDeepEqual({
      errors: [
        {
          message: 'The subscription field "unknownField" is not defined.',
          locations: [{ line: 1, column: 16 }],
        },
      ],
    });
  });

  it('should pass through unexpected errors thrown in subscribe', async () => {
    const schema = new GraphQLSchema({
      query: DummyQueryType,
      subscription: new GraphQLObjectType({
        name: 'Subscription',
        fields: {
          foo: { type: GraphQLString },
        },
      }),
    });

    // @ts-expect-error
    expect(() => subscribeWithBadArgs({ schema, document: {} })).toThrow();
  });

  it('throws an error if subscribe does not return an iterator', async () => {
    const expectedResult = {
      errors: [
        {
          message: 'Subscription field must return Async Iterable. Received: "test".',
          locations: [{ line: 1, column: 16 }],
          path: ['foo'],
        },
      ],
    };

    expectJSON(subscribeWithBadFn(() => 'test')).toDeepEqual(expectedResult);

    expectJSON(await expectPromise(subscribeWithBadFn(() => Promise.resolve('test'))).toResolve()).toDeepEqual(
      expectedResult
    );
  });

  it('resolves to an error for subscription resolver errors', async () => {
    const expectedResult = {
      errors: [
        {
          message: 'test error',
          locations: [{ line: 1, column: 16 }],
          path: ['foo'],
        },
      ],
    };

    expectJSON(
      // Returning an error
      subscribeWithBadFn(() => new Error('test error'))
    ).toDeepEqual(expectedResult);

    expectJSON(
      // Throwing an error
      subscribeWithBadFn(() => {
        throw new Error('test error');
      })
    ).toDeepEqual(expectedResult);

    expectJSON(
      // Resolving to an error
      await expectPromise(subscribeWithBadFn(() => Promise.resolve(new Error('test error')))).toResolve()
    ).toDeepEqual(expectedResult);

    expectJSON(
      // Rejecting with an error
      await expectPromise(subscribeWithBadFn(() => Promise.reject(new Error('test error')))).toResolve()
    ).toDeepEqual(expectedResult);
  });

  it('resolves to an error if variables were wrong type', async () => {
    const schema = new GraphQLSchema({
      query: DummyQueryType,
      subscription: new GraphQLObjectType({
        name: 'Subscription',
        fields: {
          foo: {
            type: GraphQLString,
            args: { arg: { type: GraphQLInt } },
          },
        },
      }),
    });

    const variableValues = { arg: 'meow' };
    const document = parse(`
      subscription ($arg: Int) {
        foo(arg: $arg)
      }
    `);

    // If we receive variables that cannot be coerced correctly, subscribe() will
    // resolve to an ExecutionResult that contains an informative error description.
    const result = subscribeWithBadArgs({ schema, document, variableValues });
    expectJSON(result).toDeepEqual({
      errors: [
        {
          message: 'Variable "$arg" got invalid value "meow"; Int cannot represent non-integer value: "meow"',
          locations: [{ line: 2, column: 21 }],
        },
      ],
    });
  });
});

// Once a subscription returns a valid AsyncIterator, it can still yield errors.
describe('Subscription Publish Phase', () => {
  it('produces a payload for multiple subscribe in same subscription', async () => {
    const pubsub = new SimplePubSub<Email>();

    const subscription = createSubscription(pubsub);
    expect(isAsyncIterable(subscription)).toBeTruthy();

    const secondSubscription = createSubscription(pubsub);
    expect(isAsyncIterable(secondSubscription)).toBeTruthy();

    // @ts-expect-error
    const payload1 = subscription.next();
    // @ts-expect-error
    const payload2 = secondSubscription.next();

    expect(
      pubsub.emit({
        from: 'yuzhi@graphql.org',
        subject: 'Alright',
        message: 'Tests are good',
        unread: true,
      })
    ).toEqual(true);

    const expectedPayload = {
      done: false,
      value: {
        data: {
          importantEmail: {
            email: {
              from: 'yuzhi@graphql.org',
              subject: 'Alright',
            },
            inbox: {
              unread: 1,
              total: 2,
            },
          },
        },
      },
    };

    expect(await payload1).toEqual(expectedPayload);
    expect(await payload2).toEqual(expectedPayload);
  });

  it('produces a payload when queried fields are async', async () => {
    const pubsub = new SimplePubSub<Email>();

    const subscription = createSubscription(pubsub, { asyncResolver: true });
    expect(isAsyncIterable(subscription)).toBeTruthy();

    expect(
      pubsub.emit({
        from: 'yuzhi@graphql.org',
        subject: 'Alright',
        message: 'Tests are good',
        unread: true,
      })
    ).toBeTruthy();

    // @ts-expect-error we have asserted it is an AsyncIterable
    expectJSON(await subscription.next()).toDeepEqual({
      done: false,
      value: {
        data: {
          importantEmail: {
            email: {
              from: 'yuzhi@graphql.org',
              subject: 'Alright',
              asyncSubject: 'Alright',
            },
            inbox: {
              unread: 1,
              total: 2,
            },
          },
        },
      },
    });
    // @ts-expect-error we have asserted it is an AsyncIterable
    expectJSON(await subscription.return()).toDeepEqual({
      done: true,
      value: undefined,
    });
  });

  it('produces a payload per subscription event', async () => {
    const pubsub = new SimplePubSub<Email>();
    const subscription = createSubscription(pubsub);
    expect(isAsyncIterable(subscription)).toBeTruthy();

    // Wait for the next subscription payload.
    // @ts-expect-error
    const payload = subscription.next();

    // A new email arrives!
    expect(
      pubsub.emit({
        from: 'yuzhi@graphql.org',
        subject: 'Alright',
        message: 'Tests are good',
        unread: true,
      })
    ).toEqual(true);

    // The previously waited on payload now has a value.
    expect(await payload).toEqual({
      done: false,
      value: {
        data: {
          importantEmail: {
            email: {
              from: 'yuzhi@graphql.org',
              subject: 'Alright',
            },
            inbox: {
              unread: 1,
              total: 2,
            },
          },
        },
      },
    });

    // Another new email arrives, before subscription.next() is called.
    expect(
      pubsub.emit({
        from: 'hyo@graphql.org',
        subject: 'Tools',
        message: 'I <3 making things',
        unread: true,
      })
    ).toEqual(true);

    // The next waited on payload will have a value.
    // @ts-expect-error
    expect(await subscription.next()).toEqual({
      done: false,
      value: {
        data: {
          importantEmail: {
            email: {
              from: 'hyo@graphql.org',
              subject: 'Tools',
            },
            inbox: {
              unread: 2,
              total: 3,
            },
          },
        },
      },
    });

    // The client decides to disconnect.
    // @ts-expect-error
    expect(await subscription.return()).toEqual({
      done: true,
      value: undefined,
    });

    // Which may result in disconnecting upstream services as well.
    expect(
      pubsub.emit({
        from: 'adam@graphql.org',
        subject: 'Important',
        message: 'Read me please',
        unread: true,
      })
    ).toEqual(false); // No more listeners.

    // Awaiting a subscription after closing it results in completed results.
    // @ts-expect-error
    expect(await subscription.next()).toEqual({
      done: true,
      value: undefined,
    });
  });

  it('produces additional payloads for subscriptions with @defer', async () => {
    const pubsub = new SimplePubSub<Email>();
    const subscription = await createSubscription(pubsub, {
      shouldDefer: true,
    });
    expect(isAsyncIterable(subscription)).toBeTruthy();
    // Wait for the next subscription payload.
    // @ts-expect-error we have asserted it is an async iterable
    const payload = subscription.next();

    // A new email arrives!
    expect(
      pubsub.emit({
        from: 'yuzhi@graphql.org',
        subject: 'Alright',
        message: 'Tests are good',
        unread: true,
      })
    ).toBeTruthy();

    // The previously waited on payload now has a value.
    expectJSON(await payload).toDeepEqual({
      done: false,
      value: {
        data: {
          importantEmail: {
            email: {
              from: 'yuzhi@graphql.org',
              subject: 'Alright',
            },
          },
        },
        hasNext: true,
      },
    });

    // Wait for the next payload from @defer
    // @ts-expect-error we have asserted it is an async iterable
    expectJSON(await subscription.next()).toDeepEqual({
      done: false,
      value: {
        incremental: [
          {
            data: {
              inbox: {
                unread: 1,
                total: 2,
              },
            },
            path: ['importantEmail'],
          },
        ],
        hasNext: false,
      },
    });

    // Another new email arrives, after all incrementally delivered payloads are received.
    expect(
      pubsub.emit({
        from: 'hyo@graphql.org',
        subject: 'Tools',
        message: 'I <3 making things',
        unread: true,
      })
    ).toBeTruthy();

    // The next waited on payload will have a value.
    // @ts-expect-error we have asserted it is an async iterable
    expectJSON(await subscription.next()).toDeepEqual({
      done: false,
      value: {
        data: {
          importantEmail: {
            email: {
              from: 'hyo@graphql.org',
              subject: 'Tools',
            },
          },
        },
        hasNext: true,
      },
    });

    // Another new email arrives, before the incrementally delivered payloads from the last email was received.
    expect(
      pubsub.emit({
        from: 'adam@graphql.org',
        subject: 'Important',
        message: 'Read me please',
        unread: true,
      })
    ).toBeTruthy();

    // Deferred payload from previous event is received.
    // @ts-expect-error we have asserted it is an async iterable
    expectJSON(await subscription.next()).toDeepEqual({
      done: false,
      value: {
        incremental: [
          {
            data: {
              inbox: {
                unread: 2,
                total: 3,
              },
            },
            path: ['importantEmail'],
          },
        ],
        hasNext: false,
      },
    });

    // Next payload from last event
    // @ts-expect-error we have asserted it is an async iterable
    expectJSON(await subscription.next()).toDeepEqual({
      done: false,
      value: {
        data: {
          importantEmail: {
            email: {
              from: 'adam@graphql.org',
              subject: 'Important',
            },
          },
        },
        hasNext: true,
      },
    });

    // The client disconnects before the deferred payload is consumed.
    // @ts-expect-error we have asserted it is an async iterable
    expectJSON(await subscription.return()).toDeepEqual({
      done: true,
      value: undefined,
    });

    // Awaiting a subscription after closing it results in completed results.
    // @ts-expect-error we have asserted it is an async iterable
    expectJSON(await subscription.next()).toDeepEqual({
      done: true,
      value: undefined,
    });
  });

  it('produces a payload when there are multiple events', async () => {
    const pubsub = new SimplePubSub<Email>();
    const subscription = createSubscription(pubsub);
    expect(isAsyncIterable(subscription)).toBeTruthy();

    // @ts-expect-error
    let payload = subscription.next();

    // A new email arrives!
    expect(
      pubsub.emit({
        from: 'yuzhi@graphql.org',
        subject: 'Alright',
        message: 'Tests are good',
        unread: true,
      })
    ).toEqual(true);

    expect(await payload).toEqual({
      done: false,
      value: {
        data: {
          importantEmail: {
            email: {
              from: 'yuzhi@graphql.org',
              subject: 'Alright',
            },
            inbox: {
              unread: 1,
              total: 2,
            },
          },
        },
      },
    });

    // @ts-expect-error
    payload = subscription.next();

    // A new email arrives!
    expect(
      pubsub.emit({
        from: 'yuzhi@graphql.org',
        subject: 'Alright 2',
        message: 'Tests are good 2',
        unread: true,
      })
    ).toEqual(true);

    expect(await payload).toEqual({
      done: false,
      value: {
        data: {
          importantEmail: {
            email: {
              from: 'yuzhi@graphql.org',
              subject: 'Alright 2',
            },
            inbox: {
              unread: 2,
              total: 3,
            },
          },
        },
      },
    });
  });

  it('should not trigger when subscription is already done', async () => {
    const pubsub = new SimplePubSub<Email>();
    const subscription = createSubscription(pubsub);
    expect(isAsyncIterable(subscription)).toBeTruthy();

    // @ts-expect-error
    let payload = subscription.next();

    // A new email arrives!
    expect(
      pubsub.emit({
        from: 'yuzhi@graphql.org',
        subject: 'Alright',
        message: 'Tests are good',
        unread: true,
      })
    ).toEqual(true);

    expect(await payload).toEqual({
      done: false,
      value: {
        data: {
          importantEmail: {
            email: {
              from: 'yuzhi@graphql.org',
              subject: 'Alright',
            },
            inbox: {
              unread: 1,
              total: 2,
            },
          },
        },
      },
    });

    // @ts-expect-error
    payload = subscription.next();
    // @ts-expect-error
    await subscription.return();

    // A new email arrives!
    expect(
      pubsub.emit({
        from: 'yuzhi@graphql.org',
        subject: 'Alright 2',
        message: 'Tests are good 2',
        unread: true,
      })
    ).toEqual(false);

    expect(await payload).toEqual({
      done: true,
      value: undefined,
    });
  });

  it('should not trigger when subscription is thrown', async () => {
    const pubsub = new SimplePubSub<Email>();
    const subscription = createSubscription(pubsub);
    expect(isAsyncIterable(subscription)).toBeTruthy();

    // @ts-expect-error
    let payload = subscription.next();

    // A new email arrives!
    expect(
      pubsub.emit({
        from: 'yuzhi@graphql.org',
        subject: 'Alright',
        message: 'Tests are good',
        unread: true,
      })
    ).toEqual(true);

    expect(await payload).toEqual({
      done: false,
      value: {
        data: {
          importantEmail: {
            email: {
              from: 'yuzhi@graphql.org',
              subject: 'Alright',
            },
            inbox: {
              unread: 1,
              total: 2,
            },
          },
        },
      },
    });

    // @ts-expect-error
    payload = subscription.next();

    // Throw error
    let caughtError;
    try {
      /* c8 ignore next 2 */
      // @ts-expect-error
      await subscription.throw('ouch');
    } catch (e) {
      caughtError = e;
    }
    expect(caughtError).toEqual('ouch');

    expect(await payload).toEqual({
      done: true,
      value: undefined,
    });
  });

  it('event order is correct for multiple publishes', async () => {
    const pubsub = new SimplePubSub<Email>();
    const subscription = createSubscription(pubsub);
    expect(isAsyncIterable(subscription)).toBeTruthy();

    // @ts-expect-error
    let payload = subscription.next();

    // A new email arrives!
    expect(
      pubsub.emit({
        from: 'yuzhi@graphql.org',
        subject: 'Message',
        message: 'Tests are good',
        unread: true,
      })
    ).toEqual(true);

    // A new email arrives!
    expect(
      pubsub.emit({
        from: 'yuzhi@graphql.org',
        subject: 'Message 2',
        message: 'Tests are good 2',
        unread: true,
      })
    ).toEqual(true);

    expect(await payload).toEqual({
      done: false,
      value: {
        data: {
          importantEmail: {
            email: {
              from: 'yuzhi@graphql.org',
              subject: 'Message',
            },
            inbox: {
              unread: 2,
              total: 3,
            },
          },
        },
      },
    });

    // @ts-expect-error
    payload = subscription.next();

    expect(await payload).toEqual({
      done: false,
      value: {
        data: {
          importantEmail: {
            email: {
              from: 'yuzhi@graphql.org',
              subject: 'Message 2',
            },
            inbox: {
              unread: 2,
              total: 3,
            },
          },
        },
      },
    });
  });

  it('should handle error during execution of source event', async () => {
    async function* generateMessages() {
      yield 'Hello';
      yield 'Goodbye';
      yield 'Bonjour';
    }

    const schema = new GraphQLSchema({
      query: DummyQueryType,
      subscription: new GraphQLObjectType({
        name: 'Subscription',
        fields: {
          newMessage: {
            type: GraphQLString,
            subscribe: generateMessages,
            resolve(message) {
              if (message === 'Goodbye') {
                throw new Error('Never leave.');
              }
              return message;
            },
          },
        },
      }),
    });

    const document = parse('subscription { newMessage }');
    const subscription = subscribe({ schema, document });
    expect(isAsyncIterable(subscription)).toBeTruthy();

    // @ts-expect-error
    expect(await subscription.next()).toEqual({
      done: false,
      value: {
        data: { newMessage: 'Hello' },
      },
    });

    // An error in execution is presented as such.
    // @ts-expect-error
    expectJSON(await subscription.next()).toDeepEqual({
      done: false,
      value: {
        data: { newMessage: null },
        errors: [
          {
            message: 'Never leave.',
            locations: [{ line: 1, column: 16 }],
            path: ['newMessage'],
          },
        ],
      },
    });

    // However that does not close the response event stream.
    // Subsequent events are still executed.
    // @ts-expect-error
    expectJSON(await subscription.next()).toDeepEqual({
      done: false,
      value: {
        data: { newMessage: 'Bonjour' },
      },
    });

    // @ts-expect-error
    expectJSON(await subscription.next()).toDeepEqual({
      done: true,
      value: undefined,
    });
  });

  it('should pass through error thrown in source event stream', async () => {
    async function* generateMessages() {
      yield 'Hello';
      throw new Error('test error');
    }

    const schema = new GraphQLSchema({
      query: DummyQueryType,
      subscription: new GraphQLObjectType({
        name: 'Subscription',
        fields: {
          newMessage: {
            type: GraphQLString,
            resolve: message => message,
            subscribe: generateMessages,
          },
        },
      }),
    });

    const document = parse('subscription { newMessage }');
    const subscription = subscribe({ schema, document });
    expect(isAsyncIterable(subscription)).toBeTruthy();

    // @ts-expect-error
    expect(await subscription.next()).toEqual({
      done: false,
      value: {
        data: { newMessage: 'Hello' },
      },
    });

    // @ts-expect-error
    await expectPromise(subscription.next()).toRejectWith('test error');

    // @ts-expect-error
    expect(await subscription.next()).toEqual({
      done: true,
      value: undefined,
    });
  });
});
