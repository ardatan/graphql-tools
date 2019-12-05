/* tslint:disable:no-unused-expression */

import { expect } from 'chai';
import {
  graphql,
  GraphQLSchema,
  ExecutionResult,
  subscribe,
  parse,
  GraphQLField,
  GraphQLScalarType,
  FieldNode,
  printSchema,
} from 'graphql';
import {
  transformSchema,
  filterSchema,
  RenameTypes,
  RenameRootFields,
  RenameObjectFields,
  TransformObjectFields,
  ExtendSchema,
  WrapType,
  FilterRootFields,
  FilterObjectFields,
} from '../transforms';
import {
  propertySchema,
  remoteBookingSchema,
  subscriptionSchema,
  subscriptionPubSub,
  subscriptionPubSubTrigger,
} from './testingSchemas';
import { forAwaitEach } from 'iterall';
import { fieldToFieldConfig } from '../stitching/schemaRecreation';
import { makeExecutableSchema } from '../makeExecutableSchema';
import {
  delegateToSchema,
  mergeSchemas,
  wrapField,
  extractField,
  renameField,
  createMergedResolver,
  extractFields,
} from '../stitching';
import { SubschemaConfig, MergedTypeConfig } from '../Interfaces';
import isSpecifiedScalarType from '../utils/isSpecifiedScalarType';
import { wrapFieldNode, renameFieldNode } from '../utils/fieldNodes';

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
  let bookingSubschemaConfig: SubschemaConfig;
  let mergedSchema: GraphQLSchema;

  before(async () => {
    bookingSubschemaConfig = await remoteBookingSchema;

    // namespace and strip schemas
    const propertySchemaTransforms = [
      new FilterRootFields(
        (operation: string, rootField: string) =>
          'Query.properties' === `${operation}.${rootField}`
      ),
      new RenameTypes((name: string) => `Properties_${name}`),
      new RenameRootFields((operation: string, name: string) => `Properties_${name}`),
    ];
    const bookingSchemaTransforms = [
      new FilterRootFields(
        (operation: string, rootField: string) =>
          'Query.bookings' === `${operation}.${rootField}`
      ),
      new RenameTypes((name: string) => `Bookings_${name}`),
      new RenameRootFields((operation: string, name: string) => `Bookings_${name}`),
    ];
    const subscriptionSchemaTransforms = [
      new FilterRootFields(
        (operation: string, rootField: string) =>
          // must include a Query type otherwise graphql will error
          'Query.notifications' === `${operation}.${rootField}` ||
          'Subscription.notifications' === `${operation}.${rootField}`
      ),
      new RenameTypes((name: string) => `Subscriptions_${name}`),
      new RenameRootFields(
        (operation: string, name: string) => `Subscriptions_${name}`),
    ];

    const propertySubschema = {
      schema: propertySchema,
      transforms: propertySchemaTransforms,
    };
    const bookingSubschema = {
      ...bookingSubschemaConfig,
      transforms: bookingSchemaTransforms,
    };
    const subscriptionSubschema = {
      schema: subscriptionSchema,
      transforms: subscriptionSchemaTransforms,
    };

    mergedSchema = mergeSchemas({
      subschemas: [
        propertySubschema,
        bookingSubschema,
        subscriptionSubschema,
      ],
      typeDefs: linkSchema,
      resolvers: {
        Query: {
          // delegating directly, no subschemas or mergeInfo
          node(parent, args, context, info) {
            if (args.id.startsWith('p')) {
              return info.mergeInfo.delegateToSchema({
                schema: propertySubschema,
                operation: 'query',
                fieldName: 'propertyById',
                args,
                context,
                info,
                transforms: [],
              });
            } else if (args.id.startsWith('b')) {
              return delegateToSchema({
                schema: bookingSubschema,
                operation: 'query',
                fieldName: 'bookingById',
                args,
                context,
                info,
                transforms: [],
              });
            } else if (args.id.startsWith('c')) {
              return delegateToSchema({
                schema: bookingSubschema,
                operation: 'query',
                fieldName: 'customerById',
                args,
                context,
                info,
                transforms: [],
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
              return delegateToSchema({
                schema: bookingSubschema,
                operation: 'query',
                fieldName: 'bookingsByPropertyId',
                args: {
                  propertyId: parent.id,
                  limit: args.limit ? args.limit : null,
                },
                context,
                info,
              });
            },
          },
        },
        Bookings_Booking: {
          property: {
            fragment: 'fragment BookingFragment on Booking { propertyId }',
            resolve(parent, args, context, info) {
              return info.mergeInfo.delegateToSchema({
                schema: propertySubschema,
                operation: 'query',
                fieldName: 'propertyById',
                args: {
                  id: parent.propertyId,
                },
                context,
                info,
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
    transformedPropertySchema = transformSchema(propertySchema, [
      new TransformObjectFields(
        (typeName: string, fieldName: string, field: GraphQLField<any, any>) => {
          const fieldConfig = fieldToFieldConfig(field);
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

describe('transform object fields', () => {
  let schema: GraphQLSchema;

  before(() => {
    const ITEM = {
      id: '123',
      camel_case: "I'm a camel!",
    };

    const itemSchema = makeExecutableSchema({
      typeDefs: `
        type Item {
          id: ID!
          camel_case: String
        }
        type ItemConnection {
          edges: [ItemEdge!]!
        }
        type ItemEdge {
          node: Item!
        }
        type Query {
          item: Item
          allItems: ItemConnection!
        }
      `,
      resolvers: {
        Query: {
          item: () => ITEM,
          allItems: () => ({
            edges: [
              {
                node: ITEM
              }
            ]
          })
        }
      }
    });

    schema = transformSchema(itemSchema, [
      new FilterObjectFields((_typeName, fieldName) => {
        if (fieldName === 'id') {
          return false;
        }
        return true;
      }),
      new RenameObjectFields((_typeName, fieldName) => {
        if (fieldName === 'camel_case') {
          return 'camelCase';
        }
        return fieldName;
      }),
      new RenameRootFields((_operation, fieldName) => {
        if (fieldName === 'allItems') {
          return 'items';
        }
        return fieldName;
      }),
    ]);
  });

  it('renaming should work', async () => {
    const result = await graphql(
      schema,
      `
        query {
          item {
            camelCase
          }
          items {
            edges {
              node {
                camelCase
             }
            }
          }
        }
      `,
    );

    const TRANSFORMED_ITEM = {
      camelCase: "I'm a camel!",
    };

    expect(result).to.deep.equal({
      data: {
        item: TRANSFORMED_ITEM,
        items: {
          edges: [{
            node: TRANSFORMED_ITEM,
          }],
        },
      },
    });
  });

  it('filtering should work', async () => {
    const result = await graphql(
      schema,
      `
        query {
          items {
            edges {
              node {
                id
             }
            }
          }
        }
      `,
    );

    expect(result).to.deep.equal({
      errors: [{
        locations: [{
          column: 17,
          line: 6,
        }],
        message: 'Cannot query field \"id\" on type \"Item\".',
      }],
    });
  });
});

describe('filter and rename object fields', () => {
  let transformedPropertySchema: GraphQLSchema;

  before(async () => {
    transformedPropertySchema = filterSchema({
      schema: transformSchema(propertySchema, [
        new RenameTypes((name: string) => `New_${name}`),
        new RenameObjectFields((typeName: string, fieldName: string) => (typeName === 'New_Property' ? `new_${fieldName}` : fieldName))
      ]),
      rootFieldFilter: (operation: string, fieldName: string) =>
        'Query.propertyById' === `${operation}.${fieldName}`,
      fieldFilter: (typeName: string, fieldName: string) =>
        (typeName === 'New_Property' || fieldName === 'name'),
      typeFilter: (typeName: string, type) =>
        (typeName === 'New_Property' || typeName === 'New_Location' || isSpecifiedScalarType(type))
    });
  });

  it('should filter', () => {
    expect(printSchema(transformedPropertySchema)).to.equal(`type New_Location {
  name: String!
}

type New_Property {
  new_id: ID!
  new_name: String!
  new_location: New_Location
  new_error: String
}

type Query {
  propertyById(id: ID!): New_Property
}
`
    );
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

describe('WrapType transform', () => {
  let transformedPropertySchema: GraphQLSchema;

  before(async () => {
    transformedPropertySchema = transformSchema(propertySchema, [
      new WrapType('Query', 'Namespace_Query', 'namespace'),
    ]);
  });

  it('should modify the schema', () => {
    /* tslint:disable:max-line-length */
    expect(printSchema(transformedPropertySchema)).to.equal(`type Address {
  street: String
  city: String
  state: String
  zip: String
}

"""Simple fake datetime"""
scalar DateTime

input InputWithDefault {
  test: String = "Foo"
}

"""
The \`JSON\` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf).
"""
scalar JSON

type Location {
  name: String!
}

type Namespace_Query {
  propertyById(id: ID!): Property
  properties(limit: Int): [Property!]
  contextTest(key: String!): String
  dateTimeTest: DateTime
  jsonTest(input: JSON): JSON
  interfaceTest(kind: TestInterfaceKind): TestInterface
  unionTest(output: String): TestUnion
  errorTest: String
  errorTestNonNull: String!
  relay: Query!
  defaultInputTest(input: InputWithDefault!): String
}

type Property {
  id: ID!
  name: String!
  location: Location
  address: Address
  error: String
}

type Query {
  namespace: Namespace_Query
}

type TestImpl1 implements TestInterface {
  kind: TestInterfaceKind
  testString: String
  foo: String
}

type TestImpl2 implements TestInterface {
  kind: TestInterfaceKind
  testString: String
  bar: String
}

interface TestInterface {
  kind: TestInterfaceKind
  testString: String
}

enum TestInterfaceKind {
  ONE
  TWO
}

union TestUnion = TestImpl1 | UnionImpl

type UnionImpl {
  someField: String
}
`
      /* tslint:enable:max-line-length */
    );
  });

  it('should work', async () => {
    const result = await graphql(
      transformedPropertySchema,
      `
        query($pid: ID!) {
          namespace {
            propertyById(id: $pid) {
              id
              name
              error
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
        namespace: {
          propertyById: {
            id: 'p1',
            name: 'Super great hotel',
            error: null,
          },
        },
      },
      errors: [
        {
          extensions: {
            code: 'SOME_CUSTOM_CODE',
          },
          locations: [
            {
              column: 15,
              line: 7,
            },
          ],
          message: 'Property.error error',
          path: [
            'namespace',
            'propertyById',
            'error',
          ],
        },
      ]
    });
  });
});

describe('ExtendSchema transform', () => {
  let transformedPropertySchema: GraphQLSchema;

  before(async () => {
    transformedPropertySchema = transformSchema(propertySchema, [
      new ExtendSchema({
        typeDefs: `
          extend type Property {
            locationName: String
            wrap: Wrap
          }

          type Wrap {
            id: ID
            name: String
          }
        `,
      }),
    ]);
  });

  it('should work', () => {
    /* tslint:disable:max-line-length */
    expect(printSchema(transformedPropertySchema)).to.equal(`type Address {
  street: String
  city: String
  state: String
  zip: String
}

"""Simple fake datetime"""
scalar DateTime

input InputWithDefault {
  test: String = "Foo"
}

"""
The \`JSON\` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf).
"""
scalar JSON

type Location {
  name: String!
}

type Property {
  id: ID!
  name: String!
  location: Location
  address: Address
  error: String
  locationName: String
  wrap: Wrap
}

type Query {
  propertyById(id: ID!): Property
  properties(limit: Int): [Property!]
  contextTest(key: String!): String
  dateTimeTest: DateTime
  jsonTest(input: JSON): JSON
  interfaceTest(kind: TestInterfaceKind): TestInterface
  unionTest(output: String): TestUnion
  errorTest: String
  errorTestNonNull: String!
  relay: Query!
  defaultInputTest(input: InputWithDefault!): String
}

type TestImpl1 implements TestInterface {
  kind: TestInterfaceKind
  testString: String
  foo: String
}

type TestImpl2 implements TestInterface {
  kind: TestInterfaceKind
  testString: String
  bar: String
}

interface TestInterface {
  kind: TestInterfaceKind
  testString: String
}

enum TestInterfaceKind {
  ONE
  TWO
}

union TestUnion = TestImpl1 | UnionImpl

type UnionImpl {
  someField: String
}

type Wrap {
  id: ID
  name: String
}
`
      /* tslint:enable:max-line-length */
    );
  });
});

describe('schema transformation with extraction of nested fields', () => {
  let transformedPropertySchema: GraphQLSchema;

  before(async () => {
    transformedPropertySchema = transformSchema(propertySchema, [
      new ExtendSchema({
        typeDefs: `
          extend type Property {
            locationName: String
            locationName2: String
            pseudoWrappedError: String
          }
        `,
        resolvers: {
          Property: {
            locationName: createMergedResolver({ fromPath: ['location', 'name'] }),
            //deprecated wrapField shorthand
            locationName2: wrapField('location', 'name'),
            pseudoWrappedError: createMergedResolver({ fromPath: ['error', 'name'] }),
          },
        },
        fieldNodeTransformerMap: {
          'Property': {
            'locationName':
              fieldNode => wrapFieldNode(renameFieldNode(fieldNode, 'name'), ['location']),
            'locationName2':
              fieldNode => wrapFieldNode(renameFieldNode(fieldNode, 'name'), ['location']),
            'pseudoWrappedError': fieldNode => renameFieldNode(fieldNode, 'error'),
          },
        },
      }),
    ]);
  });

  it('should work to extract a field', async () => {
    const result = await graphql(
      transformedPropertySchema,
      `
        query($pid: ID!) {
          propertyById(id: $pid) {
            test1: locationName
            test2: locationName2
            pseudoWrappedError
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
          test1: 'Helsinki',
          test2: 'Helsinki',
          pseudoWrappedError: null,
        },
      },
      errors: [
        {
          extensions: {
            code: 'SOME_CUSTOM_CODE',
          },
          locations: [
            {
              column: 13,
              line: 6,
            },
          ],
          message: 'Property.error error',
          path: [
            'propertyById',
            'pseudoWrappedError',
          ],
        },
      ]
    });
  });

  it('should work to extract a field', async () => {
    const result = await graphql(
      transformedPropertySchema,
      `
        query($pid: ID!) {
          propertyById(id: $pid) {
            id
            test1: locationName
            test2: locationName2
            name
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
          test1: 'Helsinki',
          test2: 'Helsinki',
          name: 'Super great hotel',
        },
      },
    });
  });
});

describe('schema transformation with wrapping of object fields', () => {
  let transformedPropertySchema: GraphQLSchema;

  before(async () => {
    transformedPropertySchema = transformSchema(propertySchema, [
      new ExtendSchema({
        typeDefs: `
          extend type Property {
            outerWrap: OuterWrap
            singleWrap: InnerWrap
          }

          type OuterWrap {
            innerWrap: InnerWrap
          }

          type InnerWrap {
            id: ID
            name: String
          }
        `,
        resolvers: {
          Property: {
            outerWrap: (parent, args, context, info) => ({
              innerWrap: {
                id: createMergedResolver({ toPath: ['innerWrap', 'id'] })(parent, args, context, info),
                name: createMergedResolver({ toPath: ['innerWrap', 'name'] })(parent, args, context, info),
              },
            }),
            //deprecated extractField shorthand
            singleWrap: (parent, args, context, info) => ({
              id: extractField('id')(parent, args, context, info),
              name: extractField('name')(parent, args, context, info),
            }),
          },
        },
        fieldNodeTransformerMap: {
          'Property': {
            'outerWrap': (fieldNode, fragments) => extractFields({ fieldNode, path: ['innerWrap'], fragments }),
            'singleWrap': (fieldNode, fragments) => extractFields({ fieldNode, fragments }),
          },
        },
      }),
    ]);
  });

  it('should work, even with aliases', async () => {
    const result = await graphql(
      transformedPropertySchema,
      `
        query($pid: ID!) {
          propertyById(id: $pid) {
            test1: outerWrap {
              innerWrap {
                ...W1
              }
            }
            test2: outerWrap {
              innerWrap {
                ...W2
              }
            }
            singleWrap {
              ...W1
              ...W2
            }
          }
        }
        fragment W1 on InnerWrap {
          one: id
        }
        fragment W2 on InnerWrap {
          two: name
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
          test1: {
            innerWrap: {
              one: 'p1',
            },
          },
          test2: {
            innerWrap: {
              two: 'Super great hotel',
            },
          },
          singleWrap: {
            one: 'p1',
            two: 'Super great hotel',
          }
        },
      },
    });
  });
});

describe('schema transformation with renaming of object fields', () => {
  let transformedPropertySchema: GraphQLSchema;

  before(async () => {
    transformedPropertySchema = transformSchema(propertySchema, [
      new ExtendSchema({
        typeDefs: `
          extend type Property {
            new_error: String
            new_error2: String
          }
        `,
        resolvers: {
          Property: {
            new_error: createMergedResolver({ fromPath: ['error'] }),
            //deprecated renameField shorthand
            new_error2: renameField('error'),
          },
        },
        fieldNodeTransformerMap: {
          'Property': {
            'new_error': fieldNode => renameFieldNode(fieldNode, 'error'),
            'new_error2': fieldNode => renameFieldNode(fieldNode, 'error'),
          },
        },
      }),
    ]);
  });

  it('should work, even with aliases, and should preserve errors', async () => {
    const result = await graphql(
      transformedPropertySchema,
      `
        query($pid: ID!) {
          propertyById(id: $pid) {
            new_error
            new_error2
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
          new_error: null,
          new_error2: null,
        },
      },
      errors: [
        {
          extensions: {
            code: 'SOME_CUSTOM_CODE',
          },
          locations: [
            {
              column: 13,
              line: 4,
            },
            {
              column: 13,
              line: 5,
            },
          ],
          message: 'Property.error error',
          path: [
            'propertyById',
            'new_error',
          ],
        },
        {
          extensions: {
            code: 'SOME_CUSTOM_CODE',
          },
          locations: [
            {
              column: 13,
              line: 4,
            },
            {
              column: 13,
              line: 5,
            },
          ],
          message: 'Property.error error',
          path: [
            'propertyById',
            'new_error2',
          ],
        },
      ],
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

describe('mergeTypes', () => {
  let schema1: GraphQLSchema;
  let schema2: GraphQLSchema;

  beforeEach(() => {
    const typeDefs1 = `
      type Query {
        rootField1: Wrapper
        getTest(id: ID): Test
      }

      type Wrapper {
        test: Test
      }

      type Test {
        id: ID
        field1: String
      }
    `;

    const typeDefs2 = `
      type Query {
        rootField2: Wrapper
        getTest(id: ID): Test
      }

      type Wrapper {
        test: Test
      }

      type Test {
        id: ID
        field2: String
      }
    `;

    schema1 = makeExecutableSchema({
      typeDefs: typeDefs1,
      resolvers: {
        Query: {
          rootField1: () => ({ test: { id: '1' } }),
          getTest: (parent, { id }) => ({ id }),
        },
        Test: {
          field1: parent => parent.id,
        }
      }
    });

    schema2 = makeExecutableSchema({
      typeDefs: typeDefs2,
      resolvers: {
        Query: {
          rootField2: () => ({ test: { id: '2' } }),
          getTest: (parent, { id }) => ({ id }),
        },
        Test: {
          field2: parent => parent.id,
        }
      }
    });
  });

  it('can merge types', async () => {
    const subschemaConfig1: SubschemaConfig = { schema: schema1 };
    const subschemaConfig2: SubschemaConfig = { schema: schema2 };

    const mergedTypeConfigs1: Record<string, MergedTypeConfig> = {
      Test: {
        fragment: 'fragment TestFragment on Test { id }',
        mergedTypeResolver: (subschema, originalResult, context, info) => {
          return delegateToSchema({
            schema: subschemaConfig1,
            operation: 'query',
            fieldName: 'getTest',
            args: { id: originalResult.id },
            context,
            info,
          });
        }
      }
    };

    const mergedTypeConfigs2: Record<string, MergedTypeConfig> = {
      Test: {
        fragment: 'fragment TestFragment on Test { id }',
        mergedTypeResolver: async (subschema, originalResult, context, info) => {
          return delegateToSchema({
            schema: subschemaConfig2,
            operation: 'query',
            fieldName: 'getTest',
            args: { id: originalResult.id },
            context,
            info,
          });
        }
      }
    };

    subschemaConfig1.mergedTypeConfigs = mergedTypeConfigs1;
    subschemaConfig2.mergedTypeConfigs = mergedTypeConfigs2;

    const mergedSchema = mergeSchemas({
      subschemas: [subschemaConfig1, subschemaConfig2],
      mergeTypes: ['Test'],
    });
    const result1 = await graphql(mergedSchema, `{ rootField1 { test { field1 field2 } } }`);
    expect(result1).to.deep.equal({
      data: {
        rootField1: {
          test: {
            field1: '1',
            field2: '1',
          }
        }
      }
    });
  });
});
