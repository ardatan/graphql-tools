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
    expect(parseSDL(`#important: comment`)).toEqual([]);
  });

  test('parse: multi line import', () => {
    const sdl = /* GraphQL */`\
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
    } catch (e: any) {
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
    } catch (e: any) {
      expect(e.message).toBe(`Couldn't find type Post in any of the schemas.`);
    }

  });

  test('missing type on interface', () => {
    try {
      importSchema('./fixtures/type-not-found/b.graphql');
      throw new Error();
    } catch (e: any) {
      expect(e.message).toBe(`Couldn't find type Post in any of the schemas.`);
    }

  });

  test('missing type on input type', () => {
    try {
      importSchema('./fixtures/type-not-found/c.graphql');
      throw new Error();
    } catch (e: any) {
      expect(e.message).toBe(`Couldn't find type Post in any of the schemas.`);
    }

  });

  test('missing interface type', () => {

    try {
      importSchema('./fixtures/type-not-found/d.graphql');
      throw new Error();
    } catch (e: any) {
      expect(e.message).toBe(`Couldn't find type MyInterface in any of the schemas.`);
    }

  });

  test('missing union type', () => {

    try {
      importSchema('./fixtures/type-not-found/e.graphql');
      throw new Error();
    } catch (e: any) {
      expect(e.message).toBe(`Couldn't find type C in any of the schemas.`);
    }

  });

  test('missing type on input type', () => {

    try {
      importSchema('./fixtures/type-not-found/f.graphql');
      throw new Error();
    } catch (e: any) {
      expect(e.message).toBe(`Couldn't find type Post in any of the schemas.`);
    }

  });

  test('missing type on directive', () => {

    try {
      importSchema('./fixtures/type-not-found/g.graphql');
      throw new Error();
    } catch (e: any) {
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

  test('imports multiple imports at least 3 levels deep with transitive dependencies', () => {
    const expectedSDL = /* GraphQL */`
        type Product {
            price: Int
        }

        type Products {
            items: [Product]
        }

        type Account {
            id: ID
            cart: Cart
        }

        type Cart {
            total: Int
            products: Products
        }

        type Query {
            user: User
        }

        type User {
            account: Account
        }
    `;
    expect(importSchema('fixtures/multiple-levels/level1.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('imports dependencies at least 3 levels deep with transitive dependencies while using master schemata', () => {
    const expectedSDL = /* GraphQL */`
      type Account {
        id: ID
        cart: Cart
      }

      type Cart {
        products: Products
        total: Int
      }

      type PaginatedWrapper {
        user: User
      }

      type Product {
        price: Int
      }

      type Products {
        items: [Product]
      }

      type Query {
        pagination: PaginatedWrapper
      }

      type User {
        account: Account
      }
    `;
    expect(importSchema('fixtures/multiple-levels-master-schema/level1.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('imports dependencies with transitive dependencies while using master schemata with directories', () => {
    const expectedSDL = /* GraphQL */`
      type Model1 {
        data: String!
      }

      type Model10 {
        data: String!
      }

      type Model100 {
        data: String!
      }

      type Model101 {
        data: String!
      }

      type Model102 {
        data: String!
      }

      type Model103 {
        data: String!
      }

      type Model104 {
        data: String!
      }

      type Model105 {
        data: String!
      }

      type Model106 {
        data: String!
      }

      type Model107 {
        data: String!
      }

      type Model108 {
        data: String!
      }

      type Model109 {
        data: String!
      }

      type Model11 {
        data: String!
      }

      type Model110 {
        data: String!
      }

      type Model111 {
        data: String!
      }

      type Model112 {
        data: String!
      }

      type Model113 {
        data: String!
      }

      type Model114 {
        data: String!
      }

      type Model115 {
        data: String!
      }

      type Model116 {
        data: String!
      }

      type Model117 {
        data: String!
      }

      type Model118 {
        data: String!
      }

      type Model119 {
        data: String!
      }

      type Model12 {
        data: String!
      }

      type Model120 {
        data: String!
      }

      type Model121 {
        data: String!
      }

      type Model122 {
        data: String!
      }

      type Model123 {
        data: String!
      }

      type Model124 {
        data: String!
      }

      type Model125 {
        data: String!
      }

      type Model126 {
        data: String!
      }

      type Model127 {
        data: String!
      }

      type Model128 {
        data: String!
      }

      type Model129 {
        data: String!
      }

      type Model13 {
        data: String!
      }

      type Model130 {
        data: String!
      }

      type Model131 {
        data: String!
      }

      type Model132 {
        data: String!
      }

      type Model133 {
        data: String!
      }

      type Model134 {
        data: String!
      }

      type Model135 {
        data: String!
      }

      type Model136 {
        data: String!
      }

      type Model137 {
        data: String!
      }

      type Model138 {
        data: String!
      }

      type Model139 {
        data: String!
      }

      type Model14 {
        data: String!
      }

      type Model140 {
        data: String!
      }

      type Model141 {
        data: String!
      }

      type Model142 {
        data: String!
      }

      type Model143 {
        data: String!
      }

      type Model144 {
        data: String!
      }

      type Model145 {
        data: String!
      }

      type Model146 {
        data: String!
      }

      type Model147 {
        data: String!
      }

      type Model148 {
        data: String!
      }

      type Model149 {
        data: String!
      }

      type Model15 {
        data: String!
      }

      type Model150 {
        data: String!
      }

      type Model151 {
        data: String!
      }

      type Model152 {
        data: String!
      }

      type Model153 {
        data: String!
      }

      type Model154 {
        data: String!
      }

      type Model155 {
        data: String!
      }

      type Model156 {
        data: String!
      }

      type Model157 {
        data: String!
      }

      type Model158 {
        data: String!
      }

      type Model159 {
        data: String!
      }

      type Model16 {
        data: String!
      }

      type Model160 {
        data: String!
      }

      type Model161 {
        data: String!
      }

      type Model162 {
        data: String!
      }

      type Model163 {
        data: String!
      }

      type Model164 {
        data: String!
      }

      type Model165 {
        data: String!
      }

      type Model166 {
        data: String!
      }

      type Model167 {
        data: String!
      }

      type Model168 {
        data: String!
      }

      type Model169 {
        data: String!
      }

      type Model17 {
        data: String!
      }

      type Model170 {
        data: String!
      }

      type Model171 {
        data: String!
      }

      type Model172 {
        data: String!
      }

      type Model173 {
        data: String!
      }

      type Model174 {
        data: String!
      }

      type Model175 {
        data: String!
      }

      type Model176 {
        data: String!
      }

      type Model177 {
        data: String!
      }

      type Model178 {
        data: String!
      }

      type Model179 {
        data: String!
      }

      type Model18 {
        data: String!
      }

      type Model180 {
        data: String!
      }

      type Model181 {
        data: String!
      }

      type Model182 {
        data: String!
      }

      type Model183 {
        data: String!
      }

      type Model184 {
        data: String!
      }

      type Model185 {
        data: String!
      }

      type Model186 {
        data: String!
      }

      type Model187 {
        data: String!
      }

      type Model188 {
        data: String!
      }

      type Model189 {
        data: String!
      }

      type Model19 {
        data: String!
      }

      type Model190 {
        data: String!
      }

      type Model191 {
        data: String!
      }

      type Model192 {
        data: String!
      }

      type Model193 {
        data: String!
      }

      type Model194 {
        data: String!
      }

      type Model195 {
        data: String!
      }

      type Model196 {
        data: String!
      }

      type Model197 {
        data: String!
      }

      type Model198 {
        data: String!
      }

      type Model199 {
        data: String!
      }

      type Model2 {
        data: String!
      }

      type Model20 {
        data: String!
      }

      type Model200 {
        data: String!
      }

      type Model201 {
        data: String!
      }

      type Model202 {
        data: String!
      }

      type Model203 {
        data: String!
      }

      type Model204 {
        data: String!
      }

      type Model205 {
        data: String!
      }

      type Model206 {
        data: String!
      }

      type Model207 {
        data: String!
      }

      type Model208 {
        data: String!
      }

      type Model209 {
        data: String!
      }

      type Model21 {
        data: String!
      }

      type Model210 {
        data: String!
      }

      type Model211 {
        data: String!
      }

      type Model212 {
        data: String!
      }

      type Model213 {
        data: String!
      }

      type Model214 {
        data: String!
      }

      type Model215 {
        data: String!
      }

      type Model216 {
        data: String!
      }

      type Model217 {
        data: String!
      }

      type Model218 {
        data: String!
      }

      type Model219 {
        data: String!
      }

      type Model22 {
        data: String!
      }

      type Model220 {
        data: String!
      }

      type Model221 {
        data: String!
      }

      type Model222 {
        data: String!
      }

      type Model223 {
        data: String!
      }

      type Model224 {
        data: String!
      }

      type Model225 {
        data: String!
      }

      type Model226 {
        data: String!
      }

      type Model227 {
        data: String!
      }

      type Model228 {
        data: String!
      }

      type Model229 {
        data: String!
      }

      type Model23 {
        data: String!
      }

      type Model230 {
        data: String!
      }

      type Model231 {
        data: String!
      }

      type Model232 {
        data: String!
      }

      type Model233 {
        data: String!
      }

      type Model234 {
        data: String!
      }

      type Model235 {
        data: String!
      }

      type Model236 {
        data: String!
      }

      type Model237 {
        data: String!
      }

      type Model238 {
        data: String!
      }

      type Model239 {
        data: String!
      }

      type Model24 {
        data: String!
      }

      type Model240 {
        data: String!
      }

      type Model241 {
        data: String!
      }

      type Model242 {
        data: String!
      }

      type Model243 {
        data: String!
      }

      type Model244 {
        data: String!
      }

      type Model245 {
        data: String!
      }

      type Model246 {
        data: String!
      }

      type Model247 {
        data: String!
      }

      type Model248 {
        data: String!
      }

      type Model249 {
        data: String!
      }

      type Model25 {
        data: String!
      }

      type Model250 {
        data: String!
      }

      type Model251 {
        data: String!
      }

      type Model252 {
        data: String!
      }

      type Model253 {
        data: String!
      }

      type Model254 {
        data: String!
      }

      type Model255 {
        data: String!
      }

      type Model256 {
        data: String!
      }

      type Model257 {
        data: String!
      }

      type Model258 {
        data: String!
      }

      type Model259 {
        data: String!
      }

      type Model26 {
        data: String!
      }

      type Model260 {
        data: String!
      }

      type Model261 {
        data: String!
      }

      type Model262 {
        data: String!
      }

      type Model263 {
        data: String!
      }

      type Model264 {
        data: String!
      }

      type Model265 {
        data: String!
      }

      type Model266 {
        data: String!
      }

      type Model267 {
        data: String!
      }

      type Model268 {
        data: String!
      }

      type Model269 {
        data: String!
      }

      type Model27 {
        data: String!
      }

      type Model270 {
        data: String!
      }

      type Model271 {
        data: String!
      }

      type Model272 {
        data: String!
      }

      type Model273 {
        data: String!
      }

      type Model274 {
        data: String!
      }

      type Model275 {
        data: String!
      }

      type Model276 {
        data: String!
      }

      type Model277 {
        data: String!
      }

      type Model278 {
        data: String!
      }

      type Model279 {
        data: String!
      }

      type Model28 {
        data: String!
      }

      type Model280 {
        data: String!
      }

      type Model281 {
        data: String!
      }

      type Model282 {
        data: String!
      }

      type Model283 {
        data: String!
      }

      type Model284 {
        data: String!
      }

      type Model285 {
        data: String!
      }

      type Model286 {
        data: String!
      }

      type Model287 {
        data: String!
      }

      type Model288 {
        data: String!
      }

      type Model289 {
        data: String!
      }

      type Model29 {
        data: String!
      }

      type Model290 {
        data: String!
      }

      type Model291 {
        data: String!
      }

      type Model292 {
        data: String!
      }

      type Model293 {
        data: String!
      }

      type Model294 {
        data: String!
      }

      type Model295 {
        data: String!
      }

      type Model296 {
        data: String!
      }

      type Model297 {
        data: String!
      }

      type Model298 {
        data: String!
      }

      type Model299 {
        data: String!
      }

      type Model3 {
        data: String!
      }

      type Model30 {
        data: String!
      }

      type Model300 {
        data: String!
      }

      type Model301 {
        data: String!
      }

      type Model302 {
        data: String!
      }

      type Model303 {
        data: String!
      }

      type Model304 {
        data: String!
      }

      type Model305 {
        data: String!
      }

      type Model306 {
        data: String!
      }

      type Model307 {
        data: String!
      }

      type Model308 {
        data: String!
      }

      type Model309 {
        data: String!
      }

      type Model31 {
        data: String!
      }

      type Model310 {
        data: String!
      }

      type Model311 {
        data: String!
      }

      type Model312 {
        data: String!
      }

      type Model313 {
        data: String!
      }

      type Model314 {
        data: String!
      }

      type Model315 {
        data: String!
      }

      type Model316 {
        data: String!
      }

      type Model317 {
        data: String!
      }

      type Model318 {
        data: String!
      }

      type Model319 {
        data: String!
      }

      type Model32 {
        data: String!
      }

      type Model320 {
        data: String!
      }

      type Model321 {
        data: String!
      }

      type Model322 {
        data: String!
      }

      type Model323 {
        data: String!
      }

      type Model324 {
        data: String!
      }

      type Model325 {
        data: String!
      }

      type Model326 {
        data: String!
      }

      type Model327 {
        data: String!
      }

      type Model328 {
        data: String!
      }

      type Model329 {
        data: String!
      }

      type Model33 {
        data: String!
      }

      type Model330 {
        data: String!
      }

      type Model331 {
        data: String!
      }

      type Model332 {
        data: String!
      }

      type Model333 {
        data: String!
      }

      type Model334 {
        data: String!
      }

      type Model335 {
        data: String!
      }

      type Model336 {
        data: String!
      }

      type Model337 {
        data: String!
      }

      type Model338 {
        data: String!
      }

      type Model339 {
        data: String!
      }

      type Model34 {
        data: String!
      }

      type Model340 {
        data: String!
      }

      type Model341 {
        data: String!
      }

      type Model342 {
        data: String!
      }

      type Model343 {
        data: String!
      }

      type Model344 {
        data: String!
      }

      type Model345 {
        data: String!
      }

      type Model346 {
        data: String!
      }

      type Model347 {
        data: String!
      }

      type Model348 {
        data: String!
      }

      type Model349 {
        data: String!
      }

      type Model35 {
        data: String!
      }

      type Model350 {
        data: String!
      }

      type Model351 {
        data: String!
      }

      type Model352 {
        data: String!
      }

      type Model353 {
        data: String!
      }

      type Model354 {
        data: String!
      }

      type Model355 {
        data: String!
      }

      type Model356 {
        data: String!
      }

      type Model357 {
        data: String!
      }

      type Model358 {
        data: String!
      }

      type Model359 {
        data: String!
      }

      type Model36 {
        data: String!
      }

      type Model360 {
        data: String!
      }

      type Model361 {
        data: String!
      }

      type Model362 {
        data: String!
      }

      type Model363 {
        data: String!
      }

      type Model364 {
        data: String!
      }

      type Model365 {
        data: String!
      }

      type Model366 {
        data: String!
      }

      type Model367 {
        data: String!
      }

      type Model368 {
        data: String!
      }

      type Model369 {
        data: String!
      }

      type Model37 {
        data: String!
      }

      type Model370 {
        data: String!
      }

      type Model371 {
        data: String!
      }

      type Model372 {
        data: String!
      }

      type Model373 {
        data: String!
      }

      type Model374 {
        data: String!
      }

      type Model375 {
        data: String!
      }

      type Model376 {
        data: String!
      }

      type Model377 {
        data: String!
      }

      type Model378 {
        data: String!
      }

      type Model379 {
        data: String!
      }

      type Model38 {
        data: String!
      }

      type Model380 {
        data: String!
      }

      type Model381 {
        data: String!
      }

      type Model382 {
        data: String!
      }

      type Model383 {
        data: String!
      }

      type Model384 {
        data: String!
      }

      type Model385 {
        data: String!
      }

      type Model386 {
        data: String!
      }

      type Model387 {
        data: String!
      }

      type Model388 {
        data: String!
      }

      type Model389 {
        data: String!
      }

      type Model39 {
        data: String!
      }

      type Model390 {
        data: String!
      }

      type Model391 {
        data: String!
      }

      type Model392 {
        data: String!
      }

      type Model393 {
        data: String!
      }

      type Model394 {
        data: String!
      }

      type Model395 {
        data: String!
      }

      type Model396 {
        data: String!
      }

      type Model397 {
        data: String!
      }

      type Model398 {
        data: String!
      }

      type Model399 {
        data: String!
      }

      type Model4 {
        data: String!
      }

      type Model40 {
        data: String!
      }

      type Model400 {
        data: String!
      }

      type Model401 {
        data: String!
      }

      type Model402 {
        data: String!
      }

      type Model403 {
        data: String!
      }

      type Model404 {
        data: String!
      }

      type Model405 {
        data: String!
      }

      type Model406 {
        data: String!
      }

      type Model407 {
        data: String!
      }

      type Model408 {
        data: String!
      }

      type Model409 {
        data: String!
      }

      type Model41 {
        data: String!
      }

      type Model410 {
        data: String!
      }

      type Model411 {
        data: String!
      }

      type Model412 {
        data: String!
      }

      type Model413 {
        data: String!
      }

      type Model414 {
        data: String!
      }

      type Model415 {
        data: String!
      }

      type Model416 {
        data: String!
      }

      type Model417 {
        data: String!
      }

      type Model418 {
        data: String!
      }

      type Model419 {
        data: String!
      }

      type Model42 {
        data: String!
      }

      type Model420 {
        data: String!
      }

      type Model421 {
        data: String!
      }

      type Model422 {
        data: String!
      }

      type Model423 {
        data: String!
      }

      type Model424 {
        data: String!
      }

      type Model425 {
        data: String!
      }

      type Model426 {
        data: String!
      }

      type Model427 {
        data: String!
      }

      type Model428 {
        data: String!
      }

      type Model429 {
        data: String!
      }

      type Model43 {
        data: String!
      }

      type Model430 {
        data: String!
      }

      type Model431 {
        data: String!
      }

      type Model432 {
        data: String!
      }

      type Model433 {
        data: String!
      }

      type Model434 {
        data: String!
      }

      type Model435 {
        data: String!
      }

      type Model436 {
        data: String!
      }

      type Model437 {
        data: String!
      }

      type Model438 {
        data: String!
      }

      type Model439 {
        data: String!
      }

      type Model44 {
        data: String!
      }

      type Model440 {
        data: String!
      }

      type Model441 {
        data: String!
      }

      type Model442 {
        data: String!
      }

      type Model443 {
        data: String!
      }

      type Model444 {
        data: String!
      }

      type Model445 {
        data: String!
      }

      type Model446 {
        data: String!
      }

      type Model447 {
        data: String!
      }

      type Model448 {
        data: String!
      }

      type Model449 {
        data: String!
      }

      type Model45 {
        data: String!
      }

      type Model450 {
        data: String!
      }

      type Model451 {
        data: String!
      }

      type Model452 {
        data: String!
      }

      type Model453 {
        data: String!
      }

      type Model454 {
        data: String!
      }

      type Model455 {
        data: String!
      }

      type Model456 {
        data: String!
      }

      type Model457 {
        data: String!
      }

      type Model458 {
        data: String!
      }

      type Model459 {
        data: String!
      }

      type Model46 {
        data: String!
      }

      type Model460 {
        data: String!
      }

      type Model461 {
        data: String!
      }

      type Model462 {
        data: String!
      }

      type Model463 {
        data: String!
      }

      type Model464 {
        data: String!
      }

      type Model465 {
        data: String!
      }

      type Model466 {
        data: String!
      }

      type Model467 {
        data: String!
      }

      type Model468 {
        data: String!
      }

      type Model469 {
        data: String!
      }

      type Model47 {
        data: String!
      }

      type Model470 {
        data: String!
      }

      type Model471 {
        data: String!
      }

      type Model472 {
        data: String!
      }

      type Model473 {
        data: String!
      }

      type Model474 {
        data: String!
      }

      type Model475 {
        data: String!
      }

      type Model476 {
        data: String!
      }

      type Model477 {
        data: String!
      }

      type Model478 {
        data: String!
      }

      type Model479 {
        data: String!
      }

      type Model48 {
        data: String!
      }

      type Model480 {
        data: String!
      }

      type Model481 {
        data: String!
      }

      type Model482 {
        data: String!
      }

      type Model483 {
        data: String!
      }

      type Model484 {
        data: String!
      }

      type Model485 {
        data: String!
      }

      type Model486 {
        data: String!
      }

      type Model487 {
        data: String!
      }

      type Model488 {
        data: String!
      }

      type Model489 {
        data: String!
      }

      type Model49 {
        data: String!
      }

      type Model490 {
        data: String!
      }

      type Model491 {
        data: String!
      }

      type Model492 {
        data: String!
      }

      type Model493 {
        data: String!
      }

      type Model494 {
        data: String!
      }

      type Model495 {
        data: String!
      }

      type Model496 {
        data: String!
      }

      type Model497 {
        data: String!
      }

      type Model498 {
        data: String!
      }

      type Model499 {
        data: String!
      }

      type Model5 {
        data: String!
      }

      type Model50 {
        data: String!
      }

      type Model500 {
        data: String!
      }

      type Model51 {
        data: String!
      }

      type Model52 {
        data: String!
      }

      type Model53 {
        data: String!
      }

      type Model54 {
        data: String!
      }

      type Model55 {
        data: String!
      }

      type Model56 {
        data: String!
      }

      type Model57 {
        data: String!
      }

      type Model58 {
        data: String!
      }

      type Model59 {
        data: String!
      }

      type Model6 {
        data: String!
      }

      type Model60 {
        data: String!
      }

      type Model61 {
        data: String!
      }

      type Model62 {
        data: String!
      }

      type Model63 {
        data: String!
      }

      type Model64 {
        data: String!
      }

      type Model65 {
        data: String!
      }

      type Model66 {
        data: String!
      }

      type Model67 {
        data: String!
      }

      type Model68 {
        data: String!
      }

      type Model69 {
        data: String!
      }

      type Model7 {
        data: String!
      }

      type Model70 {
        data: String!
      }

      type Model71 {
        data: String!
      }

      type Model72 {
        data: String!
      }

      type Model73 {
        data: String!
      }

      type Model74 {
        data: String!
      }

      type Model75 {
        data: String!
      }

      type Model76 {
        data: String!
      }

      type Model77 {
        data: String!
      }

      type Model78 {
        data: String!
      }

      type Model79 {
        data: String!
      }

      type Model8 {
        data: String!
      }

      type Model80 {
        data: String!
      }

      type Model81 {
        data: String!
      }

      type Model82 {
        data: String!
      }

      type Model83 {
        data: String!
      }

      type Model84 {
        data: String!
      }

      type Model85 {
        data: String!
      }

      type Model86 {
        data: String!
      }

      type Model87 {
        data: String!
      }

      type Model88 {
        data: String!
      }

      type Model89 {
        data: String!
      }

      type Model9 {
        data: String!
      }

      type Model90 {
        data: String!
      }

      type Model91 {
        data: String!
      }

      type Model92 {
        data: String!
      }

      type Model93 {
        data: String!
      }

      type Model94 {
        data: String!
      }

      type Model95 {
        data: String!
      }

      type Model96 {
        data: String!
      }

      type Model97 {
        data: String!
      }

      type Model98 {
        data: String!
      }

      type Model99 {
        data: String!
      }

      type Mutation {
        createModel1(data: String!): Model1!
        createModel10(data: String!): Model10!
        createModel100(data: String!): Model100!
        createModel101(data: String!): Model101!
        createModel102(data: String!): Model102!
        createModel103(data: String!): Model103!
        createModel104(data: String!): Model104!
        createModel105(data: String!): Model105!
        createModel106(data: String!): Model106!
        createModel107(data: String!): Model107!
        createModel108(data: String!): Model108!
        createModel109(data: String!): Model109!
        createModel11(data: String!): Model11!
        createModel110(data: String!): Model110!
        createModel111(data: String!): Model111!
        createModel112(data: String!): Model112!
        createModel113(data: String!): Model113!
        createModel114(data: String!): Model114!
        createModel115(data: String!): Model115!
        createModel116(data: String!): Model116!
        createModel117(data: String!): Model117!
        createModel118(data: String!): Model118!
        createModel119(data: String!): Model119!
        createModel12(data: String!): Model12!
        createModel120(data: String!): Model120!
        createModel121(data: String!): Model121!
        createModel122(data: String!): Model122!
        createModel123(data: String!): Model123!
        createModel124(data: String!): Model124!
        createModel125(data: String!): Model125!
        createModel126(data: String!): Model126!
        createModel127(data: String!): Model127!
        createModel128(data: String!): Model128!
        createModel129(data: String!): Model129!
        createModel13(data: String!): Model13!
        createModel130(data: String!): Model130!
        createModel131(data: String!): Model131!
        createModel132(data: String!): Model132!
        createModel133(data: String!): Model133!
        createModel134(data: String!): Model134!
        createModel135(data: String!): Model135!
        createModel136(data: String!): Model136!
        createModel137(data: String!): Model137!
        createModel138(data: String!): Model138!
        createModel139(data: String!): Model139!
        createModel14(data: String!): Model14!
        createModel140(data: String!): Model140!
        createModel141(data: String!): Model141!
        createModel142(data: String!): Model142!
        createModel143(data: String!): Model143!
        createModel144(data: String!): Model144!
        createModel145(data: String!): Model145!
        createModel146(data: String!): Model146!
        createModel147(data: String!): Model147!
        createModel148(data: String!): Model148!
        createModel149(data: String!): Model149!
        createModel15(data: String!): Model15!
        createModel150(data: String!): Model150!
        createModel151(data: String!): Model151!
        createModel152(data: String!): Model152!
        createModel153(data: String!): Model153!
        createModel154(data: String!): Model154!
        createModel155(data: String!): Model155!
        createModel156(data: String!): Model156!
        createModel157(data: String!): Model157!
        createModel158(data: String!): Model158!
        createModel159(data: String!): Model159!
        createModel16(data: String!): Model16!
        createModel160(data: String!): Model160!
        createModel161(data: String!): Model161!
        createModel162(data: String!): Model162!
        createModel163(data: String!): Model163!
        createModel164(data: String!): Model164!
        createModel165(data: String!): Model165!
        createModel166(data: String!): Model166!
        createModel167(data: String!): Model167!
        createModel168(data: String!): Model168!
        createModel169(data: String!): Model169!
        createModel17(data: String!): Model17!
        createModel170(data: String!): Model170!
        createModel171(data: String!): Model171!
        createModel172(data: String!): Model172!
        createModel173(data: String!): Model173!
        createModel174(data: String!): Model174!
        createModel175(data: String!): Model175!
        createModel176(data: String!): Model176!
        createModel177(data: String!): Model177!
        createModel178(data: String!): Model178!
        createModel179(data: String!): Model179!
        createModel18(data: String!): Model18!
        createModel180(data: String!): Model180!
        createModel181(data: String!): Model181!
        createModel182(data: String!): Model182!
        createModel183(data: String!): Model183!
        createModel184(data: String!): Model184!
        createModel185(data: String!): Model185!
        createModel186(data: String!): Model186!
        createModel187(data: String!): Model187!
        createModel188(data: String!): Model188!
        createModel189(data: String!): Model189!
        createModel19(data: String!): Model19!
        createModel190(data: String!): Model190!
        createModel191(data: String!): Model191!
        createModel192(data: String!): Model192!
        createModel193(data: String!): Model193!
        createModel194(data: String!): Model194!
        createModel195(data: String!): Model195!
        createModel196(data: String!): Model196!
        createModel197(data: String!): Model197!
        createModel198(data: String!): Model198!
        createModel199(data: String!): Model199!
        createModel2(data: String!): Model2!
        createModel20(data: String!): Model20!
        createModel200(data: String!): Model200!
        createModel201(data: String!): Model201!
        createModel202(data: String!): Model202!
        createModel203(data: String!): Model203!
        createModel204(data: String!): Model204!
        createModel205(data: String!): Model205!
        createModel206(data: String!): Model206!
        createModel207(data: String!): Model207!
        createModel208(data: String!): Model208!
        createModel209(data: String!): Model209!
        createModel21(data: String!): Model21!
        createModel210(data: String!): Model210!
        createModel211(data: String!): Model211!
        createModel212(data: String!): Model212!
        createModel213(data: String!): Model213!
        createModel214(data: String!): Model214!
        createModel215(data: String!): Model215!
        createModel216(data: String!): Model216!
        createModel217(data: String!): Model217!
        createModel218(data: String!): Model218!
        createModel219(data: String!): Model219!
        createModel22(data: String!): Model22!
        createModel220(data: String!): Model220!
        createModel221(data: String!): Model221!
        createModel222(data: String!): Model222!
        createModel223(data: String!): Model223!
        createModel224(data: String!): Model224!
        createModel225(data: String!): Model225!
        createModel226(data: String!): Model226!
        createModel227(data: String!): Model227!
        createModel228(data: String!): Model228!
        createModel229(data: String!): Model229!
        createModel23(data: String!): Model23!
        createModel230(data: String!): Model230!
        createModel231(data: String!): Model231!
        createModel232(data: String!): Model232!
        createModel233(data: String!): Model233!
        createModel234(data: String!): Model234!
        createModel235(data: String!): Model235!
        createModel236(data: String!): Model236!
        createModel237(data: String!): Model237!
        createModel238(data: String!): Model238!
        createModel239(data: String!): Model239!
        createModel24(data: String!): Model24!
        createModel240(data: String!): Model240!
        createModel241(data: String!): Model241!
        createModel242(data: String!): Model242!
        createModel243(data: String!): Model243!
        createModel244(data: String!): Model244!
        createModel245(data: String!): Model245!
        createModel246(data: String!): Model246!
        createModel247(data: String!): Model247!
        createModel248(data: String!): Model248!
        createModel249(data: String!): Model249!
        createModel25(data: String!): Model25!
        createModel250(data: String!): Model250!
        createModel251(data: String!): Model251!
        createModel252(data: String!): Model252!
        createModel253(data: String!): Model253!
        createModel254(data: String!): Model254!
        createModel255(data: String!): Model255!
        createModel256(data: String!): Model256!
        createModel257(data: String!): Model257!
        createModel258(data: String!): Model258!
        createModel259(data: String!): Model259!
        createModel26(data: String!): Model26!
        createModel260(data: String!): Model260!
        createModel261(data: String!): Model261!
        createModel262(data: String!): Model262!
        createModel263(data: String!): Model263!
        createModel264(data: String!): Model264!
        createModel265(data: String!): Model265!
        createModel266(data: String!): Model266!
        createModel267(data: String!): Model267!
        createModel268(data: String!): Model268!
        createModel269(data: String!): Model269!
        createModel27(data: String!): Model27!
        createModel270(data: String!): Model270!
        createModel271(data: String!): Model271!
        createModel272(data: String!): Model272!
        createModel273(data: String!): Model273!
        createModel274(data: String!): Model274!
        createModel275(data: String!): Model275!
        createModel276(data: String!): Model276!
        createModel277(data: String!): Model277!
        createModel278(data: String!): Model278!
        createModel279(data: String!): Model279!
        createModel28(data: String!): Model28!
        createModel280(data: String!): Model280!
        createModel281(data: String!): Model281!
        createModel282(data: String!): Model282!
        createModel283(data: String!): Model283!
        createModel284(data: String!): Model284!
        createModel285(data: String!): Model285!
        createModel286(data: String!): Model286!
        createModel287(data: String!): Model287!
        createModel288(data: String!): Model288!
        createModel289(data: String!): Model289!
        createModel29(data: String!): Model29!
        createModel290(data: String!): Model290!
        createModel291(data: String!): Model291!
        createModel292(data: String!): Model292!
        createModel293(data: String!): Model293!
        createModel294(data: String!): Model294!
        createModel295(data: String!): Model295!
        createModel296(data: String!): Model296!
        createModel297(data: String!): Model297!
        createModel298(data: String!): Model298!
        createModel299(data: String!): Model299!
        createModel3(data: String!): Model3!
        createModel30(data: String!): Model30!
        createModel300(data: String!): Model300!
        createModel301(data: String!): Model301!
        createModel302(data: String!): Model302!
        createModel303(data: String!): Model303!
        createModel304(data: String!): Model304!
        createModel305(data: String!): Model305!
        createModel306(data: String!): Model306!
        createModel307(data: String!): Model307!
        createModel308(data: String!): Model308!
        createModel309(data: String!): Model309!
        createModel31(data: String!): Model31!
        createModel310(data: String!): Model310!
        createModel311(data: String!): Model311!
        createModel312(data: String!): Model312!
        createModel313(data: String!): Model313!
        createModel314(data: String!): Model314!
        createModel315(data: String!): Model315!
        createModel316(data: String!): Model316!
        createModel317(data: String!): Model317!
        createModel318(data: String!): Model318!
        createModel319(data: String!): Model319!
        createModel32(data: String!): Model32!
        createModel320(data: String!): Model320!
        createModel321(data: String!): Model321!
        createModel322(data: String!): Model322!
        createModel323(data: String!): Model323!
        createModel324(data: String!): Model324!
        createModel325(data: String!): Model325!
        createModel326(data: String!): Model326!
        createModel327(data: String!): Model327!
        createModel328(data: String!): Model328!
        createModel329(data: String!): Model329!
        createModel33(data: String!): Model33!
        createModel330(data: String!): Model330!
        createModel331(data: String!): Model331!
        createModel332(data: String!): Model332!
        createModel333(data: String!): Model333!
        createModel334(data: String!): Model334!
        createModel335(data: String!): Model335!
        createModel336(data: String!): Model336!
        createModel337(data: String!): Model337!
        createModel338(data: String!): Model338!
        createModel339(data: String!): Model339!
        createModel34(data: String!): Model34!
        createModel340(data: String!): Model340!
        createModel341(data: String!): Model341!
        createModel342(data: String!): Model342!
        createModel343(data: String!): Model343!
        createModel344(data: String!): Model344!
        createModel345(data: String!): Model345!
        createModel346(data: String!): Model346!
        createModel347(data: String!): Model347!
        createModel348(data: String!): Model348!
        createModel349(data: String!): Model349!
        createModel35(data: String!): Model35!
        createModel350(data: String!): Model350!
        createModel351(data: String!): Model351!
        createModel352(data: String!): Model352!
        createModel353(data: String!): Model353!
        createModel354(data: String!): Model354!
        createModel355(data: String!): Model355!
        createModel356(data: String!): Model356!
        createModel357(data: String!): Model357!
        createModel358(data: String!): Model358!
        createModel359(data: String!): Model359!
        createModel36(data: String!): Model36!
        createModel360(data: String!): Model360!
        createModel361(data: String!): Model361!
        createModel362(data: String!): Model362!
        createModel363(data: String!): Model363!
        createModel364(data: String!): Model364!
        createModel365(data: String!): Model365!
        createModel366(data: String!): Model366!
        createModel367(data: String!): Model367!
        createModel368(data: String!): Model368!
        createModel369(data: String!): Model369!
        createModel37(data: String!): Model37!
        createModel370(data: String!): Model370!
        createModel371(data: String!): Model371!
        createModel372(data: String!): Model372!
        createModel373(data: String!): Model373!
        createModel374(data: String!): Model374!
        createModel375(data: String!): Model375!
        createModel376(data: String!): Model376!
        createModel377(data: String!): Model377!
        createModel378(data: String!): Model378!
        createModel379(data: String!): Model379!
        createModel38(data: String!): Model38!
        createModel380(data: String!): Model380!
        createModel381(data: String!): Model381!
        createModel382(data: String!): Model382!
        createModel383(data: String!): Model383!
        createModel384(data: String!): Model384!
        createModel385(data: String!): Model385!
        createModel386(data: String!): Model386!
        createModel387(data: String!): Model387!
        createModel388(data: String!): Model388!
        createModel389(data: String!): Model389!
        createModel39(data: String!): Model39!
        createModel390(data: String!): Model390!
        createModel391(data: String!): Model391!
        createModel392(data: String!): Model392!
        createModel393(data: String!): Model393!
        createModel394(data: String!): Model394!
        createModel395(data: String!): Model395!
        createModel396(data: String!): Model396!
        createModel397(data: String!): Model397!
        createModel398(data: String!): Model398!
        createModel399(data: String!): Model399!
        createModel4(data: String!): Model4!
        createModel40(data: String!): Model40!
        createModel400(data: String!): Model400!
        createModel401(data: String!): Model401!
        createModel402(data: String!): Model402!
        createModel403(data: String!): Model403!
        createModel404(data: String!): Model404!
        createModel405(data: String!): Model405!
        createModel406(data: String!): Model406!
        createModel407(data: String!): Model407!
        createModel408(data: String!): Model408!
        createModel409(data: String!): Model409!
        createModel41(data: String!): Model41!
        createModel410(data: String!): Model410!
        createModel411(data: String!): Model411!
        createModel412(data: String!): Model412!
        createModel413(data: String!): Model413!
        createModel414(data: String!): Model414!
        createModel415(data: String!): Model415!
        createModel416(data: String!): Model416!
        createModel417(data: String!): Model417!
        createModel418(data: String!): Model418!
        createModel419(data: String!): Model419!
        createModel42(data: String!): Model42!
        createModel420(data: String!): Model420!
        createModel421(data: String!): Model421!
        createModel422(data: String!): Model422!
        createModel423(data: String!): Model423!
        createModel424(data: String!): Model424!
        createModel425(data: String!): Model425!
        createModel426(data: String!): Model426!
        createModel427(data: String!): Model427!
        createModel428(data: String!): Model428!
        createModel429(data: String!): Model429!
        createModel43(data: String!): Model43!
        createModel430(data: String!): Model430!
        createModel431(data: String!): Model431!
        createModel432(data: String!): Model432!
        createModel433(data: String!): Model433!
        createModel434(data: String!): Model434!
        createModel435(data: String!): Model435!
        createModel436(data: String!): Model436!
        createModel437(data: String!): Model437!
        createModel438(data: String!): Model438!
        createModel439(data: String!): Model439!
        createModel44(data: String!): Model44!
        createModel440(data: String!): Model440!
        createModel441(data: String!): Model441!
        createModel442(data: String!): Model442!
        createModel443(data: String!): Model443!
        createModel444(data: String!): Model444!
        createModel445(data: String!): Model445!
        createModel446(data: String!): Model446!
        createModel447(data: String!): Model447!
        createModel448(data: String!): Model448!
        createModel449(data: String!): Model449!
        createModel45(data: String!): Model45!
        createModel450(data: String!): Model450!
        createModel451(data: String!): Model451!
        createModel452(data: String!): Model452!
        createModel453(data: String!): Model453!
        createModel454(data: String!): Model454!
        createModel455(data: String!): Model455!
        createModel456(data: String!): Model456!
        createModel457(data: String!): Model457!
        createModel458(data: String!): Model458!
        createModel459(data: String!): Model459!
        createModel46(data: String!): Model46!
        createModel460(data: String!): Model460!
        createModel461(data: String!): Model461!
        createModel462(data: String!): Model462!
        createModel463(data: String!): Model463!
        createModel464(data: String!): Model464!
        createModel465(data: String!): Model465!
        createModel466(data: String!): Model466!
        createModel467(data: String!): Model467!
        createModel468(data: String!): Model468!
        createModel469(data: String!): Model469!
        createModel47(data: String!): Model47!
        createModel470(data: String!): Model470!
        createModel471(data: String!): Model471!
        createModel472(data: String!): Model472!
        createModel473(data: String!): Model473!
        createModel474(data: String!): Model474!
        createModel475(data: String!): Model475!
        createModel476(data: String!): Model476!
        createModel477(data: String!): Model477!
        createModel478(data: String!): Model478!
        createModel479(data: String!): Model479!
        createModel48(data: String!): Model48!
        createModel480(data: String!): Model480!
        createModel481(data: String!): Model481!
        createModel482(data: String!): Model482!
        createModel483(data: String!): Model483!
        createModel484(data: String!): Model484!
        createModel485(data: String!): Model485!
        createModel486(data: String!): Model486!
        createModel487(data: String!): Model487!
        createModel488(data: String!): Model488!
        createModel489(data: String!): Model489!
        createModel49(data: String!): Model49!
        createModel490(data: String!): Model490!
        createModel491(data: String!): Model491!
        createModel492(data: String!): Model492!
        createModel493(data: String!): Model493!
        createModel494(data: String!): Model494!
        createModel495(data: String!): Model495!
        createModel496(data: String!): Model496!
        createModel497(data: String!): Model497!
        createModel498(data: String!): Model498!
        createModel499(data: String!): Model499!
        createModel5(data: String!): Model5!
        createModel50(data: String!): Model50!
        createModel500(data: String!): Model500!
        createModel51(data: String!): Model51!
        createModel52(data: String!): Model52!
        createModel53(data: String!): Model53!
        createModel54(data: String!): Model54!
        createModel55(data: String!): Model55!
        createModel56(data: String!): Model56!
        createModel57(data: String!): Model57!
        createModel58(data: String!): Model58!
        createModel59(data: String!): Model59!
        createModel6(data: String!): Model6!
        createModel60(data: String!): Model60!
        createModel61(data: String!): Model61!
        createModel62(data: String!): Model62!
        createModel63(data: String!): Model63!
        createModel64(data: String!): Model64!
        createModel65(data: String!): Model65!
        createModel66(data: String!): Model66!
        createModel67(data: String!): Model67!
        createModel68(data: String!): Model68!
        createModel69(data: String!): Model69!
        createModel7(data: String!): Model7!
        createModel70(data: String!): Model70!
        createModel71(data: String!): Model71!
        createModel72(data: String!): Model72!
        createModel73(data: String!): Model73!
        createModel74(data: String!): Model74!
        createModel75(data: String!): Model75!
        createModel76(data: String!): Model76!
        createModel77(data: String!): Model77!
        createModel78(data: String!): Model78!
        createModel79(data: String!): Model79!
        createModel8(data: String!): Model8!
        createModel80(data: String!): Model80!
        createModel81(data: String!): Model81!
        createModel82(data: String!): Model82!
        createModel83(data: String!): Model83!
        createModel84(data: String!): Model84!
        createModel85(data: String!): Model85!
        createModel86(data: String!): Model86!
        createModel87(data: String!): Model87!
        createModel88(data: String!): Model88!
        createModel89(data: String!): Model89!
        createModel9(data: String!): Model9!
        createModel90(data: String!): Model90!
        createModel91(data: String!): Model91!
        createModel92(data: String!): Model92!
        createModel93(data: String!): Model93!
        createModel94(data: String!): Model94!
        createModel95(data: String!): Model95!
        createModel96(data: String!): Model96!
        createModel97(data: String!): Model97!
        createModel98(data: String!): Model98!
        createModel99(data: String!): Model99!
      }

      type Query {
        query_model_1: Model1
        query_model_10: Model10
        query_model_100: Model100
        query_model_101: Model101
        query_model_102: Model102
        query_model_103: Model103
        query_model_104: Model104
        query_model_105: Model105
        query_model_106: Model106
        query_model_107: Model107
        query_model_108: Model108
        query_model_109: Model109
        query_model_11: Model11
        query_model_110: Model110
        query_model_111: Model111
        query_model_112: Model112
        query_model_113: Model113
        query_model_114: Model114
        query_model_115: Model115
        query_model_116: Model116
        query_model_117: Model117
        query_model_118: Model118
        query_model_119: Model119
        query_model_12: Model12
        query_model_120: Model120
        query_model_121: Model121
        query_model_122: Model122
        query_model_123: Model123
        query_model_124: Model124
        query_model_125: Model125
        query_model_126: Model126
        query_model_127: Model127
        query_model_128: Model128
        query_model_129: Model129
        query_model_13: Model13
        query_model_130: Model130
        query_model_131: Model131
        query_model_132: Model132
        query_model_133: Model133
        query_model_134: Model134
        query_model_135: Model135
        query_model_136: Model136
        query_model_137: Model137
        query_model_138: Model138
        query_model_139: Model139
        query_model_14: Model14
        query_model_140: Model140
        query_model_141: Model141
        query_model_142: Model142
        query_model_143: Model143
        query_model_144: Model144
        query_model_145: Model145
        query_model_146: Model146
        query_model_147: Model147
        query_model_148: Model148
        query_model_149: Model149
        query_model_15: Model15
        query_model_150: Model150
        query_model_151: Model151
        query_model_152: Model152
        query_model_153: Model153
        query_model_154: Model154
        query_model_155: Model155
        query_model_156: Model156
        query_model_157: Model157
        query_model_158: Model158
        query_model_159: Model159
        query_model_16: Model16
        query_model_160: Model160
        query_model_161: Model161
        query_model_162: Model162
        query_model_163: Model163
        query_model_164: Model164
        query_model_165: Model165
        query_model_166: Model166
        query_model_167: Model167
        query_model_168: Model168
        query_model_169: Model169
        query_model_17: Model17
        query_model_170: Model170
        query_model_171: Model171
        query_model_172: Model172
        query_model_173: Model173
        query_model_174: Model174
        query_model_175: Model175
        query_model_176: Model176
        query_model_177: Model177
        query_model_178: Model178
        query_model_179: Model179
        query_model_18: Model18
        query_model_180: Model180
        query_model_181: Model181
        query_model_182: Model182
        query_model_183: Model183
        query_model_184: Model184
        query_model_185: Model185
        query_model_186: Model186
        query_model_187: Model187
        query_model_188: Model188
        query_model_189: Model189
        query_model_19: Model19
        query_model_190: Model190
        query_model_191: Model191
        query_model_192: Model192
        query_model_193: Model193
        query_model_194: Model194
        query_model_195: Model195
        query_model_196: Model196
        query_model_197: Model197
        query_model_198: Model198
        query_model_199: Model199
        query_model_2: Model2
        query_model_20: Model20
        query_model_200: Model200
        query_model_201: Model201
        query_model_202: Model202
        query_model_203: Model203
        query_model_204: Model204
        query_model_205: Model205
        query_model_206: Model206
        query_model_207: Model207
        query_model_208: Model208
        query_model_209: Model209
        query_model_21: Model21
        query_model_210: Model210
        query_model_211: Model211
        query_model_212: Model212
        query_model_213: Model213
        query_model_214: Model214
        query_model_215: Model215
        query_model_216: Model216
        query_model_217: Model217
        query_model_218: Model218
        query_model_219: Model219
        query_model_22: Model22
        query_model_220: Model220
        query_model_221: Model221
        query_model_222: Model222
        query_model_223: Model223
        query_model_224: Model224
        query_model_225: Model225
        query_model_226: Model226
        query_model_227: Model227
        query_model_228: Model228
        query_model_229: Model229
        query_model_23: Model23
        query_model_230: Model230
        query_model_231: Model231
        query_model_232: Model232
        query_model_233: Model233
        query_model_234: Model234
        query_model_235: Model235
        query_model_236: Model236
        query_model_237: Model237
        query_model_238: Model238
        query_model_239: Model239
        query_model_24: Model24
        query_model_240: Model240
        query_model_241: Model241
        query_model_242: Model242
        query_model_243: Model243
        query_model_244: Model244
        query_model_245: Model245
        query_model_246: Model246
        query_model_247: Model247
        query_model_248: Model248
        query_model_249: Model249
        query_model_25: Model25
        query_model_250: Model250
        query_model_251: Model251
        query_model_252: Model252
        query_model_253: Model253
        query_model_254: Model254
        query_model_255: Model255
        query_model_256: Model256
        query_model_257: Model257
        query_model_258: Model258
        query_model_259: Model259
        query_model_26: Model26
        query_model_260: Model260
        query_model_261: Model261
        query_model_262: Model262
        query_model_263: Model263
        query_model_264: Model264
        query_model_265: Model265
        query_model_266: Model266
        query_model_267: Model267
        query_model_268: Model268
        query_model_269: Model269
        query_model_27: Model27
        query_model_270: Model270
        query_model_271: Model271
        query_model_272: Model272
        query_model_273: Model273
        query_model_274: Model274
        query_model_275: Model275
        query_model_276: Model276
        query_model_277: Model277
        query_model_278: Model278
        query_model_279: Model279
        query_model_28: Model28
        query_model_280: Model280
        query_model_281: Model281
        query_model_282: Model282
        query_model_283: Model283
        query_model_284: Model284
        query_model_285: Model285
        query_model_286: Model286
        query_model_287: Model287
        query_model_288: Model288
        query_model_289: Model289
        query_model_29: Model29
        query_model_290: Model290
        query_model_291: Model291
        query_model_292: Model292
        query_model_293: Model293
        query_model_294: Model294
        query_model_295: Model295
        query_model_296: Model296
        query_model_297: Model297
        query_model_298: Model298
        query_model_299: Model299
        query_model_3: Model3
        query_model_30: Model30
        query_model_300: Model300
        query_model_301: Model301
        query_model_302: Model302
        query_model_303: Model303
        query_model_304: Model304
        query_model_305: Model305
        query_model_306: Model306
        query_model_307: Model307
        query_model_308: Model308
        query_model_309: Model309
        query_model_31: Model31
        query_model_310: Model310
        query_model_311: Model311
        query_model_312: Model312
        query_model_313: Model313
        query_model_314: Model314
        query_model_315: Model315
        query_model_316: Model316
        query_model_317: Model317
        query_model_318: Model318
        query_model_319: Model319
        query_model_32: Model32
        query_model_320: Model320
        query_model_321: Model321
        query_model_322: Model322
        query_model_323: Model323
        query_model_324: Model324
        query_model_325: Model325
        query_model_326: Model326
        query_model_327: Model327
        query_model_328: Model328
        query_model_329: Model329
        query_model_33: Model33
        query_model_330: Model330
        query_model_331: Model331
        query_model_332: Model332
        query_model_333: Model333
        query_model_334: Model334
        query_model_335: Model335
        query_model_336: Model336
        query_model_337: Model337
        query_model_338: Model338
        query_model_339: Model339
        query_model_34: Model34
        query_model_340: Model340
        query_model_341: Model341
        query_model_342: Model342
        query_model_343: Model343
        query_model_344: Model344
        query_model_345: Model345
        query_model_346: Model346
        query_model_347: Model347
        query_model_348: Model348
        query_model_349: Model349
        query_model_35: Model35
        query_model_350: Model350
        query_model_351: Model351
        query_model_352: Model352
        query_model_353: Model353
        query_model_354: Model354
        query_model_355: Model355
        query_model_356: Model356
        query_model_357: Model357
        query_model_358: Model358
        query_model_359: Model359
        query_model_36: Model36
        query_model_360: Model360
        query_model_361: Model361
        query_model_362: Model362
        query_model_363: Model363
        query_model_364: Model364
        query_model_365: Model365
        query_model_366: Model366
        query_model_367: Model367
        query_model_368: Model368
        query_model_369: Model369
        query_model_37: Model37
        query_model_370: Model370
        query_model_371: Model371
        query_model_372: Model372
        query_model_373: Model373
        query_model_374: Model374
        query_model_375: Model375
        query_model_376: Model376
        query_model_377: Model377
        query_model_378: Model378
        query_model_379: Model379
        query_model_38: Model38
        query_model_380: Model380
        query_model_381: Model381
        query_model_382: Model382
        query_model_383: Model383
        query_model_384: Model384
        query_model_385: Model385
        query_model_386: Model386
        query_model_387: Model387
        query_model_388: Model388
        query_model_389: Model389
        query_model_39: Model39
        query_model_390: Model390
        query_model_391: Model391
        query_model_392: Model392
        query_model_393: Model393
        query_model_394: Model394
        query_model_395: Model395
        query_model_396: Model396
        query_model_397: Model397
        query_model_398: Model398
        query_model_399: Model399
        query_model_4: Model4
        query_model_40: Model40
        query_model_400: Model400
        query_model_401: Model401
        query_model_402: Model402
        query_model_403: Model403
        query_model_404: Model404
        query_model_405: Model405
        query_model_406: Model406
        query_model_407: Model407
        query_model_408: Model408
        query_model_409: Model409
        query_model_41: Model41
        query_model_410: Model410
        query_model_411: Model411
        query_model_412: Model412
        query_model_413: Model413
        query_model_414: Model414
        query_model_415: Model415
        query_model_416: Model416
        query_model_417: Model417
        query_model_418: Model418
        query_model_419: Model419
        query_model_42: Model42
        query_model_420: Model420
        query_model_421: Model421
        query_model_422: Model422
        query_model_423: Model423
        query_model_424: Model424
        query_model_425: Model425
        query_model_426: Model426
        query_model_427: Model427
        query_model_428: Model428
        query_model_429: Model429
        query_model_43: Model43
        query_model_430: Model430
        query_model_431: Model431
        query_model_432: Model432
        query_model_433: Model433
        query_model_434: Model434
        query_model_435: Model435
        query_model_436: Model436
        query_model_437: Model437
        query_model_438: Model438
        query_model_439: Model439
        query_model_44: Model44
        query_model_440: Model440
        query_model_441: Model441
        query_model_442: Model442
        query_model_443: Model443
        query_model_444: Model444
        query_model_445: Model445
        query_model_446: Model446
        query_model_447: Model447
        query_model_448: Model448
        query_model_449: Model449
        query_model_45: Model45
        query_model_450: Model450
        query_model_451: Model451
        query_model_452: Model452
        query_model_453: Model453
        query_model_454: Model454
        query_model_455: Model455
        query_model_456: Model456
        query_model_457: Model457
        query_model_458: Model458
        query_model_459: Model459
        query_model_46: Model46
        query_model_460: Model460
        query_model_461: Model461
        query_model_462: Model462
        query_model_463: Model463
        query_model_464: Model464
        query_model_465: Model465
        query_model_466: Model466
        query_model_467: Model467
        query_model_468: Model468
        query_model_469: Model469
        query_model_47: Model47
        query_model_470: Model470
        query_model_471: Model471
        query_model_472: Model472
        query_model_473: Model473
        query_model_474: Model474
        query_model_475: Model475
        query_model_476: Model476
        query_model_477: Model477
        query_model_478: Model478
        query_model_479: Model479
        query_model_48: Model48
        query_model_480: Model480
        query_model_481: Model481
        query_model_482: Model482
        query_model_483: Model483
        query_model_484: Model484
        query_model_485: Model485
        query_model_486: Model486
        query_model_487: Model487
        query_model_488: Model488
        query_model_489: Model489
        query_model_49: Model49
        query_model_490: Model490
        query_model_491: Model491
        query_model_492: Model492
        query_model_493: Model493
        query_model_494: Model494
        query_model_495: Model495
        query_model_496: Model496
        query_model_497: Model497
        query_model_498: Model498
        query_model_499: Model499
        query_model_5: Model5
        query_model_50: Model50
        query_model_500: Model500
        query_model_51: Model51
        query_model_52: Model52
        query_model_53: Model53
        query_model_54: Model54
        query_model_55: Model55
        query_model_56: Model56
        query_model_57: Model57
        query_model_58: Model58
        query_model_59: Model59
        query_model_6: Model6
        query_model_60: Model60
        query_model_61: Model61
        query_model_62: Model62
        query_model_63: Model63
        query_model_64: Model64
        query_model_65: Model65
        query_model_66: Model66
        query_model_67: Model67
        query_model_68: Model68
        query_model_69: Model69
        query_model_7: Model7
        query_model_70: Model70
        query_model_71: Model71
        query_model_72: Model72
        query_model_73: Model73
        query_model_74: Model74
        query_model_75: Model75
        query_model_76: Model76
        query_model_77: Model77
        query_model_78: Model78
        query_model_79: Model79
        query_model_8: Model8
        query_model_80: Model80
        query_model_81: Model81
        query_model_82: Model82
        query_model_83: Model83
        query_model_84: Model84
        query_model_85: Model85
        query_model_86: Model86
        query_model_87: Model87
        query_model_88: Model88
        query_model_89: Model89
        query_model_9: Model9
        query_model_90: Model90
        query_model_91: Model91
        query_model_92: Model92
        query_model_93: Model93
        query_model_94: Model94
        query_model_95: Model95
        query_model_96: Model96
        query_model_97: Model97
        query_model_98: Model98
        query_model_99: Model99
      }
    `;
    expect(importSchema('fixtures/multiple-directories-with-master-schema/index.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('imports multi-level types without direct references', () => {
    const expectedSDL = /* GraphQL */`\
  type Level1 {
    id: ID!
  }

  type Level2 {
    id: ID!
    level1: Level1
  }

  type Level3 {
    id: ID!
    level2: Level2
  }

  type Query {
    level: Level3
  }
  `;
    expect(importSchema('fixtures/deep/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });
})
