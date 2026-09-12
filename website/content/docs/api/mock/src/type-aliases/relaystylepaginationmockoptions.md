---
title: "RelayStylePaginationMockOptions"
description: "The RelayStylePaginationMockOptions type alias exported by @graphql-tools/mock."
---

> **RelayStylePaginationMockOptions**\<`TContext`, `TArgs`\> = `object`

Defined in: [packages/mock/src/pagination.ts:12](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/pagination.ts#L12)

## Type Parameters

### TContext

`TContext`

### TArgs

`TArgs` *extends* [`RelayPaginationParams`](/docs/api/mock/src/type-aliases/relaypaginationparams)

## Properties

### allNodesFn?

> `optional` **allNodesFn?**: [`AllNodesFn`](/docs/api/mock/src/type-aliases/allnodesfn)\<`TContext`, `TArgs`\>

Defined in: [packages/mock/src/pagination.ts:58](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/pagination.ts#L58)

A function that'll be used to get all the nodes used for pagination.

By default, it will use the nodes of the field this pagination is attached to.

This option is handy when several paginable fields should share
the same base nodes:
```ts
{
   User: {
     friends: mockedRelayStylePagination(store),
     maleFriends: mockedRelayStylePagination(store, {
       allNodesFn: (userRef) =>
         store
          .get(userRef, ['friends', 'edges'])
          .map((e) => store.get(e, 'node'))
          .filter((userRef) => store.get(userRef, 'sex') === 'male')
     })
   }
}
```

***

### applyOnNodes?

> `optional` **applyOnNodes?**: (`nodeRefs`, `args`) => [`Ref`](/docs/api/mock/src/type-aliases/ref)[]

Defined in: [packages/mock/src/pagination.ts:34](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/pagination.ts#L34)

Use this option to apply filtering or sorting on the nodes given the
arguments the paginated field receives.

```ts
{
   User: {
     friends: mockedRelayStylePagination<
       unknown,
       RelayPaginationParams & { sortByBirthdateDesc?: boolean}
     >(
       store, {
         applyOnEdges: (edges, { sortByBirthdateDesc }) => {
           if (!sortByBirthdateDesc) return edges
           return _.sortBy(edges, (e) => store.get(e, ['node', 'birthdate']))
         }
      }),
   }
}
```

#### Parameters

##### nodeRefs

[`Ref`](/docs/api/mock/src/type-aliases/ref)[]

##### args

`TArgs`

#### Returns

[`Ref`](/docs/api/mock/src/type-aliases/ref)[]

***

### cursorFn?

> `optional` **cursorFn?**: (`nodeRef`) => `string`

Defined in: [packages/mock/src/pagination.ts:66](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/pagination.ts#L66)

The function that'll be used to compute the cursor of a node.

By default, it'll use `MockStore` internal reference `Ref`'s `key`
as cursor.

#### Parameters

##### nodeRef

[`Ref`](/docs/api/mock/src/type-aliases/ref)

#### Returns

`string`
