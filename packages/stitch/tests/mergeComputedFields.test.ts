import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { graphql, GraphQLSchema } from 'graphql';
import { assertSome } from '@graphql-tools/utils';

const productSchema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Product {
      id: ID!
      price: Float!
      weight: Int!
    }

    type Query {
      product(id: ID!): Product
    }
  `,
  resolvers: {
    Query: {
      product: (_root, { id }) => ({ id, price: Number(id) + 0.99, weight: Number(id) }),
    },
  },
});

describe('merge computed fields via config', () => {
  const storefrontSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Product {
        id: ID!
        shippingEstimate: Float!
        deliveryService: DeliveryService!
      }
      enum DeliveryService {
        POSTAL
        FREIGHT
      }
      type Storefront {
        id: ID!
        availableProducts: [Product]!
      }
      input ProductRepresentation {
        id: ID!
        price: Float
        weight: Int
      }
      type Query {
        storefront(id: ID!): Storefront
        _products(representations: [ProductRepresentation!]!): [Product]!
      }
    `,
    resolvers: {
      Query: {
        storefront: (_root, { id }) => ({ id, availableProducts: [{ id: '23' }] }),
        _products: (_root, { representations }) => representations,
      },
      Product: {
        shippingEstimate: obj =>
          obj.price != null && obj.weight != null ? (obj.price > 50 ? 0 : obj.weight / 2) : null,
        deliveryService: obj => (obj.weight != null ? (obj.weight > 50 ? 'FREIGHT' : 'POSTAL') : null),
      },
    },
  });

  const gatewaySchema = stitchSchemas({
    subschemas: [
      {
        schema: productSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fieldName: 'product',
            args: ({ id }) => ({ id }),
          },
        },
      },
      {
        schema: storefrontSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fields: {
              shippingEstimate: {
                selectionSet: '{ price weight }',
                computed: true,
              },
              deliveryService: {
                selectionSet: '{ weight }',
                computed: true,
              },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: representations => ({ representations }),
          },
        },
      },
    ],
  });

  it('can stitch from product service to inventory service', async () => {
    const { data } = await graphql({
      schema: gatewaySchema,
      source: /* GraphQL */ `
        query {
          product(id: 77) {
            id
            price
            weight
            shippingEstimate
            deliveryService
          }
        }
      `,
    });

    assertSome(data);
    expect(data['product']).toEqual({
      id: '77',
      price: 77.99,
      weight: 77,
      shippingEstimate: 0,
      deliveryService: 'FREIGHT',
    });
  });

  it('can stitch from inventory service to product service and back to inventory service', async () => {
    const { data } = await graphql({
      schema: gatewaySchema,
      source: /* GraphQL */ `
        query {
          storefront(id: 77) {
            availableProducts {
              id
              price
              weight
              shippingEstimate
              deliveryService
            }
          }
        }
      `,
    });

    assertSome(data);
    const storeFrontData: any = data['storefront'];
    expect(storeFrontData.availableProducts).toEqual([
      {
        id: '23',
        price: 23.99,
        weight: 23,
        shippingEstimate: 11.5,
        deliveryService: 'POSTAL',
      },
    ]);
  });
});

describe('test merged composite computed fields', () => {
  const schemaA = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      interface I {
        id: ID!
        value: Int!
      }

      type T implements I {
        id: ID!
        value: Int!
      }

      type U {
        id: ID!
        value: Int!
      }

      union W = T | U

      type Query {
        byId(id: ID!): T
        uById(id: ID!): U
      }
    `,
    resolvers: {
      T: {
        value: (obj: { id: string }) => parseInt(obj.id),
      },
      U: {
        value: (obj: { id: string }) => parseInt(obj.id),
      },
      I: {
        __resolveType: () => 'T',
      },
      Query: {
        byId: (_: never, { id }: { id: string }) => ({ id }),
        uById: (_: never, { id }: { id: string }) => ({ id }),
      },
    },
  });

  describe('object-valued computed field', () => {
    const schemaB = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        interface I {
          id: ID!
          value2: Int!
        }

        type T implements I {
          id: ID!
          next: T!
          value2: Int!
        }

        type U {
          id: ID!
          value2: Int!
        }

        type V {
          id: ID!
        }

        union W = T | U

        union X = T | V

        input TInput {
          id: ID!
          value: Int
        }

        type Query {
          byRepresentation(representation: TInput!): T
          uByRepresentation(representation: TInput!): U
        }
      `,
      resolvers: {
        T: {
          next: (obj: { id: string; value: number }) => ({ id: `${obj.value + 1}` }),
          value2: (obj: { id: string }) => parseInt(obj.id),
        },
        U: {
          value2: (obj: { id: string }) => parseInt(obj.id),
        },
        Query: {
          byRepresentation: (
            _: never,
            { representation: { id, value } }: { representation: { id: string; value?: number } }
          ) => ({ id, value }),
          uByRepresentation: (_: never, { representation: { id } }: { representation: { id: string } }) => ({ id }),
        },
      },
    });

    // implementation must be provided per test b/c restoreMocks: true in global config, this is the implementation:
    //  ({ id, value }: { id: string; value?: number }) => ({ representation: { id, value } })
    const byRepresentationArgs = jest.fn<
      { representation: { id: string; value?: number } },
      [{ id: string; value?: number }]
    >();

    const gatewaySchema = stitchSchemas({
      subschemas: [
        {
          schema: schemaA,
          merge: {
            T: {
              selectionSet: '{ id }',
              fieldName: 'byId',
              args: ({ id }) => ({ id }),
            },
            U: {
              selectionSet: '{ id }',
              fieldName: 'uById',
              args: ({ id }) => ({ id }),
            },
          },
        },
        {
          schema: schemaB,
          merge: {
            T: {
              selectionSet: '{ id }',
              fieldName: 'byRepresentation',
              args: byRepresentationArgs,
              fields: {
                next: {
                  selectionSet: '{ value }',
                  computed: true,
                },
              },
            },
            U: {
              selectionSet: '{ id }',
              fieldName: 'uByRepresentation',
              args: ({ id }: { id: string }) => ({ representation: { id } }),
            },
          },
        },
      ],
    });

    it('computed field dependencies only used when required', async () => {
      byRepresentationArgs.mockImplementation(({ id, value }: { id: string; value?: number }) => ({
        representation: { id, value },
      }));

      const { data } = await graphql({
        schema: gatewaySchema,
        source: /* GraphQL */ `
          query {
            byId(id: "1") {
              value2
            }
          }
        `,
      });
      assertSome(data);
      expect(data).toEqual({
        byId: {
          value2: 1,
        },
      });
      // check value is not provided
      expect(byRepresentationArgs).toHaveBeenCalledTimes(1);
      expect(byRepresentationArgs.mock.calls[0][0].value).toBeUndefined();
    });

    it('selection set available locally', async () => {
      byRepresentationArgs.mockImplementation(
        // something breaks if the mock function is not wrapped in a plain function ...
        ({ id, value }: { id: string; value?: number }) => ({ representation: { id, value } })
      );
      const { data } = await graphql({
        schema: gatewaySchema,
        source: /* GraphQL */ `
          query {
            byId(id: "1") {
              value
              next {
                value
              }
            }
          }
        `,
      });

      assertSome(data);
      expect(data).toEqual({
        byId: {
          value: 1,
          next: {
            value: 2,
          },
        },
      });
    });

    it('selection set is remote', async () => {
      byRepresentationArgs.mockImplementation(
        // something breaks if the mock function is not wrapped in a plain function ...
        ({ id, value }: { id: string; value?: number }) => ({ representation: { id, value } })
      );
      const { data } = await graphql({
        schema: gatewaySchema,
        source: /* GraphQL */ `
          query {
            byId(id: "1") {
              value
              next {
                value
                next {
                  value
                }
              }
            }
          }
        `,
      });

      assertSome(data);

      expect(data).toEqual({
        byId: {
          value: 1,
          next: {
            value: 2,
            next: {
              value: 3,
            },
          },
        },
      });
    });
  });

  describe('interface-valued computed field', () => {
    const schemaB = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        interface I {
          id: ID!
          next: I!
        }

        type T implements I {
          id: ID!
          next: I!
        }

        input TInput {
          id: ID!
          value: Int
        }

        type Query {
          byRepresentation(representation: TInput!): T
        }
      `,
      resolvers: {
        T: {
          next: (obj: { id: string; value: number }) => ({ id: `${obj.value + 1}` }),
        },
        I: {
          __resolveType: () => 'T',
        },
        Query: {
          byRepresentation: (
            _: never,
            { representation: { id, value } }: { representation: { id: string; value?: number } }
          ) => ({ id, value }),
        },
      },
    });

    const gatewaySchema = stitchSchemas({
      subschemas: [
        {
          schema: schemaA,
          merge: {
            T: {
              selectionSet: '{ id }',
              fieldName: 'byId',
              args: ({ id }) => ({ id }),
            },
          },
        },
        {
          schema: schemaB,
          merge: {
            T: {
              selectionSet: '{ id }',
              fieldName: 'byRepresentation',
              args: ({ id, value }: { id: string; value?: number }) => ({ representation: { id, value } }),
              fields: {
                next: {
                  selectionSet: '{ value }',
                  computed: true,
                },
              },
            },
          },
        },
      ],
    });

    it('selection set available locally', async () => {
      const { data } = await graphql({
        schema: gatewaySchema,
        source: /* GraphQL */ `
          query {
            byId(id: "1") {
              value
              next {
                id
              }
            }
          }
        `,
      });

      assertSome(data);
      expect(data).toEqual({
        byId: {
          value: 1,
          next: {
            id: '2',
          },
        },
      });
    });

    it('selection set is remote', async () => {
      const { data } = await graphql({
        schema: gatewaySchema,
        source: /* GraphQL */ `
          query {
            byId(id: "1") {
              value
              next {
                value
                next {
                  id
                }
              }
            }
          }
        `,
      });

      assertSome(data);
      expect(data).toEqual({
        byId: {
          value: 1,
          next: {
            value: 2,
            next: {
              id: '3',
            },
          },
        },
      });
    });
  });

  describe('union-valued computed field', () => {
    const schemaB = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type T {
          id: ID!
          next: W!
        }

        type U {
          id: ID!
        }

        type V {
          id: ID!
        }

        union W = T | U | V

        input TInput {
          id: ID!
          value: Int
        }

        type Query {
          byRepresentation(representation: TInput!): T
        }
      `,
      resolvers: {
        T: {
          next: (obj: { id: string; value: number }) => ({ id: `${obj.value + 1}` }),
        },
        W: {
          __resolveType: () => 'T',
        },
        Query: {
          byRepresentation: (
            _: never,
            { representation: { id, value } }: { representation: { id: string; value?: number } }
          ) => ({ id, value }),
        },
      },
    });

    const gatewaySchema = stitchSchemas({
      subschemas: [
        {
          schema: schemaA,
          merge: {
            T: {
              selectionSet: '{ id }',
              fieldName: 'byId',
              args: ({ id }) => ({ id }),
            },
          },
        },
        {
          schema: schemaB,
          merge: {
            T: {
              selectionSet: '{ id }',
              fieldName: 'byRepresentation',
              args: ({ id, value }: { id: string; value?: number }) => ({ representation: { id, value } }),
              fields: {
                next: {
                  selectionSet: '{ value }',
                  computed: true,
                },
              },
            },
          },
        },
      ],
    });

    it('selection set available locally', async () => {
      const { data } = await graphql({
        schema: gatewaySchema,
        source: /* GraphQL */ `
          query {
            byId(id: "1") {
              value
              next {
                ... on T {
                  id
                }
                ... on U {
                  id
                }
                ... on V {
                  id
                }
              }
            }
          }
        `,
      });

      assertSome(data);
      expect(data).toEqual({
        byId: {
          value: 1,
          next: {
            id: '2',
          },
        },
      });
    });

    it('selection set is remote', async () => {
      const { data } = await graphql({
        schema: gatewaySchema,
        source: /* GraphQL */ `
          query {
            byId(id: "1") {
              value
              next {
                ... on T {
                  value
                  next {
                    ... on T {
                      id
                    }
                    ... on U {
                      id
                    }
                    ... on V {
                      id
                    }
                  }
                }
                ... on U {
                  id
                }
                ... on V {
                  id
                }
              }
            }
          }
        `,
      });

      assertSome(data);
      expect(data).toEqual({
        byId: {
          value: 1,
          next: {
            value: 2,
            next: {
              id: '3',
            },
          },
        },
      });
    });
  });
});

describe('test unmerged composite computed fields', () => {
  const schemaA = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type T {
        id: ID!
        value: Int!
      }

      type Query {
        byId(id: ID!): T
      }
    `,
    resolvers: {
      T: {
        value: (obj: { id: string }) => parseInt(obj.id),
      },
      Query: {
        byId: (_: never, { id }: { id: string }) => ({ id }),
      },
    },
  });

  const createGatewaySchema = (schemaB: GraphQLSchema) =>
    stitchSchemas({
      subschemas: [
        {
          schema: schemaA,
          merge: {
            T: {
              selectionSet: '{ id }',
              fieldName: 'byId',
              args: ({ id }) => ({ id }),
            },
          },
        },
        {
          schema: schemaB,
          merge: {
            T: {
              selectionSet: '{ id }',
              fieldName: 'byRepresentation',
              args: ({ id, value }: { id: string; value?: number }) => ({ representation: { id, value } }),
              fields: {
                next: {
                  selectionSet: '{ value }',
                  computed: true,
                },
              },
            },
          },
        },
      ],
    });

  it('object-valued computed field', async () => {
    const schemaB = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type T {
          id: ID!
          next: U!
        }

        type U {
          id: ID!
        }

        input TInput {
          id: ID!
          value: Int
        }

        type Query {
          byRepresentation(representation: TInput!): T
        }
      `,
      resolvers: {
        T: {
          next: (obj: { id: string; value: number }) => ({ id: `${obj.value + 1}` }),
        },
        Query: {
          byRepresentation: (
            _: never,
            { representation: { id, value } }: { representation: { id: string; value?: number } }
          ) => ({ id, value }),
        },
      },
    });

    const gatewaySchema = createGatewaySchema(schemaB);

    const { data } = await graphql({
      schema: gatewaySchema,
      source: /* GraphQL */ `
        query {
          byId(id: "1") {
            value
            next {
              id
            }
          }
        }
      `,
    });

    assertSome(data);
    expect(data).toEqual({
      byId: {
        value: 1,
        next: {
          id: '2',
        },
      },
    });
  });

  it('interface-valued computed field', async () => {
    const schemaB = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type T {
          id: ID!
          next: Node!
        }

        interface Node {
          id: ID!
        }

        type U implements Node {
          id: ID!
        }

        input TInput {
          id: ID!
          value: Int
        }

        type Query {
          byRepresentation(representation: TInput!): T
        }
      `,
      resolvers: {
        Node: {
          __resolveType: () => 'U',
        },
        T: {
          next: (obj: { id: string; value: number }) => ({ id: `${obj.value + 1}` }),
        },
        Query: {
          byRepresentation: (
            _: never,
            { representation: { id, value } }: { representation: { id: string; value?: number } }
          ) => ({ id, value }),
        },
      },
    });

    const gatewaySchema = createGatewaySchema(schemaB);

    const { data } = await graphql({
      schema: gatewaySchema,
      source: /* GraphQL */ `
        query {
          byId(id: "1") {
            value
            next {
              id
            }
          }
        }
      `,
    });

    assertSome(data);
    expect(data).toEqual({
      byId: {
        value: 1,
        next: {
          id: '2',
        },
      },
    });
  });

  it('union-valued computed field', async () => {
    const schemaB = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type T {
          id: ID!
          next: W!
        }

        type U {
          id: ID!
        }

        type V {
          id: ID!
        }

        union W = U | V

        input TInput {
          id: ID!
          value: Int
        }

        type Query {
          byRepresentation(representation: TInput!): T
        }
      `,
      resolvers: {
        T: {
          next: (obj: { id: string; value: number }) => ({ id: `${obj.value + 1}` }),
        },
        W: {
          __resolveType: () => 'U',
        },
        Query: {
          byRepresentation: (
            _: never,
            { representation: { id, value } }: { representation: { id: string; value?: number } }
          ) => ({ id, value }),
        },
      },
    });

    const gatewaySchema = stitchSchemas({
      subschemas: [
        {
          schema: schemaA,
          merge: {
            T: {
              selectionSet: '{ id }',
              fieldName: 'byId',
              args: ({ id }) => ({ id }),
            },
          },
        },
        {
          schema: schemaB,
          merge: {
            T: {
              selectionSet: '{ id }',
              fieldName: 'byRepresentation',
              args: ({ id, value }: { id: string; value?: number }) => ({ representation: { id, value } }),
              fields: {
                next: {
                  selectionSet: '{ value }',
                  computed: true,
                },
              },
            },
          },
        },
      ],
    });

    const { data } = await graphql({
      schema: gatewaySchema,
      source: /* GraphQL */ `
        query {
          byId(id: "1") {
            value
            next {
              ... on U {
                id
              }
              ... on V {
                id
              }
            }
          }
        }
      `,
    });

    assertSome(data);
    expect(data).toEqual({
      byId: {
        value: 1,
        next: {
          id: '2',
        },
      },
    });
  });

  it('enum-valued computed field', async () => {
    const schemaB = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type T {
          id: ID!
          next: U!
        }

        enum U {
          ZERO
          ONE
          TWO
          THREE
        }

        input TInput {
          id: ID!
          value: Int
        }

        type Query {
          byRepresentation(representation: TInput!): T
        }
      `,
      resolvers: {
        T: {
          next: (obj: { id: string; value: number }) => ['ZERO', 'ONE', 'TWO', 'THREE'][obj.value],
        },
        Query: {
          byRepresentation: (
            _: never,
            { representation: { id, value } }: { representation: { id: string; value?: number } }
          ) => ({ id, value }),
        },
      },
    });

    const gatewaySchema = stitchSchemas({
      subschemas: [
        {
          schema: schemaA,
          merge: {
            T: {
              selectionSet: '{ id }',
              fieldName: 'byId',
              args: ({ id }) => ({ id }),
            },
          },
        },
        {
          schema: schemaB,
          merge: {
            T: {
              selectionSet: '{ id }',
              fieldName: 'byRepresentation',
              args: ({ id, value }: { id: string; value?: number }) => ({ representation: { id, value } }),
              fields: {
                next: {
                  selectionSet: '{ value }',
                  computed: true,
                },
              },
            },
          },
        },
      ],
    });

    const { data } = await graphql({
      schema: gatewaySchema,
      source: /* GraphQL */ `
        query {
          byId(id: "1") {
            value
            next
          }
        }
      `,
    });

    assertSome(data);
    expect(data).toEqual({
      byId: {
        value: 1,
        next: 'ONE',
      },
    });
  });
});
