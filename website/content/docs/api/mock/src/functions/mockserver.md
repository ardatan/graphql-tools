---
title: "mockServer"
description: "The mockServer function exported by @graphql-tools/mock."
---

> **mockServer**\<`TResolvers`\>(`schema`, `mocks`, `preserveResolvers?`, `mockGenerationBehavior?`): [`IMockServer`](/docs/api/mock/src/interfaces/imockserver)

Defined in: [packages/mock/src/mockServer.ts:21](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/mockServer.ts#L21)

A convenience wrapper on top of `addMocksToSchema`. It adds your mock resolvers
to your schema and returns a client that will correctly execute your query with
variables. Note: when executing queries from the returned server, context and
root will both equal `{}`.

## Type Parameters

### TResolvers

`TResolvers`

## Parameters

### schema

[`TypeSource`](/docs/api/utils/src/type-aliases/typesource)

The schema to which to add mocks. This can also be a set of type
definitions instead.

### mocks

[`IMocks`](/docs/api/mock/src/type-aliases/imocks)\<`TResolvers`\>

The mocks to add to the schema.

### preserveResolvers?

`boolean` = `false`

Set to `true` to prevent existing resolvers from being
overwritten to provide mock data. This can be used to mock some parts of the
server and not others.

### mockGenerationBehavior?

[`MockGenerationBehavior`](/docs/api/mock/src/type-aliases/mockgenerationbehavior)

Set to `'deterministic'` if the default random
mock generation behavior causes flakiness.

## Returns

[`IMockServer`](/docs/api/mock/src/interfaces/imockserver)
