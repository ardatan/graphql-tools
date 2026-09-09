---
title: "MockList"
description: "The MockList class exported by @graphql-tools/mock."
---

Defined in: [packages/mock/src/MockList.ts:21](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockList.ts#L21)

This is an object you can return from your mock resolvers which calls the
provided `mockFunction` once for each list item.

## Constructors

### Constructor

> **new MockList**(`length`, `mockFunction?`): `MockList`

Defined in: [packages/mock/src/MockList.ts:31](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockList.ts#L31)

#### Parameters

##### length

`number` \| `number`[]

Either the exact length of items to return or an inclusive
range of possible lengths.

##### mockFunction?

() => `unknown`

The function to call for each item in the list to
resolve it. It can return another MockList or a value.

#### Returns

`MockList`

## Methods

### mock()

> **mock**(): `unknown`[]

Defined in: [packages/mock/src/MockList.ts:44](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockList.ts#L44)

**`Internal`**

#### Returns

`unknown`[]
