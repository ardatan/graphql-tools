import '../../testing/to-be-similar-string';
import { federationToStitchingSDL } from '../src/federationToStitchingSDL.js';
import { stitchingDirectives } from '../src/stitchingDirectives.js';

const defaultStitchingDirectives = stitchingDirectives();

describe('federation sdl', () => {
  test('translates to stitching annotations', async () => {
    const federationSdl = /* GraphQL */ `
      extend type Product implements IProduct @key(fields: "id") {
        id: ID! @external
        weight: Int @external
        shippingCost: Int @requires(fields: "weight")
        parent: Product @provides(fields: "weight")
      }
      extend interface IProduct @key(fields: "id") {
        id: ID! @external
        weight: Int @external
        shippingCost: Int @requires(fields: "weight")
        parent: Product @provides(fields: "weight")
      }
    `;

    const stitchingSdl = /* GraphQL */ `
      ${defaultStitchingDirectives.stitchingDirectivesTypeDefs}
      type Product implements IProduct @key(selectionSet: "{ id }") {
        id: ID!
        shippingCost: Int @computed(selectionSet: "{ weight }")
        parent: Product
      }
      interface IProduct @key(selectionSet: "{ id }") {
        id: ID!
        shippingCost: Int @computed(selectionSet: "{ weight }")
        parent: Product
      }
      scalar _Any
      union _Entity = Product
      type Query {
        _entities(representations: [_Any!]!): [_Entity]! @merge
      }
    `;

    const result = federationToStitchingSDL(federationSdl);
    expect(result).toBeSimilarString(stitchingSdl);
  });

  test('adds _entities to existing Query', async () => {
    const federationSdl = /* GraphQL */ `
      extend type Product @key(fields: "id") {
        id: ID!
      }
      type Query {
        product(id: ID!): Product
      }
    `;

    const stitchingSdl = /* GraphQL */ `
      ${defaultStitchingDirectives.stitchingDirectivesTypeDefs}
      type Product @key(selectionSet: "{ id }") {
        id: ID!
      }
      type Query {
        product(id: ID!): Product
        _entities(representations: [_Any!]!): [_Entity]! @merge
      }
      scalar _Any
      union _Entity = Product
    `;

    const result = federationToStitchingSDL(federationSdl);
    expect(result).toBeSimilarString(stitchingSdl);
  });

  test('adds _entities to schema-defined query type', async () => {
    const federationSdl = /* GraphQL */ `
      extend type Product @key(fields: "id") {
        id: ID!
      }
      type RootQuery {
        product(id: ID!): Product
      }
      schema {
        query: RootQuery
      }
    `;

    const stitchingSdl = /* GraphQL */ `
      ${defaultStitchingDirectives.stitchingDirectivesTypeDefs}
      type Product @key(selectionSet: "{ id }") {
        id: ID!
      }
      type RootQuery {
        product(id: ID!): Product
        _entities(representations: [_Any!]!): [_Entity]! @merge
      }
      schema {
        query: RootQuery
      }
      scalar _Any
      union _Entity = Product
    `;

    const result = federationToStitchingSDL(federationSdl);
    expect(result).toBeSimilarString(stitchingSdl);
  });

  test('only un-extends types without a base', async () => {
    const federationSdl = /* GraphQL */ `
      extend type Product {
        id: ID!
        name: String
      }
      type Thing {
        id: ID
      }
      extend type Thing {
        name: String
      }
    `;

    const stitchingSdl = /* GraphQL */ `
      ${defaultStitchingDirectives.stitchingDirectivesTypeDefs}
      type Product {
        id: ID!
        name: String
      }
      type Thing {
        id: ID
      }
      extend type Thing {
        name: String
      }
    `;

    const result = federationToStitchingSDL(federationSdl);
    expect(result).toBeSimilarString(stitchingSdl);
  });
});
