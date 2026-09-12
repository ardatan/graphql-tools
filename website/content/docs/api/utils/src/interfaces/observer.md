---
title: "Observer"
description: "The Observer interface exported by @graphql-tools/utils."
---

Defined in: [packages/utils/src/observableToAsyncIterable.ts:3](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/observableToAsyncIterable.ts#L3)

## Type Parameters

### T

`T`

## Properties

### complete

> **complete**: () => `void`

Defined in: [packages/utils/src/observableToAsyncIterable.ts:6](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/observableToAsyncIterable.ts#L6)

#### Returns

`void`

***

### error

> **error**: (`error`) => `void`

Defined in: [packages/utils/src/observableToAsyncIterable.ts:5](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/observableToAsyncIterable.ts#L5)

#### Parameters

##### error

`Error`

#### Returns

`void`

***

### next

> **next**: (`value`) => `void`

Defined in: [packages/utils/src/observableToAsyncIterable.ts:4](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/observableToAsyncIterable.ts#L4)

#### Parameters

##### value

`T`

#### Returns

`void`
