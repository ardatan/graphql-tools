import { GraphQLInterfaceType, GraphQLObjectType, parse, printSchema } from 'graphql';
import { Subschema } from '@graphql-tools/delegate';
import { normalizedExecutor } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { isolateComputedFieldsTransformer, stitchSchemas } from '@graphql-tools/stitch';
import { assertSome, printSchemaWithDirectives } from '@graphql-tools/utils';

describe('isolateComputedFieldsTransformer', () => {
  describe('basic isolation', () => {
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
    });

    it('splits a subschema into base and computed portions', async () => {
      const [baseConfig, computedConfig] = isolateComputedFieldsTransformer({
        schema: storefrontSchema,
        merge: {
          Product: {
            selectionSet: '{ id weight }',
            fields: {
              shippingEstimate: {
                selectionSet: '{ price }',
                computed: true,
                canonical: true,
              },
              deliveryService: {
                canonical: true,
              },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: representations => ({ representations }),
            canonical: true,
          },
        },
      });

      const baseSubschema = new Subschema(baseConfig);
      const computedSubschema = new Subschema(computedConfig);

      expect(
        Object.keys(
          (baseSubschema.transformedSchema.getType('Query') as GraphQLObjectType).getFields(),
        ),
      ).toEqual(['storefront', '_products']);
      expect(
        Object.keys(
          (baseSubschema.transformedSchema.getType('Product') as GraphQLObjectType).getFields(),
        ),
      ).toEqual(['id', 'deliveryService']);
      expect(baseSubschema.transformedSchema.getType('DeliveryService')).toBeDefined();
      expect(baseSubschema.transformedSchema.getType('Storefront')).toBeDefined();
      expect(baseSubschema.transformedSchema.getType('ProductRepresentation')).toBeDefined();

      expect(
        Object.keys(
          (computedSubschema.transformedSchema.getType('Query') as GraphQLObjectType).getFields(),
        ),
      ).toEqual(['_products']);
      expect(
        Object.keys(
          (computedSubschema.transformedSchema.getType('Product') as GraphQLObjectType).getFields(),
        ),
      ).toEqual(['id', 'shippingEstimate', 'deliveryService']);

      // pruning does not yet remove unused scalars/enums
      // expect(computedSubschema.transformedSchema.getType('DeliveryService')).toBeUndefined();
      expect(computedSubschema.transformedSchema.getType('Storefront')).toBeUndefined();
      expect(computedSubschema.transformedSchema.getType('ProductRepresentation')).toBeDefined();

      assertSome(baseSubschema.merge);
      expect(baseSubschema.merge['Product'].canonical).toEqual(true);
      expect(baseSubschema.merge['Product'].fields).toEqual({
        deliveryService: { canonical: true },
      });
      assertSome(computedSubschema.merge);
      expect(computedSubschema.merge['Product'].canonical).toBeUndefined();
      expect(computedSubschema.merge['Product'].fields).toEqual({
        shippingEstimate: { selectionSet: '{ price }', computed: true, canonical: true },
      });
    });

    it('does not split schemas with only non-computed fields', async () => {
      const subschemas = isolateComputedFieldsTransformer({
        schema: storefrontSchema,
        merge: {
          Product: {
            selectionSet: '{ id price weight }',
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: representations => ({ representations }),
          },
        },
      });

      expect(subschemas.length).toEqual(1);
    });
  });

  describe('object return type', () => {
    const storefrontSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type ShippingEstimate {
          amount: Float!
          vat: Float!
        }

        type Product {
          id: ID!
          shippingEstimate: ShippingEstimate!
        }

        input ProductRepresentation {
          id: ID!
          price: Float
          weight: Int
        }

        type Query {
          _products(representations: [ProductRepresentation!]!): [Product]!
        }
      `,
    });

    it('splits a subschema into base and computed portions', async () => {
      const [baseConfig, computedConfig] = isolateComputedFieldsTransformer({
        schema: storefrontSchema,
        merge: {
          Product: {
            selectionSet: '{ id weight }',
            fields: {
              shippingEstimate: {
                selectionSet: '{ price }',
                computed: true,
              },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: representations => ({ representations }),
          },
        },
      });

      const baseSubschema = new Subschema(baseConfig);
      const computedSubschema = new Subschema(computedConfig);

      expect(
        Object.keys(
          (baseSubschema.transformedSchema.getType('Query') as GraphQLObjectType).getFields(),
        ),
      ).toEqual(['_products']);
      expect(
        Object.keys(
          (baseSubschema.transformedSchema.getType('Product') as GraphQLObjectType).getFields(),
        ),
      ).toEqual(['id']);

      expect(
        Object.keys(
          (computedSubschema.transformedSchema.getType('Query') as GraphQLObjectType).getFields(),
        ),
      ).toEqual(['_products']);
      expect(
        Object.keys(
          (computedSubschema.transformedSchema.getType('Product') as GraphQLObjectType).getFields(),
        ),
      ).toEqual(['id', 'shippingEstimate']);

      assertSome(baseSubschema.merge);
      assertSome(computedSubschema.merge);
      expect(computedSubschema.merge['Product'].fields).toEqual({
        shippingEstimate: { selectionSet: '{ price }', computed: true },
      });
    });
  });

  describe('fully computed type', () => {
    const storefrontSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Product {
          computedOne: String!
          computedTwo: String!
        }
        type Query {
          _products(representations: [ID!]!): [Product]!
        }
      `,
    });

    it('does not reprocess already isolated computations', async () => {
      const subschemas = isolateComputedFieldsTransformer({
        schema: storefrontSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fields: {
              computedOne: {
                selectionSet: '{ price weight }',
                computed: true,
              },
              computedTwo: {
                selectionSet: '{ weight }',
                computed: true,
              },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: representations => ({ representations }),
          },
        },
      });

      expect(subschemas.length).toEqual(1);
    });
  });

  describe('multiple computed types', () => {
    const storefrontSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Product {
          base: String!
          computeMe: String!
        }
        type Storefront {
          base: ID!
          computeMe: [Product]!
        }
        type Query {
          storefront(id: ID!): Storefront
          _products(representations: [ID!]!): [Product]!
        }
      `,
    });

    it('moves all computed types to the computed schema', async () => {
      const [baseConfig, computedConfig] = isolateComputedFieldsTransformer({
        schema: storefrontSchema,
        merge: {
          Storefront: {
            selectionSet: '{ id }',
            fields: {
              computeMe: {
                selectionSet: '{ availableProductIds }',
                computed: true,
              },
            },
            fieldName: 'storefront',
            args: ({ id }) => ({ id }),
          },
          Product: {
            selectionSet: '{ id weight }',
            fields: {
              computeMe: {
                selectionSet: '{ price }',
                computed: true,
              },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: representations => ({ representations }),
          },
        },
      });

      const baseSubschema = new Subschema(baseConfig);
      const computedSubschema = new Subschema(computedConfig);

      expect(
        Object.keys(
          (baseSubschema.transformedSchema.getType('Query') as GraphQLObjectType).getFields(),
        ),
      ).toEqual(['storefront', '_products']);
      expect(
        Object.keys(
          (baseSubschema.transformedSchema.getType('Product') as GraphQLObjectType).getFields(),
        ),
      ).toEqual(['base']);
      expect(
        Object.keys(
          (baseSubschema.transformedSchema.getType('Storefront') as GraphQLObjectType).getFields(),
        ),
      ).toEqual(['base']);
      assertSome(baseSubschema.merge);
      expect(baseSubschema.merge['Storefront'].fields).toEqual({});

      expect(
        Object.keys(
          (computedSubschema.transformedSchema.getType('Query') as GraphQLObjectType).getFields(),
        ),
      ).toEqual(['storefront', '_products']);
      expect(
        Object.keys(
          (computedSubschema.transformedSchema.getType('Product') as GraphQLObjectType).getFields(),
        ),
      ).toEqual(['base', 'computeMe']);
      expect(
        Object.keys(
          (
            computedSubschema.transformedSchema.getType('Storefront') as GraphQLObjectType
          ).getFields(),
        ),
      ).toEqual(['base', 'computeMe']);
      assertSome(computedSubschema.merge);
      expect(computedSubschema.merge['Storefront'].fields).toEqual({
        computeMe: { selectionSet: '{ availableProductIds }', computed: true },
      });
      expect(computedSubschema.merge['Product'].fields).toEqual({
        computeMe: { selectionSet: '{ price }', computed: true },
      });
    });
  });

  describe('with computed interface fields', () => {
    it('shifts computed interface fields into computed schema', async () => {
      const testSchema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          interface IProduct {
            base: String!
            computeMe: String!
          }
          type Product implements IProduct {
            base: String!
            computeMe: String!
          }
          type Query {
            _products(representations: [ID!]!): [Product]!
          }
        `,
      });

      const [baseConfig, computedConfig] = isolateComputedFieldsTransformer({
        schema: testSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fields: {
              computeMe: {
                selectionSet: '{ price weight }',
                computed: true,
              },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: representations => ({ representations }),
          },
        },
      });

      const baseSubschema = new Subschema(baseConfig);
      const computedSubschema = new Subschema(computedConfig);

      expect(
        Object.keys(
          (baseSubschema.transformedSchema.getType('IProduct') as GraphQLInterfaceType).getFields(),
        ),
      ).toEqual(['base']);
      expect(
        Object.keys(
          (baseSubschema.transformedSchema.getType('Product') as GraphQLObjectType).getFields(),
        ),
      ).toEqual(['base']);
      expect(
        Object.keys(
          (
            computedSubschema.transformedSchema.getType('IProduct') as GraphQLInterfaceType
          ).getFields(),
        ),
      ).toEqual(['base', 'computeMe']);
      expect(
        Object.keys(
          (computedSubschema.transformedSchema.getType('Product') as GraphQLObjectType).getFields(),
        ),
      ).toEqual(['base', 'computeMe']);
    });
    it('do not isolate mutations with shared interface', async () => {
      const testSchema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          interface IProduct {
            base: String!
            computeMe: String!
          }
          type Product implements IProduct {
            base: String!
            computeMe: String!
          }
          type Query {
            _products(representations: [ID!]!): [Product]!
          }
          type Mutation {
            addProduct(name: String!): Product!
          }
        `,
      });
      const [baseConfig, computedConfig] = isolateComputedFieldsTransformer({
        schema: testSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fields: {
              computeMe: {
                selectionSet: '{ price weight }',
                computed: true,
              },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: representations => ({ representations }),
          },
        },
      });
      expect(printSchema(new Subschema(baseConfig).transformedSchema).trim())
        .toMatchInlineSnapshot(`
"interface IProduct {
  base: String!
}

type Product implements IProduct {
  base: String!
}

type Query {
  _products(representations: [ID!]!): [Product]!
}

type Mutation {
  addProduct(name: String!): Product!
}"
`);
      expect(printSchema(new Subschema(computedConfig).transformedSchema).trim())
        .toMatchInlineSnapshot(`
"interface IProduct {
  base: String!
  computeMe: String!
}

type Product implements IProduct {
  base: String!
  computeMe: String!
}

type Query {
  _products(representations: [ID!]!): [Product]!
}

type Mutation {
  addProduct(name: String!): Product!
}"
`);
    });
    it.each([
      {
        name: 'type',
        variant: /* GraphQL */ `
          type SomeTypeWithDisappearingField {
            otherField: String
            disappearingField: SomeRequiredType
          }
        `,
      },
      {
        name: 'required type',
        variant: /* GraphQL */ `
          type SomeTypeWithDisappearingField {
            otherField: String
            disappearingField: SomeRequiredType!
          }
        `,
      },
      {
        name: 'array',
        variant: /* GraphQL */ `
          type SomeTypeWithDisappearingField {
            otherField: String
            disappearingField: [SomeRequiredType]
          }
        `,
      },
      {
        name: 'required array',
        variant: /* GraphQL */ `
          type SomeTypeWithDisappearingField {
            otherField: String
            disappearingField: [SomeRequiredType]!
          }
        `,
      },
      {
        name: 'required array and items',
        variant: /* GraphQL */ `
          type SomeTypeWithDisappearingField {
            otherField: String
            disappearingField: [SomeRequiredType!]!
          }
        `,
      },
    ])('does not isolate $name referenced from other fields', async ({ variant }) => {
      const [baseConfig, computedConfig] = isolateComputedFieldsTransformer({
        schema: makeExecutableSchema({
          typeDefs: /* GraphQL */ `
            scalar _Any

            union _Entity = User

            type Query {
              someResolver: SomeTypeWithDisappearingField
              _entities(representations: [_Any!]!): _Entity
            }

            type SomeRequiredType {
              id: String
            }

            ${variant}

            type User {
              id: ID!
              requiresField: SomeRequiredType
            }
          `,
        }),
        merge: {
          User: {
            selectionSet: '{ id }',
            fields: {
              requiresField: { selectionSet: '{ externalField }', computed: true },
            },
            fieldName: '_entities',
          },
        },
      });

      assertSome(baseConfig.merge);
      expect(baseConfig.merge['SomeRequiredType']).toBeUndefined();

      assertSome(computedConfig.merge);
      expect(computedConfig.merge['SomeRequiredType']).toBeUndefined();
    });
  });

  describe('with multiple entryPoints', () => {
    it('includes all entryPoint fields', async () => {
      const testSchema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Product {
            id: ID!
            upc: ID!
            computeMe: String!
          }
          input ProductById {
            id: ID!
            price: Int
            weight: Int
          }
          input ProductByUpc {
            upc: ID!
            price: Int
            weight: Int
          }
          type Query {
            featuredProduct: Product
            productById(key: ProductById!): Product
            productByUpc(key: ProductByUpc!): Product
          }
        `,
      });

      const [baseConfig, computedConfig] = isolateComputedFieldsTransformer({
        schema: testSchema,
        merge: {
          Product: {
            entryPoints: [
              {
                selectionSet: '{ id }',
                fieldName: 'productById',
                key: ({ id, price, weight }) => ({ id, price, weight }),
                argsFromKeys: key => ({ key }),
              },
              {
                selectionSet: '{ upc }',
                fieldName: 'productByUpc',
                key: ({ upc, price, weight }) => ({ upc, price, weight }),
                argsFromKeys: key => ({ key }),
              },
            ],
            fields: {
              computeMe: {
                selectionSet: '{ price weight }',
                computed: true,
              },
            },
          },
        },
      });

      const baseSubschema = new Subschema(baseConfig);
      const computedSubschema = new Subschema(computedConfig);

      expect(
        Object.keys(
          (baseSubschema.transformedSchema.getType('Product') as GraphQLObjectType).getFields(),
        ),
      ).toEqual(['id', 'upc']);
      expect(
        Object.keys(
          (computedSubschema.transformedSchema.getType('Product') as GraphQLObjectType).getFields(),
        ),
      ).toEqual(['id', 'upc', 'computeMe']);
      expect(
        Object.keys(
          (baseSubschema.transformedSchema.getType('Query') as GraphQLObjectType).getFields(),
        ),
      ).toEqual(['featuredProduct', 'productById', 'productByUpc']);
      expect(
        Object.keys(
          (computedSubschema.transformedSchema.getType('Query') as GraphQLObjectType).getFields(),
        ),
      ).toEqual(['featuredProduct', 'productById', 'productByUpc']);
    });
  });

  describe('with composite return type', () => {
    const testSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        scalar AField

        type Query {
          _item(input: ItemInput!): Item
          _giftOptions(itemId: ID!): GiftOptions
        }

        input ItemInput {
          id: ID!
          aField: AField
        }

        type Item {
          id: ID!

          giftOptionsList: [GiftOptions]
        }

        type GiftOptions {
          itemId: ID!
          someOptions: [String]
        }
      `,
    });

    it.skip('return type is unmerged type', () => {
      const [baseConfig, computedConfig] = isolateComputedFieldsTransformer({
        schema: testSchema,
        merge: {
          Item: {
            selectionSet: '{ id }',
            fieldName: '_item',
            fields: {
              giftOptionsList: {
                selectionSet: '{ aField }',
                computed: true,
                canonical: true,
              },
            },
          },
        },
      });

      const baseSchema = new Subschema(baseConfig);
      const computedSubschema = new Subschema(computedConfig);

      const computedGiftOptionsType = computedSubschema.transformedSchema.getType(
        'GiftOptions',
      ) as GraphQLObjectType;
      expect(computedGiftOptionsType).toBeDefined();

      const computedGiftOptionsTypeFields = computedGiftOptionsType.getFields();
      expect(computedGiftOptionsTypeFields['itemId']).toBeDefined();
      expect(computedGiftOptionsTypeFields['someOptions']).toBeDefined();

      const computedQueryType = computedSubschema.transformedSchema.getType(
        'Query',
      ) as GraphQLObjectType;
      const computedQueryTypeFields = computedQueryType.getFields();
      expect(computedQueryTypeFields['_item']).toBeDefined();
      expect(computedQueryTypeFields['_giftOptions']).toBeDefined();

      const baseGiftOptionsType = baseSchema.transformedSchema.getType(
        'GiftOptions',
      ) as GraphQLObjectType;
      expect(baseGiftOptionsType).toBeUndefined();
      const baseQueryType = baseSchema.transformedSchema.getType('Query') as GraphQLObjectType;
      const baseQueryTypeFields = baseQueryType.getFields();
      expect(baseQueryTypeFields['_item']).toBeDefined();
      expect(baseQueryTypeFields['_giftOptions']).toBeUndefined();
    });

    it('return type is merged type', () => {
      const [baseConfig, computedConfig] = isolateComputedFieldsTransformer({
        schema: testSchema,
        merge: {
          Item: {
            selectionSet: '{ id }',
            fieldName: '_item',
            fields: {
              giftOptionsList: {
                selectionSet: '{ aField }',
                computed: true,
                canonical: true,
              },
            },
          },
          GiftOptions: {
            selectionSet: '{ itemId }',
            fieldName: '_giftOptions',
          },
        },
      });

      const baseSubschema = new Subschema(baseConfig);
      const computedSubschema = new Subschema(computedConfig);

      const computedGiftOptionsType = computedSubschema.transformedSchema.getType(
        'GiftOptions',
      ) as GraphQLObjectType;
      expect(computedGiftOptionsType).toBeDefined();

      const computedGiftOptionsTypeFields = computedGiftOptionsType.getFields();
      expect(computedGiftOptionsTypeFields['itemId']).toBeDefined();
      expect(computedGiftOptionsTypeFields['someOptions']).toBeDefined();

      const computedQueryType = computedSubschema.transformedSchema.getType(
        'Query',
      ) as GraphQLObjectType;
      const computedQueryTypeFields = computedQueryType.getFields();
      expect(computedQueryTypeFields['_item']).toBeDefined();
      expect(computedQueryTypeFields['_giftOptions']).toBeDefined();

      const baseGiftOptionsType = baseSubschema.transformedSchema.getType(
        'GiftOptions',
      ) as GraphQLObjectType;
      expect(baseGiftOptionsType).toBeDefined();
      const baseGiftOptionsTypeFields = baseGiftOptionsType.getFields();
      expect(baseGiftOptionsTypeFields['itemId']).toBeDefined();
      expect(baseGiftOptionsTypeFields['someOptions']).toBeDefined();

      const baseQueryType = baseSubschema.transformedSchema.getType('Query') as GraphQLObjectType;
      const baseQueryTypeFields = baseQueryType.getFields();
      expect(baseQueryTypeFields['_item']).toBeDefined();
      expect(baseQueryTypeFields['_giftOptions']).toBeDefined();
    });
  });

  it('with nested interface return type', async () => {
    const testSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        scalar Any
        type Query {
          entity(representation: Any!): Node
        }

        interface Node {
          id: ID!
        }

        type User implements Node {
          id: ID!
          nickname: String
        }
      `,
      resolvers: {
        Query: {
          entity(_, { representation }) {
            return representation;
          },
        },
        Node: {
          __resolveType() {
            return 'User';
          },
        },
        User: {
          nickname(obj) {
            return obj.name.toUpperCase();
          },
        },
      },
    });

    const subschemaWithNickname = {
      name: 'subschemaWithNickname',
      schema: testSchema,
      merge: {
        User: {
          selectionSet: '{ id }',
          fieldName: 'entity',
          args: (representation: unknown) => ({ representation }),
          fields: {
            nickname: {
              selectionSet: '{ name }',
              computed: true,
            },
          },
        },
      },
    };

    const userSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          user(id: ID!): User
        }

        type User {
          id: ID!
          name: String!
        }
      `,
      resolvers: {
        Query: {
          user() {
            return { id: 2, name: 'Tom' };
          },
        },
      },
    });

    const stitchedSchema2 = stitchSchemas({
      subschemas: [
        subschemaWithNickname,
        {
          name: 'BaseUserSchema',
          schema: userSchema,
          merge: {
            User: {
              selectionSet: '{ id }',
              fieldName: 'user',
            },
          },
        },
      ],
    });

    expect(printSchemaWithDirectives(stitchedSchema2).trim()).toMatchInlineSnapshot(`
"schema {
  query: Query
}

type Query {
  entity(representation: Any!): Node
  user(id: ID!): User
}

scalar Any

interface Node {
  id: ID!
}

type User implements Node {
  id: ID!
  nickname: String
  name: String!
}"
`);
    const result = await normalizedExecutor({
      schema: stitchedSchema2,
      document: parse(/* GraphQL */ `
        query {
          user(id: 2) {
            nickname
          }
        }
      `),
    });
    expect(result).toEqual({
      data: {
        user: {
          nickname: 'TOM',
        },
      },
    });
  });
});

it('keep computed fields in the interfaces', () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        node(id: ID!): Node
      }
      interface Node {
        id: ID!
      }
      type Foo implements Node {
        id: ID!
        bars: BarConnection
      }
      type BarConnection {
        edges: [BarEdge]
        items: [Bar!]
      }
      type BarEdge {
        cursor: String!
        node: Bar!
      }
      type Bar implements Node {
        id: ID!
        baz: IBaz
      }
      interface IBaz {
        id: ID!
        name: String
      }
      type Baz implements Node & IBaz {
        id: ID!
        name: String
        nickname: String
      }
    `,
  });
  const stitchedSchema = stitchSchemas({
    subschemas: [
      {
        schema,
        merge: {
          Foo: {
            selectionSet: '{ id }',
            fieldName: 'node',
            args: ({ id }) => ({ id }),
          },
          Bar: {
            selectionSet: '{ id }',
            fieldName: 'node',
            args: ({ id }) => ({ id }),
          },
          Baz: {
            selectionSet: '{ id }',
            fieldName: 'node',
            args: ({ id }) => ({ id }),
            fields: {
              nickname: {
                selectionSet: '{ name }',
                computed: true,
              },
            },
          },
        },
      },
    ],
  });
  expect(printSchema(stitchedSchema)).toBe(printSchema(schema));
});
