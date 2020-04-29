import { parseImportLine, parseSDL, loadTypedefs, LoadTypedefsOptions, OPERATION_KINDS, loadTypedefsSync } from '@graphql-tools/load';
import * as fs from 'fs';
import { print } from 'graphql';
import { UrlLoader } from '@graphql-tools/url-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { JsonFileLoader } from '@graphql-tools/json-file-loader';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { parseGraphQLSDL, Source } from '@graphql-tools/utils';
import { mergeTypeDefs } from '@graphql-tools/merge';
import '../../../../testing/to-be-similar-gql-doc';
import { runTests } from '../../../../testing/utils';

type Options = LoadTypedefsOptions & Parameters<typeof mergeTypeDefs>[1];
type Schemas = { [name: string]: string };

function makeOptions(schemas?: Schemas, options?: Options) {
  return {
    loaders: [new GraphQLFileLoader(), new JsonFileLoader(), new UrlLoader(), new CodeFileLoader()],
      filterKinds: OPERATION_KINDS,
      cache: schemas ? Object.keys(schemas).reduce((prev, location) => Object.assign(prev, { [location]: parseGraphQLSDL(location, schemas[location], options) }), {}) : {},
      sort: false,
      forceGraphQLImport: true,
      cwd: __dirname,
      ...options,
  }
}

function makeTypeDefs(loadedTypeDefs: Source[], options: Options) {
  const typeDefs = mergeTypeDefs(loadedTypeDefs.map(r => r.document), { useSchemaDefinition: false, ...options });

  return typeof typeDefs === 'string' ? typeDefs : print(typeDefs);
}

const importSchemaAsync = async (
  schema: string, schemas?: Schemas, options?: Options
) => makeTypeDefs(await loadTypedefs(schema, makeOptions(schemas, options)), options);

const importSchemaSync = (
  schema: string, schemas?: Schemas, options?: Options
) => makeTypeDefs(loadTypedefsSync(schema, makeOptions(schemas, options)), options)

runTests({
  async: importSchemaAsync,
  sync: importSchemaSync,
})(importSchema => {
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

  test('parseImportLine: invalid', async () => {
    expect(() => parseImportLine(`import from "schema.graphql"`)).toThrow();
  });

  test('parseImportLine: invalid 2', async () => {
    expect(() => parseImportLine(`import A from ""`)).toThrow();
  });

  test('parseImportLine: invalid 3', async () => {
    expect(() => parseImportLine(`import A. from ""`)).toThrow();
  });

  test('parseImportLine: invalid 4', async () => {
    expect(() => parseImportLine(`import A.* from ""`)).toThrow();
  });

  test('parseImportLine: parse multi import', async () => {
    expect(parseImportLine(`import A, B from "schema.graphql"`)).toEqual({
      imports: ['A', 'B'],
      from: 'schema.graphql',
    });
  });

  test('parseImportLine: parse multi import (weird spacing)', async () => {
    expect(parseImportLine(`import  A  ,B   from "schema.graphql"`)).toEqual({
      imports: ['A', 'B'],
      from: 'schema.graphql',
    });
  });

  test('parseImportLine: different path', async () => {
    expect(parseImportLine(`import A from "../new/schema.graphql"`)).toEqual({
      imports: ['A'],
      from: '../new/schema.graphql',
    });
  });

  test('parseImportLine: module in node_modules', async () => {
    expect(parseImportLine(`import A from "module-name"`)).toEqual({
      imports: ['A'],
      from: 'module-name',
    });
  });

  test('parseImportLine: specific field', async () => {
    expect(parseImportLine(`import A.b from "module-name"`)).toEqual({
      imports: ['A.b'],
      from: 'module-name',
    });
  });

  test('parseImportLine: multiple specific fields', async () => {
    expect(parseImportLine(`import A.b, G.q from "module-name"`)).toEqual({
      imports: ['A.b', 'G.q'],
      from: 'module-name',
    });
  });

  test('parseImportLine: default import', async () => {
    expect(parseImportLine(`import "module-name"`)).toEqual({
      imports: ['*'],
      from: 'module-name',
    });
  });

  test('parseSDL: non-import comment', async () => {
    expect(parseSDL(`#importent: comment`)).toEqual([]);
  });

  test('parse: multi line import', async () => {
    const sdl = `\
          # import A from "a.graphql"
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

  test('Module in node_modules', async () => {
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
    expect(await importSchema('./fixtures/import-module/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: imports only', async () => {
    const expectedSDL = /* GraphQL */`\
          type Query {
            first: String
            second: Float
            third: String
          }
          `;
    expect(await importSchema('./fixtures/imports-only/all.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: import .gql extension', async () => {
    const expectedSDL = /* GraphQL */`\
          type A {
            id: ID!
          }
          `;
    expect(await importSchema('./fixtures/import-gql/a.gql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: import duplicate', async () => {
    const expectedSDL = /* GraphQL */`\
          type Query {
            first: String
            second: Float
            third: String
          }
          `;
    expect(await importSchema('./fixtures/import-duplicate/all.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: import nested', async () => {
    const expectedSDL = /* GraphQL */`\
          type Query {
            first: String
            second: Float
            third: String
          }
          `;
    expect(await importSchema('./fixtures/import-nested/all.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: field types', async () => {
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
    expect(await importSchema('./fixtures/field-types/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: enums', async () => {
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
    expect(await importSchema('./fixtures/enums/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: import all', async () => {
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
    expect(await importSchema('./fixtures/import-all/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: import all from objects', async () => {
    const schemaC = `
              type C1 {
                id: ID!
              }

              type C2 {
                id: ID!
              }

              type C3 {
                id: ID!
              }
          `;

    const schemaB = `
              # import * from 'schemaC'
              type B {
                hello: String!
                c1: C1
                c2: C2
              }
          `;

    const schemaA = `
              # import B from 'schemaB'
              type A {
                # test 1
                first: String
                second: Float
                b: B
              }
          `;

    const schemas = {
      schemaA,
      schemaB,
      schemaC,
    };

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
    expect(await importSchema(schemaA, schemas)).toBeSimilarGqlDoc(expectedSDL);
  });

  test(`importSchema: single object schema`, async () => {
    const schemaA = `
              type A {
                field: String
              }
          `;

    const expectedSDL = /* GraphQL */`\
          type A {
            field: String
          }
          `;

    expect(await importSchema(schemaA)).toBeSimilarGqlDoc(expectedSDL);
  });

  test(`importSchema: import all mix 'n match`, async () => {
    const schemaB = `
              # import C1, C2 from './fixtures/import-all/c.graphql'
              type B {
                hello: String!
                c1: C1
                c2: C2
              }
          `;

    const schemaA = `
              # import * from "schemaB"
              type A {
                # test 1
                first: String
                second: Float
                b: B
              }
          `;

    const schemas = {
      schemaB,
    };

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
          }
          `;

    expect(await importSchema(schemaA, schemas)).toBeSimilarGqlDoc(expectedSDL);
  });

  test(`importSchema: import all mix 'n match 2`, async () => {
    const schemaA = `
              # import * from "./fixtures/import-all/b.graphql"
              type A {
                # test 1
                first: String
                second: Float
                b: B
              }
          `;

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
    expect(await importSchema(schemaA)).toBeSimilarGqlDoc(expectedSDL);
  });

  test(`importSchema: import all - include Query/Mutation/Subscription type`, async () => {
    const schemaC = `
              type C1 {
                id: ID!
              }

              type C2 {
                id: ID!
              }

              type C3 {
                id: ID!
              }

              type Query {
                hello: String!
              }

              type Mutation {
                hello: String!
              }

              type Subscription {
                hello: String!
              }

              `;

    const schemaB = `
              # import * from 'schemaC'
              type B {
                hello: String!
                c1: C1
                c2: C2
              }
          `;

    const schemaA = `
              # import B from 'schemaB'
              type Query {
                greet: String!
              }

              type A {
                # test 1
                first: String
                second: Float
                b: B
              }
          `;

    const schemas = {
      schemaA,
      schemaB,
      schemaC,
    };

    const expectedSDL = /* GraphQL */`\
          type Query {
            greet: String!
            hello: String!
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
    expect(await importSchema(schemaA, schemas)).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: scalar', async () => {
    const expectedSDL = /* GraphQL */`\
          type A {
            b: B
          }

          scalar B
          `;
    expect(await importSchema('./fixtures/scalar/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: directive', async () => {
    const expectedSDL = /* GraphQL */`\
          type A {
            first: String @upper
            second: String @withB @deprecated
          }

          scalar B

          directive @upper on FIELD_DEFINITION

          directive @withB(argB: B) on FIELD_DEFINITION
          `;
    expect(await importSchema('./fixtures/directive/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: key directive', async () => {
    const expectedSDL = /* GraphQL */`\
          scalar UPC

          type Product @key(fields: "upc") {
            upc: UPC!
            name: String
          }
          `;
    expect(await importSchema('./fixtures/directive/c.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: multiple key directive', async () => {
    const expectedSDL = /* GraphQL */`\
          scalar UPC

          scalar SKU

          type Product @key(fields: "upc") @key(fields: "sku") {
            upc: UPC!
            sku: SKU!
            name: String
          }
          `;
    expect(await importSchema('./fixtures/directive/e.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: external directive', async () => {
    const expectedSDL = /* GraphQL */`\
          type Review @key(fields: "id") {
            product: Product @provides(fields: "name")
          }

          extend type Product @key(fields: "upc") {
            upc: String @external
            name: String @external
          }
          `;
    expect(await importSchema('./fixtures/directive/f.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: requires directive', async () => {
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
    expect(await importSchema('./fixtures/directive/g.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: interfaces', async () => {
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
    expect(await importSchema('./fixtures/interfaces/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: interfaces-many', async () => {
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
    expect(await importSchema('./fixtures/interfaces-many/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: interfaces-implements', async () => {
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
    expect(await importSchema('./fixtures/interfaces-implements/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: interfaces-implements-many', async () => {
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
    expect(await importSchema('./fixtures/interfaces-implements-many/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: input types', async () => {
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
    expect(await importSchema('./fixtures/input-types/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('importSchema: complex test', async () => {
    try {
      const a = await importSchema('./fixtures/complex/a.graphql');
      expect(a).toBeTruthy();
    } catch (e) {
      expect(e).toBeFalsy();
    }
  });

  test('circular imports', async () => {
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
    const actualSDL = await importSchema('./fixtures/circular/a.graphql');
    expect(actualSDL).toBeSimilarGqlDoc(expectedSDL);
  });

  test('related types', async () => {
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
    const actualSDL = await importSchema('./fixtures/related-types/a.graphql');
    expect(actualSDL).toBeSimilarGqlDoc(expectedSDL);
  });

  test('relative paths', async () => {
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
    const actualSDL = await importSchema('./fixtures/relative-paths/src/schema.graphql');
    expect(actualSDL).toBeSimilarGqlDoc(expectedSDL);
  });

  test('root field imports', async () => {
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
    const actualSDL = await importSchema('./fixtures/root-fields/a.graphql');
    expect(actualSDL).toBeSimilarGqlDoc(expectedSDL);
  });

  test('extend root field', async () => {
    const expectedSDL = /* GraphQL */`\
          extend type Query {
            me: User
          }

          type User @key(fields: "id") {
            id: ID!
            name: String
          }
          `;
    const actualSDL = await importSchema('./fixtures/root-fields/c.graphql');
    expect(actualSDL).toBeSimilarGqlDoc(expectedSDL);
  });

  test('extend root field imports', async () => {
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
    const actualSDL = await importSchema('./fixtures/root-fields/d.graphql');
    expect(actualSDL).toBeSimilarGqlDoc(expectedSDL);
  });

  test('merged root field imports', async () => {
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
    const actualSDL = await importSchema('./fixtures/merged-root-fields/a.graphql');
    expect(actualSDL).toBeSimilarGqlDoc(expectedSDL);
  });

  test('global schema modules', async () => {
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
    expect(await importSchema('./fixtures/global/a.graphql', { shared })).toBeSimilarGqlDoc(expectedSDL);
  });

  test('missing type on type', async () => {
    try {
      await importSchema('./fixtures/type-not-found/a.graphql');
      throw new Error();
    } catch (e) {
      expect(e.message).toBe(`Field test: Couldn't find type Post in any of the schemas.`);
    }

  });

  test('missing type on interface', async () => {
    try {
      await importSchema('./fixtures/type-not-found/b.graphql');
      throw new Error();
    } catch (e) {
      expect(e.message).toBe(`Field test: Couldn't find type Post in any of the schemas.`);
    }

  });

  test('missing type on input type', async () => {
    try {
      await importSchema('./fixtures/type-not-found/c.graphql');
      throw new Error();
    } catch (e) {
      expect(e.message).toBe(`Field post: Couldn't find type Post in any of the schemas.`);
    }

  });

  test('missing interface type', async () => {

    try {
      await importSchema('./fixtures/type-not-found/d.graphql');
      throw new Error();
    } catch (e) {
      expect(e.message).toBe(`Couldn't find interface MyInterface in any of the schemas.`);
    }

  });

  test('missing union type', async () => {

    try {
      await importSchema('./fixtures/type-not-found/e.graphql');
      throw new Error();
    } catch (e) {
      expect(e.message).toBe(`Couldn't find type C in any of the schemas.`);
    }

  });

  test('missing type on input type', async () => {

    try {
      await importSchema('./fixtures/type-not-found/f.graphql');
      throw new Error();
    } catch (e) {
      expect(e.message).toBe(`Field myfield: Couldn't find type Post in any of the schemas.`);
    }

  });

  test('missing type on directive', async () => {

    try {
      await importSchema('./fixtures/type-not-found/g.graphql');
      throw new Error();
    } catch (e) {
      expect(e.message).toBe(`Directive first: Couldn't find type first in any of the schemas.`);
    }

  });

  test('import with collision', async () => {
    // Local type gets preference over imported type
    const expectedSDL = /* GraphQL */`\
          type User {
            id: ID!
            name: String!
            intro: String
          }
          `;
    expect(await importSchema('./fixtures/collision/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('merged custom root fields imports', async () => {
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
    const actualSDL = await importSchema('./fixtures/merged-root-fields/a.graphql');
    expect(actualSDL).toBeSimilarGqlDoc(expectedSDL);
  });

  test('respect schema definition', async () => {
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
    const actualSDL = await importSchema('./fixtures/schema-definition/a.graphql');
    expect(actualSDL).toBeSimilarGqlDoc(expectedSDL);
  });

  test('import schema with shadowed type', async () => {
    const expectedSDL = /* GraphQL */`\
      type Query {
        b: B!
      }
      type B {
        x: X
      }
      scalar X
  `;
    expect(await importSchema('./fixtures/import-shadowed/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('import specific types', async () => {
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
    expect(await importSchema('./fixtures/specific/a.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });

  test('imports missing named imports for file imported multiple time without duplicates', async () => {
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
    expect(await importSchema('fixtures/multiple-imports/schema.graphql')).toBeSimilarGqlDoc(expectedSDL);
  });
})
