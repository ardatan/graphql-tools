import * as fs from 'fs';
import '../../../testing/to-be-similar-gql-doc';
import { parseImportLine, processImport } from '../../src';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { Kind, print } from 'graphql';

const importSchema = (schema: string, schemas?: Record<string, string>) => {
  const document = processImport(schema, __dirname, schemas);
  return print(mergeTypeDefs(document.definitions.map(definition => ({ kind: Kind.DOCUMENT, definitions: [definition] })), {
    sort: true,
    useSchemaDefinition: false,
  }))
};

const parseSDL = (content: string) => content.split('\n').map(str => str.trim()).filter(str => str.startsWith('# import ') || str.startsWith('#import ')).map(str => parseImportLine(str.replace('#', '').trim()));

describe('importSchema', () => {
  test('parseImportLine: parse single import', () => {
    expect(parseImportLine(`import A from "schema.graphql"`)).toEqual({
      imports: ['A'],
      from: 'schema.graphql',
    });
  });

  test('parseImportLine: optional semicolon', () => {
    expect(parseImportLine(`import A from "schema.graphql";`)).toEqual({
      imports: ['A'],
      from: 'schema.graphql',
    });
  });

  test('parseImportLine: invalid', () => {
    expect(() => parseImportLine(`import from "schema.graphql"`)).toThrow();
  });

  test('parseImportLine: invalid 2', () => {
    expect(() => parseImportLine(`import A from ""`)).toThrow();
  });

  test('parseImportLine: invalid 3', () => {
    expect(() => parseImportLine(`import A. from ""`)).toThrow();
  });

  test('parseImportLine: invalid 4', () => {
    expect(() => parseImportLine(`import A.* from ""`)).toThrow();
  });

  test('parseImportLine: parse multi import', () => {
    expect(parseImportLine(`import A, B from "schema.graphql"`)).toEqual({
      imports: ['A', 'B'],
      from: 'schema.graphql',
    });
  });

  test('parseImportLine: parse multi import (weird spacing)', () => {
    expect(parseImportLine(`import  A  ,B   from "schema.graphql"`)).toEqual({
      imports: ['A', 'B'],
      from: 'schema.graphql',
    });
  });

  test('parseImportLine: different path', () => {
    expect(parseImportLine(`import A from "../new/schema.graphql"`)).toEqual({
      imports: ['A'],
      from: '../new/schema.graphql',
    });
  });

  test('parseImportLine: module in node_modules', () => {
    expect(parseImportLine(`import A from "module-name"`)).toEqual({
      imports: ['A'],
      from: 'module-name',
    });
  });

  test('parseImportLine: specific field', () => {
    expect(parseImportLine(`import A.b from "module-name"`)).toEqual({
      imports: ['A.b'],
      from: 'module-name',
    });
  });

  test('parseImportLine: multiple specific fields', () => {
    expect(parseImportLine(`import A.b, G.q from "module-name"`)).toEqual({
      imports: ['A.b', 'G.q'],
      from: 'module-name',
    });
  });

  test('parseImportLine: default import', () => {
    expect(parseImportLine(`import "module-name"`)).toEqual({
      imports: ['*'],
      from: 'module-name',
    });
  });

  test('parseSDL: non-import comment', () => {
    expect(parseSDL(`#importent: comment`)).toEqual([]);
  });

  test('parse: multi line import', () => {
    const sdl = `\
          # import A from 'a.graphql'
          # import * from "b.graphql"
            `;
    expect(parseSDL(sdl)).toEqual([
      {
        imports: ['A'],
        from: 'a.graphql',
      },
      {
        imports: ['*'],
        from: 'b.graphql',
      },
    ]);
  });

  test('Module in node_modules', () => {
    const b = `\
          # import lower from './lower.graphql'
          type B {
            id: ID!
            nickname: String! @lower
          }
          `;
    const lower = `\
          directive @lower on FIELD_DEFINITION
          `;
    const expectedSDL = /* GraphQL */`\
          type A {
            id: ID!
            author: B!
          }

          type B {
            id: ID!
            nickname: String! @lower
          }

          directive @lower on FIELD_DEFINITION
          `;
    const moduleDir = 'node_modules/graphql-import-test';
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir);
    }

    fs.writeFileSync(moduleDir + '/b.graphql', b);
    fs.writeFileSync(moduleDir + '/lower.graphql', lower);
    expect(importSchema('./fixtures/import-module/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: imports only', () => {
    const expectedSDL = /* GraphQL */`\
          type Query {
            first: String
            second: Float
            third: String
          }
          `;
    expect(importSchema('./fixtures/imports-only/all.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: import .gql extension', () => {
    const expectedSDL = /* GraphQL */`\
          type A {
            id: ID!
          }
          `;
    expect(importSchema('./fixtures/import-gql/a.gql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: import duplicate', () => {
    const expectedSDL = /* GraphQL */`\
          type Query {
            first: String
            second: Float
            third: String
          }
          `;
    expect(importSchema('./fixtures/import-duplicate/all.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: import nested', () => {
    const expectedSDL = /* GraphQL */`\
          type Query {
            first: String
            second: Float
            third: String
          }
          `;
    expect(importSchema('./fixtures/import-nested/all.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: field types', () => {
    const expectedSDL = /* GraphQL */`\
          type A {
            first: String
            second: Float
            b: B
          }

          type B {
            c: C
            hello: String!
          }

          type C {
            id: ID!
          }
          `;
    expect(importSchema('./fixtures/field-types/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: enums', () => {
    const expectedSDL = /* GraphQL */`\
          type A {
            first: String
            second: Float
            b: B
          }

          enum B {
            B1
            B2
            B3
          }
          `;
    expect(importSchema('./fixtures/enums/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: import all', () => {
    const expectedSDL = /* GraphQL */`\
          type A {
            first: String
            second: Float
            b: B
          }

          type B {
            hello: String!
            c1: C1
            c2: C2
          }

          type C1 {
            id: ID!
          }

          type C2 {
            id: ID!
          }
          `;
    expect(importSchema('./fixtures/import-all/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: import all from objects', () => {
    const expectedSDL = /* GraphQL */`\
          type A {
            first: String
            second: Float
            b: B
          }

          type B {
            hello: String!
            c1: C1
            c2: C2
          }

          type C1 {
            id: ID!
          }

          type C2 {
            id: ID!
          }
          `;
    expect(importSchema(`./fixtures/import-all-from-objects/a.graphql`)).toBeSimilarGqlDoc(expectedSDL);
  });

  test(`importSchema: single object schema`, () => {
    const expectedSDL = /* GraphQL */`\
          type A {
            field: String
          }
          `;

    expect(importSchema('./fixtures/single-object/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test(`importSchema: import all mix 'n match`, () => {
    const expectedSDL = /* GraphQL */`\
          scalar Date

          type A {
            first: String
            second: Float
            b: B
            date: Date
          }

          type C1 {
            id: ID!
          }

          type C2 {
            id: ID!
          }

          type B {
            hello: String!
            c1: C1
            c2: C2
          }
          `;

    expect(importSchema('./fixtures/mix-n-match/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test(`importSchema: import all mix 'n match 2`, () => {
    const expectedSDL = /* GraphQL */`\
          type A {
            first: String
            second: Float
            b: B
          }

          type B {
            hello: String!
            c1: C1
            c2: C2
          }

          type C1 {
            id: ID!
          }

          type C2 {
            id: ID!
          }
          `;
    expect(importSchema('./fixtures/mix-n-match2/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test(`importSchema: import all - include Query/Mutation/Subscription type`, () => {

    const expectedSDL = /* GraphQL */`\
          type Query {
            greet: String!
          }

          type A {
            first: String
            second: Float
            b: B
          }

          type B {
            hello: String!
            c1: C1
            c2: C2
          }

          type C1 {
            id: ID!
          }

          type C2 {
            id: ID!
          }
          `;
    expect(importSchema('./fixtures/include-root-types/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: scalar', () => {
    const expectedSDL = /* GraphQL */`\
          type A {
            b: B
          }

          scalar B
          `;
    expect(importSchema('./fixtures/scalar/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: directive', () => {
    const expectedSDL = /* GraphQL */`\
          type A {
            first: String @upper
            second: String @withB @deprecated
          }

          scalar B

          directive @upper on FIELD_DEFINITION

          directive @withB(argB: B) on FIELD_DEFINITION
          `;
    expect(importSchema('./fixtures/directive/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: key directive', () => {
    const expectedSDL = /* GraphQL */`\
          scalar UPC

          type Product @key(fields: "upc") {
            upc: UPC!
            name: String
          }
          `;
    expect(importSchema('./fixtures/directive/c.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  // TODO: later
  test.skip('importSchema: multiple key directive', () => {
    const expectedSDL = /* GraphQL */`\
          scalar UPC

          scalar SKU

          type Product @key(fields: "upc") @key(fields: "sku") {
            upc: UPC!
            sku: SKU!
            name: String
          }
          `;
    expect(importSchema('./fixtures/directive/e.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: external directive', () => {
    const expectedSDL = /* GraphQL */`\
          type Review @key(fields: "id") {
            product: Product @provides(fields: "name")
          }

          extend type Product @key(fields: "upc") {
            upc: String @external
            name: String @external
          }
          `;
    expect(importSchema('./fixtures/directive/f.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: requires directive', () => {
    const expectedSDL = /* GraphQL */`\
          type Review {
            id: ID
          }

          extend type User @key(fields: "id") {
            id: ID! @external
            email: String @external
            reviews: [Review] @requires(fields: "email")
          }
          `;
    expect(importSchema('./fixtures/directive/g.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: interfaces', () => {
    const expectedSDL = /* GraphQL */`\
          type A implements B {
            first: String
            second: Float
          }

          interface B {
            second: Float
            c: [C!]!
          }

          type C {
            c: ID!
          }
          `;
    expect(importSchema('./fixtures/interfaces/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: interfaces-many', () => {
    const expectedSDL = /* GraphQL */`\
          type A implements B {
            first: String
            second: Float
          }

          interface B {
            second: Float
            c: [C!]!
          }

          type C implements D1 & D2 {
            c: ID!
          }

          interface D1 {
            d1: ID!
          }

          interface D2 {
            d2: ID!
          }
          `;
    expect(importSchema('./fixtures/interfaces-many/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: interfaces-implements', () => {
    const expectedSDL = /* GraphQL */`\
          type A implements B {
            id: ID!
          }

          interface B {
            id: ID!
          }

          type B1 implements B {
            id: ID!
          }
          `;
    expect(importSchema('./fixtures/interfaces-implements/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: interfaces-implements-many', () => {
    const expectedSDL = /* GraphQL */`\
          type A implements B {
            id: ID!
          }

          interface B {
            id: ID!
          }

          type B1 implements B {
            id: ID!
          }

          type B2 implements B {
            id: ID!
          }
          `;
    expect(importSchema('./fixtures/interfaces-implements-many/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: input types', () => {
    const expectedSDL = /* GraphQL */`\
          type A {
            first(b: B): String
            second: Float
          }

          input B {
            hello: [C!]!
          }

          input C {
            id: ID!
          }
          `;
    expect(importSchema('./fixtures/input-types/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: complex test', () => {
    try {
      const a = importSchema('./fixtures/complex/a.graphql');
      expect(a).toBeTruthy();
    } catch (e) {
      expect(e).toBeFalsy();
    }
  });

  test('circular imports', () => {
    const expectedSDL = /* GraphQL */`\
          type A {
            first: String
            second: Float
            b: B
          }

          type C1 {
            id: ID!
          }

          type C2 {
            id: ID!
          }

          type B {
            hello: String!
            c1: C1
            c2: C2
            a: A
          }
          `;
    const actualSDL = importSchema('./fixtures/circular/a.graphql');
    expect(actualSDL).toBeSimilarGqlDoc(expectedSDL);
  });

  test('related types', () => {
    const expectedSDL = /* GraphQL */`\
          type A {
            first: String
            second: Float
            b: B
          }

          type B {
            hello: String!
            c1: C
          }

          type C {
            field: String
          }
          `;
    const actualSDL = importSchema('./fixtures/related-types/a.graphql');
    expect(actualSDL).toBeSimilarGqlDoc(expectedSDL);
  });

  test('relative paths', () => {
    const expectedSDL = /* GraphQL */`\
          type Query {
            feed: [Post!]!
          }

          type Mutation {
            createDraft(title: String!, text: String): Post
            publish(id: ID!): Post
          }

          type Post implements Node {
            id: ID!
            isPublished: Boolean!
            title: String!
            text: String!
          }

          interface Node {
            id: ID!
          }
          `;
    const actualSDL = importSchema('./fixtures/relative-paths/src/schema.graphql');
    expect(actualSDL).toBeSimilarGqlDoc(expectedSDL);
  });

  test('root field imports', () => {
    const expectedSDL = /* GraphQL */`\
          type Query {
            posts(filter: PostFilter): [Post]
          }

          type Dummy {
            field: String
          }

          type Post {
            field1: String
          }

          input PostFilter {
            field3: Int
          }
          `;
    const actualSDL = importSchema('./fixtures/root-fields/a.graphql');
    expect(actualSDL).toBeSimilarGqlDoc(expectedSDL);
  });

  test('extend root field', () => {
    const expectedSDL = /* GraphQL */`\
          extend type Query {
            me: User
          }

          type User @key(fields: "id") {
            id: ID!
            name: String
          }
          `;
    const actualSDL = importSchema('./fixtures/root-fields/c.graphql');
    expect(actualSDL).toBeSimilarGqlDoc(expectedSDL);
  });

  test('extend root field imports', () => {
    const expectedSDL = /* GraphQL */`\
          extend type Query {
            me: User
            post: Post
          }

          type Post {
            id: ID!
          }

          type User @key(fields: "id") {
            id: ID!
            name: String
          }
          `;
    const actualSDL = importSchema('./fixtures/root-fields/d.graphql');
    expect(actualSDL).toBeSimilarGqlDoc(expectedSDL);
  });

  test('merged root field imports', () => {
    const expectedSDL = /* GraphQL */`\
          type Query {
            helloA: String
            posts(filter: PostFilter): [Post]
            hello: String
          }

          type Dummy {
            field: String
            field2: String
          }

          type Post {
            field1: String
          }

          input PostFilter {
            field3: Int
          }
          `;
    const actualSDL = importSchema('./fixtures/merged-root-fields/a.graphql');
    expect(actualSDL).toBeSimilarGqlDoc(expectedSDL);
  });

  test('global schema modules', () => {
    const shared = `
              type Shared {
                first: String
              }

            `;
    const expectedSDL = /* GraphQL */`\
          type A {
            first: String
            second: Shared
          }

          type Shared {
            first: String
          }
          `;
    expect(importSchema('./fixtures/global/a.graphql', { shared })).toBeSimilarGqlDoc(expectedSDL);
  });

  test('missing type on type', () => {
    try {
      importSchema('./fixtures/type-not-found/a.graphql');
      throw new Error();
    } catch (e) {
      expect(e.message).toBe(`Couldn't find type Post in any of the schemas.`);
    }

  });

  test('missing type on interface', () => {
    try {
      importSchema('./fixtures/type-not-found/b.graphql');
      throw new Error();
    } catch (e) {
      expect(e.message).toBe(`Couldn't find type Post in any of the schemas.`);
    }

  });

  test('missing type on input type', () => {
    try {
      importSchema('./fixtures/type-not-found/c.graphql');
      throw new Error();
    } catch (e) {
      expect(e.message).toBe(`Couldn't find type Post in any of the schemas.`);
    }

  });

  test('missing interface type', () => {

    try {
      importSchema('./fixtures/type-not-found/d.graphql');
      throw new Error();
    } catch (e) {
      expect(e.message).toBe(`Couldn't find type MyInterface in any of the schemas.`);
    }

  });

  test('missing union type', () => {

    try {
      importSchema('./fixtures/type-not-found/e.graphql');
      throw new Error();
    } catch (e) {
      expect(e.message).toBe(`Couldn't find type C in any of the schemas.`);
    }

  });

  test('missing type on input type', () => {

    try {
      importSchema('./fixtures/type-not-found/f.graphql');
      throw new Error();
    } catch (e) {
      expect(e.message).toBe(`Couldn't find type Post in any of the schemas.`);
    }

  });

  test('missing type on directive', () => {

    try {
      importSchema('./fixtures/type-not-found/g.graphql');
      throw new Error();
    } catch (e) {
      expect(e.message).toBe(`Couldn't find type first in any of the schemas.`);
    }

  });

  test('import with collision', () => {
    // Local type gets preference over imported type
    const expectedSDL = /* GraphQL */`\
          type User {
            id: ID!
            name: String!
            intro: String
          }
          `;
    expect(importSchema('./fixtures/collision/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('merged custom root fields imports', () => {
    const expectedSDL = /* GraphQL */`\
            type Query {
              helloA: String
              posts(filter: PostFilter): [Post]
              hello: String
            }
            type Dummy {
              field: String
              field2: String
            }
            type Post {
              field1: String
            }
            input PostFilter {
              field3: Int
            }
            `;
    const actualSDL = importSchema('./fixtures/merged-root-fields/a.graphql');
    expect(actualSDL).toBeSimilarGqlDoc(expectedSDL);
  });

  test('respect schema definition', () => {
    const expectedSDL = /* GraphQL */`\
      schema {
        query: MyQuery
        mutation: MyMutation
      }

      type MyQuery {
        b: String
      }

      type MyMutation {
        c: String
      }
    `;
    const actualSDL = importSchema('./fixtures/schema-definition/a.graphql');
    expect(actualSDL).toBeSimilarGqlDoc(expectedSDL);
  });

  test('import schema with shadowed type', () => {
    const expectedSDL = /* GraphQL */`\
      type Query {
        b: B!
      }
      type B {
        x: X
      }
      scalar X
  `;
    expect(importSchema('./fixtures/import-shadowed/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('import specific types', () => {
    const expectedSDL = /* GraphQL */`\
  type User implements B {
    b: String!
    c: [C!]!
  }
  interface B {
    B: String!
  }
  type C {
    c: String
  }
  `;
    expect(importSchema('./fixtures/specific/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('imports missing named imports for file imported multiple time without duplicates', () => {
    const expectedSDL = /* GraphQL */`\
  type Query {
    a: B
    b: B
    c: B
  }
  type Mutation {
    a: B
    b: B
    c: B
  }
  type B {
    x: String
  }
  `;
    expect(importSchema('fixtures/multiple-imports/schema.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });
})
