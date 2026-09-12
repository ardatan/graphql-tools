---
title: "relayStylePaginationMock"
description: "The relayStylePaginationMock function exported by @graphql-tools/mock."
---

> **relayStylePaginationMock**\<`TContext`, `TArgs`\>(`store`, `__namedParameters?`): [`IFieldResolver`](/docs/api/utils/src/type-aliases/ifieldresolver)\<[`Ref`](/docs/api/mock/src/type-aliases/ref), `TContext`, `TArgs`, `any`\>

Defined in: [packages/mock/src/pagination.ts:98](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/pagination.ts#L98)

Produces a resolver that'll mock a [Relay-style cursor pagination](https://relay.dev/graphql/connections.htm).

```ts
const schemaWithMocks = addMocksToSchema({
  schema,
  resolvers: (store) => ({
    User: {
      friends: relayStylePaginationMock(store),
    }
  }),
})
```

## Type Parameters

### TContext

`TContext`

### TArgs

`TArgs` *extends* [`RelayPaginationParams`](/docs/api/mock/src/type-aliases/relaypaginationparams) = [`RelayPaginationParams`](/docs/api/mock/src/type-aliases/relaypaginationparams)

## Parameters

### store

[`IMockStore`](/docs/api/mock/src/interfaces/imockstore)

the MockStore

### \_\_namedParameters?

[`RelayStylePaginationMockOptions`](/docs/api/mock/src/type-aliases/relaystylepaginationmockoptions)\<`TContext`, `TArgs`\> = `{}`

## Returns

[`IFieldResolver`](/docs/api/utils/src/type-aliases/ifieldresolver)\<[`Ref`](/docs/api/mock/src/type-aliases/ref), `TContext`, `TArgs`, `any`\>
