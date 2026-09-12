---
title: "addMocksToSchema"
description: "The addMocksToSchema function exported by @graphql-tools/mock."
---

> **addMocksToSchema**\<`TResolvers`\>(`__namedParameters`): `GraphQLSchema`

Defined in: [packages/mock/src/addMocksToSchema.ts:103](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/addMocksToSchema.ts#L103)

Given a `schema` and a `MockStore`, returns an executable schema that
will use the provided `MockStore` to execute queries.

```ts
const schema = buildSchema(`
 type User {
   id: ID!
   name: String!
 }
 type Query {
   me: User!
 }
`)

const store = createMockStore({ schema });
const mockedSchema = addMocksToSchema({ schema, store });
```

If a `resolvers` parameter is passed, the query execution will use
the provided `resolvers` if, one exists, instead of the default mock
resolver.

```ts
const schema = buildSchema(`
  type User {
    id: ID!
    name: String!
  }
  type Query {
    me: User!
  }
  type Mutation {
    setMyName(newName: String!): User!
  }
`)

const store = createMockStore({ schema });
const mockedSchema = addMocksToSchema({
  schema,
  store,
  resolvers: {
    Mutation: {
      setMyName: (_, { newName }) => {
         const ref = store.get('Query', 'ROOT', 'viewer');
         store.set(ref, 'name', newName);
         return ref;
      }
    }
  }
 });
```

`Query` and `Mutation` type will use `key` `'ROOT'`.

## Type Parameters

### TResolvers

`TResolvers` = [`IResolvers`](/docs/api/utils/src/type-aliases/iresolvers)

## Parameters

### \_\_namedParameters

`IMockOptions`\<`TResolvers`\>

## Returns

`GraphQLSchema`
