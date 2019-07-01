/* tslint:disable:no-unused-expression */

import { expect } from 'chai';
import {
  graphql,
  GraphQLSchema,
  ExecutionResult,
  subscribe,
  parse,
  GraphQLField,
  GraphQLNamedType,
  GraphQLScalarType,
  FieldNode,
  printSchema
} from 'graphql';
import mergeSchemas from '../stitching/mergeSchemas';
import {
  transformSchema,
  FilterRootFields,
  RenameTypes,
  RenameRootFields,
  RenameObjectFields,
  FilterObjectFields,
  TransformObjectFields,
} from '../transforms';
import {
  propertySchema,
  bookingSchema,
  subscriptionSchema,
  subscriptionPubSub,
  subscriptionPubSubTrigger,
} from './testingSchemas';
import { forAwaitEach } from 'iterall';
import { createResolveType, fieldToFieldConfig } from '../stitching/schemaRecreation';
import { makeExecutableSchema } from '../makeExecutableSchema';
import { delegateToSchema } from '../stitching';

let linkSchema = `
  """
  A new type linking the Property type.
  """
  type LinkType {
    test: String
    """
    The property.
    """
    property: Properties_Property
  }

  interface Node {
    id: ID!
  }

  extend type Bookings_Booking implements Node {
    """
    The property of the booking.
    """
    property: Properties_Property
  }

  extend type Properties_Property implements Node {
    """
    A list of bookings.
    """
    bookings(
      """
      The maximum number of bookings to retrieve.
      """
      limit: Int
    ): [Bookings_Booking]
  }

  extend type Query {
    linkTest: LinkType
    node(id: ID!): Node
    nodes: [Node]
  }

  extend type Bookings_Customer implements Node
`;

describe('merge schemas through transforms', () => {
  let mergedSchema: GraphQLSchema;

  before(async () => {
    // namespace and strip schemas
    const transformedPropertySchema = transformSchema(propertySchema, [
      new FilterRootFields(
        (operation: string, rootField: string) =>
          'Query.properties' === `${operation}.${rootField}`,
      ),
      new RenameTypes((name: string) => `Properties_${name}`),
      new RenameRootFields((operation: string, name: string) => `Properties_${name}`),
    ]);
    const transformedBookingSchema = transformSchema(bookingSchema, [
      new FilterRootFields(
        (operation: string, rootField: string) =>
          'Query.bookings' === `${operation}.${rootField}`,
      ),
      new RenameTypes((name: string) => `Bookings_${name}`),
      new RenameRootFields((operation: string, name: string) => `Bookings_${name}`),
    ]);
    const transformedSubscriptionSchema = transformSchema(subscriptionSchema, [
      new FilterRootFields(
        (operation: string, rootField: string) =>
          // must include a Query type otherwise graphql will error
          'Query.notifications' === `${operation}.${rootField}` ||
          'Subscription.notifications' === `${operation}.${rootField}`,
      ),
      new RenameTypes((name: string) => `Subscriptions_${name}`),
      new RenameRootFields(
        (operation: string, name: string) => `Subscriptions_${name}`),
    ]);

    mergedSchema = mergeSchemas({
      schemas: [
        transformedPropertySchema,
        transformedBookingSchema,
        transformedSubscriptionSchema,
        linkSchema,
      ],
      resolvers: {
        Query: {
          // delegating directly, no subschemas or mergeInfo
          node(parent, args, context, info) {
            if (args.id.startsWith('p')) {
              return info.mergeInfo.delegateToSchema({
                schema: propertySchema,
                operation: 'query',
                fieldName: 'propertyById',
                args,
                context,
                info,
                transforms: transformedPropertySchema.transforms,
              });
            } else if (args.id.startsWith('b')) {
              return info.mergeInfo.delegateToSchema({
                schema: bookingSchema,
                operation: 'query',
                fieldName: 'bookingById',
                args,
                context,
                info,
                transforms: transformedBookingSchema.transforms,
              });
            } else if (args.id.startsWith('c')) {
              return info.mergeInfo.delegateToSchema({
                schema: bookingSchema,
                operation: 'query',
                fieldName: 'customerById',
                args,
                context,
                info,
                transforms: transformedBookingSchema.transforms,
              });
            } else {
              throw new Error('invalid id');
            }
          },
        },
        Properties_Property: {
          bookings: {
            fragment: 'fragment PropertyFragment on Property { id }',
            resolve(parent, args, context, info) {
              return info.mergeInfo.delegateToSchema({
                schema: bookingSchema,
                operation: 'query',
                fieldName: 'bookingsByPropertyId',
                args: {
                  propertyId: parent.id,
                  limit: args.limit ? args.limit : null,
                },
                context,
                info,
                transforms: transformedBookingSchema.transforms,
              });
            },
          },
        },
        Bookings_Booking: {
          property: {
            fragment: 'fragment BookingFragment on Booking { propertyId }',
            resolve(parent, args, context, info) {
              return info.mergeInfo.delegateToSchema({
                schema: propertySchema,
                operation: 'query',
                fieldName: 'propertyById',
                args: {
                  id: parent.propertyId,
                },
                context,
                info,
                transforms: transformedPropertySchema.transforms,
              });
            },
          },
        },
      },
    });
  });

  // FIXME fragemnt replacements
  it('node should work', async () => {
    const result = await graphql(
      mergedSchema,
      `
        query($pid: ID!, $bid: ID!) {
          property: node(id: $pid) {
            __typename
            ... on Properties_Property {
              name
              bookings {
                startTime
                endTime
              }
            }
          }
          booking: node(id: $bid) {
            __typename
            ... on Bookings_Booking {
              startTime
              endTime
              property {
                id
                name
              }
            }
          }
        }
      `,
      {},
      {},
      {
        pid: 'p1',
        bid: 'b1',
      },
    );

    expect(result).to.deep.equal({
      data: {
        booking: {
          __typename: 'Bookings_Booking',
          endTime: '2016-06-03',
          property: {
            id: 'p1',
            name: 'Super great hotel',
          },
          startTime: '2016-05-04',
        },
        property: {
          __typename: 'Properties_Property',
          bookings: [
            {
              endTime: '2016-06-03',
              startTime: '2016-05-04',
            },
            {
              endTime: '2016-07-03',
              startTime: '2016-06-04',
            },
            {
              endTime: '2016-09-03',
              startTime: '2016-08-04',
            },
          ],
          name: 'Super great hotel',
        },
      },
    });
  });

  it('local subscriptions should work even if root fields are renamed', done => {
    const originalNotification = {
      notifications: {
        text: 'Hello world',
      },
    };

    const transformedNotification = {
      Subscriptions_notifications: originalNotification.notifications
    };

    const subscription = parse(`
      subscription Subscription {
        Subscriptions_notifications {
          text
        }
      }
    `);

    let notificationCnt = 0;
    subscribe(mergedSchema, subscription)
      .then(results => {
        forAwaitEach(
          results as AsyncIterable<ExecutionResult>,
          (result: ExecutionResult) => {
            expect(result).to.have.property('data');
            expect(result.data).to.deep.equal(transformedNotification);
            !notificationCnt++ ? done() : null;
          },
        ).catch(done);
      }).then(() => {
        subscriptionPubSub.publish(subscriptionPubSubTrigger, originalNotification);
      }).catch(done);
  });
});

describe('transform object fields', () => {
  let transformedPropertySchema: GraphQLSchema;

  before(async () => {
    const resolveType = createResolveType((name: string, type: GraphQLNamedType): GraphQLNamedType => type);
    transformedPropertySchema = transformSchema(propertySchema, [
      new TransformObjectFields(
        (typeName: string, fieldName: string, field: GraphQLField<any, any>) => {
          const fieldConfig = fieldToFieldConfig(field, resolveType, true);
          if (typeName !== 'Property' || fieldName !== 'name') {
            return fieldConfig;
          }
          fieldConfig.resolve = () => 'test';
          return fieldConfig;
        },
        (typeName: string, fieldName: string, fieldNode: FieldNode) => {
          if (typeName !== 'Property' || fieldName !== 'name') {
            return fieldNode;
          }
          const newFieldNode = {
            ...fieldNode,
            name: {
              ...fieldNode.name,
              value: 'id'
            }
          };
          return newFieldNode;
        }
      )
    ]);
  });

  it('should work', async () => {
    const result = await graphql(
      transformedPropertySchema,
      `
        query($pid: ID!) {
          propertyById(id: $pid) {
            id
            name
            location {
              name
            }
          }
        }
      `,
      {},
      {},
      {
        pid: 'p1',
      },
    );

    expect(result).to.deep.equal({
      data: {
        propertyById: {
          id: 'p1',
          name: 'test',
          location: {
            name: 'Helsinki',
          },
        },
      },
    });
  });
});

describe('filter and rename object fields', () => {
  let transformedPropertySchema: GraphQLSchema;

  before(async () => {
    transformedPropertySchema = transformSchema(propertySchema, [
      new RenameTypes((name: string) => `New_${name}`),
      new FilterObjectFields((typeName: string, fieldName: string) =>
        (typeName !== 'NewProperty' || fieldName === 'id' || fieldName === 'name' || fieldName === 'location')
      ),
      new RenameObjectFields((typeName: string, fieldName: string) => (typeName === 'New_Property' ? `new_${fieldName}` : fieldName))
    ]);
  });

  it('should work', async () => {
    const result = await graphql(
      transformedPropertySchema,
      `
        query($pid: ID!) {
          propertyById(id: $pid) {
            new_id
            new_name
            new_location {
              name
            }
          }
        }
      `,
      {},
      {},
      {
        pid: 'p1',
      },
    );

    expect(result).to.deep.equal({
      data: {
        propertyById: {
          new_id: 'p1',
          new_name: 'Super great hotel',
          new_location: {
            name: 'Helsinki',
          },
        },
      },
    });
  });
});

describe('interface resolver inheritance', () => {
  const testSchemaWithInterfaceResolvers = `
    interface Node {
      id: ID!
    }
    type User implements Node {
      id: ID!
      name: String!
    }
    type Query {
      user: User!
    }
    schema {
      query: Query
    }
  `;
  const user = { _id: 1, name: 'Ada', type: 'User' };
  const resolvers = {
    Node: {
      __resolveType: ({ type }: { type: string }) => type,
      id: ({ _id }: { _id: number }) => `Node:${_id}`,
    },
    User: {
      name: ({ name }: { name: string}) => `User:${name}`
    },
    Query: {
      user: () => user
    }
  };

  it('copies resolvers from interface', async () => {
    const mergedSchema = mergeSchemas({
      schemas: [
        // pull in an executable schema just so mergeSchema doesn't complain
        // about not finding default types (e.g. ID)
        propertySchema,
        testSchemaWithInterfaceResolvers
      ],
      resolvers,
      inheritResolversFromInterfaces: true
    });
    const query = `{ user { id name } }`;
    const response = await graphql(mergedSchema, query);
    expect(response).to.deep.equal({
      data: {
        user: {
          id: `Node:1`,
          name: `User:Ada`
        }
      }
    });
  });

  it('does not copy resolvers from interface when flag is false',
async () => {
    const mergedSchema = mergeSchemas({
      schemas: [
        // pull in an executable schema just so mergeSchema doesn't complain
        // about not finding default types (e.g. ID)
        propertySchema,
        testSchemaWithInterfaceResolvers
      ],
      resolvers,
      inheritResolversFromInterfaces: false
    });
    const query = `{ user { id name } }`;
    const response = await graphql(mergedSchema, query);
    expect(response.errors.length).to.equal(1);
    expect(response.errors[0].message).to.equal('Cannot return null for ' +
      'non-nullable field User.id.');
    expect(response.errors[0].path).to.deep.equal(['user', 'id']);
  });

  it('does not copy resolvers from interface when flag is not provided',
async () => {
    const mergedSchema = mergeSchemas({
      schemas: [
        // pull in an executable schema just so mergeSchema doesn't complain
        // about not finding default types (e.g. ID)
        propertySchema,
        testSchemaWithInterfaceResolvers
      ],
      resolvers
    });
    const query = `{ user { id name } }`;
    const response = await graphql(mergedSchema, query);
    expect(response.errors.length).to.equal(1);
    expect(response.errors[0].message).to.equal('Cannot return null for ' +
      'non-nullable field User.id.');
    expect(response.errors[0].path).to.deep.equal(['user', 'id']);
  });
});

describe('mergeSchemas', () => {
  it('can merge null root fields', async () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        type Query {
          test: Test
        }
        type Test {
          field: String
        }
      `,
      resolvers: {
        Query: {
          test: () => null
        }
      }
    });
    const mergedSchema = mergeSchemas({
      schemas: [schema]
    });

    const query = `{ test { field } }`;
    const response = await graphql(mergedSchema, query);
    expect(response.data.test).to.be.null;
    expect(response.errors).to.be.undefined;
  });

  it('can merge default input types', async () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        input InputWithDefault {
          field: String = "test"
        }
        type Query {
          getInput(input: InputWithDefault!): String
        }
      `,
      resolvers: {
        Query: {
          getInput: (root, args) => args.input.field
        }
      }
    });
    const mergedSchema = mergeSchemas({
      schemas: [schema]
    });

    const query = `{ getInput(input: {}) }`;
    const response = await graphql(mergedSchema, query);

    expect(printSchema(schema)).to.equal(printSchema(mergedSchema));
    expect(response.data.getInput).to.equal('test');
  });

  it('can override scalars with new internal values', async () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        scalar TestScalar
        type Query {
          getTestScalar: TestScalar
        }
      `,
      resolvers: {
        TestScalar: new GraphQLScalarType({
          name: 'TestScalar',
          description: undefined,
          serialize: value => (value as string).slice(1),
          parseValue: value => `_${value}`,
          parseLiteral: (ast: any) => `_${ast.value}`,
        }),
        Query: {
          getTestScalar: () => '_test'
        }
      }
    });
    const mergedSchema = mergeSchemas({
      schemas: [schema],
      resolvers: {
        TestScalar: new GraphQLScalarType({
          name: 'TestScalar',
          description: undefined,
          serialize: value => (value as string).slice(2),
          parseValue: value => `__${value}`,
          parseLiteral: (ast: any) => `__${ast.value}`,
        })
      }
    });

    const query = `{ getTestScalar }`;
    const response = await graphql(mergedSchema, query);

    expect(response.data.getTestScalar).to.equal('test');
  });

  it('can override scalars with new internal values when using default input types', async () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        scalar TestScalar
        type Query {
          getTestScalar(input: TestScalar = "test"): TestScalar
        }
      `,
      resolvers: {
        TestScalar: new GraphQLScalarType({
          name: 'TestScalar',
          description: undefined,
          serialize: value => (value as string).slice(1),
          parseValue: value => `_${value}`,
          parseLiteral: (ast: any) => `_${ast.value}`,
        }),
        Query: {
          getTestScalar: (root, args) => '_test'
        }
      }
    });
    const mergedSchema = mergeSchemas({
      schemas: [schema],
      resolvers: {
        TestScalar: new GraphQLScalarType({
          name: 'TestScalar',
          description: undefined,
          serialize: value => (value as string).slice(2),
          parseValue: value => `__${value}`,
          parseLiteral: (ast: any) => `__${ast.value}`,
        })
      }
    });

    const query = `{ getTestScalar }`;
    const response = await graphql(mergedSchema, query);

    expect(response.data.getTestScalar).to.equal('test');
  });

  it('can use @include directives', async () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        type WrappingType {
          subfield: String
        }
        type Query {
          get1: WrappingType
        }
      `,
      resolvers: {
        Query: {
          get1: () => ({ subfield: 'test'})
        }
      }
    });
    const mergedSchema = mergeSchemas({
      schemas: [
        schema,
        `
          type Query {
            get2: WrappingType
          }
        `
      ],
      resolvers: {
        Query: {
          get2: (root, args, context, info) => {
            return delegateToSchema({
              schema: schema,
              operation: 'query',
              fieldName: 'get1',
              context,
              info
            });
          }
        }
      }
    });

    const query = `
      {
        get2 @include(if: true) {
          subfield
        }
      }
    `;
    const response = await graphql(mergedSchema, query);
    expect(response.data.get2.subfield).to.equal('test');
  });

  it('can use functions in subfields', async () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        type WrappingObject {
          functionField: Int!
        }
        type Query {
          wrappingObject: WrappingObject
        }
      `
    });

    const mergedSchema = mergeSchemas({
      schemas: [schema],
      resolvers: {
        Query: {
          wrappingObject: () => ({
            functionField: () => 8
          })
        },
      }
    });

    const query = `{ wrappingObject { functionField } }`;
    const response = await graphql(mergedSchema, query);
    expect(response.data.wrappingObject.functionField).to.equal(8);
  });
});

describe('onTypeConflict', () => {
  let schema1: GraphQLSchema;
  let schema2: GraphQLSchema;

  beforeEach(() => {
    const typeDefs1 = `
      type Query {
        test1: Test
      }

      type Test {
        fieldA: String
        fieldB: String
      }
    `;

    const typeDefs2 = `
      type Query {
        test2: Test
      }

      type Test {
        fieldA: String
        fieldC: String
      }
      `;

    schema1 = makeExecutableSchema({
      typeDefs: typeDefs1,
      resolvers: {
        Query: {
          test1: () => ({})
        },
        Test: {
          fieldA: () => 'A',
          fieldB: () => 'B'
        }
      }
    });

    schema2 = makeExecutableSchema({
      typeDefs: typeDefs2,
      resolvers: {
        Query: {
          test2: () => ({})
        },
        Test: {
          fieldA: () => 'A',
          fieldC: () => 'C'
        }
      }
    });
  });

  it('by default takes last type', async () => {
    const mergedSchema = mergeSchemas({
      schemas: [schema1, schema2]
    });
    const result1 = await graphql(mergedSchema, `{ test2 { fieldC } }`);
    expect(result1.data.test2.fieldC).to.equal('C');
    const result2 = await graphql(mergedSchema, `{ test2 { fieldB } }`);
    expect(result2.data).to.be.undefined;
  });

  it('can use onTypeConflict to select last type', async () => {
    const mergedSchema = mergeSchemas({
      schemas: [schema1, schema2],
      onTypeConflict: (left, right) => right
    });
    const result1 = await graphql(mergedSchema, `{ test2 { fieldC } }`);
    expect(result1.data.test2.fieldC).to.equal('C');
    const result2 = await graphql(mergedSchema, `{ test2 { fieldB } }`);
    expect(result2.data).to.be.undefined;
  });

  it('can use onTypeConflict to select first type', async () => {
    const mergedSchema = mergeSchemas({
      schemas: [schema1, schema2],
      onTypeConflict: (left) => left
    });
    const result1 = await graphql(mergedSchema, `{ test1 { fieldB } }`);
    expect(result1.data.test1.fieldB).to.equal('B');
    const result2 = await graphql(mergedSchema, `{ test1 { fieldC } }`);
    expect(result2.data).to.be.undefined;
  });
});
