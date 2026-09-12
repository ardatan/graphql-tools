---
title: "getAsyncIterableWithCancel"
description: "The getAsyncIterableWithCancel function exported by @graphql-tools/utils."
---

> **getAsyncIterableWithCancel**\<`T`, `TAsyncIterable`, `TReturn`\>(`asyncIterable`, `onCancel`): `TAsyncIterable`

Defined in: [packages/utils/src/withCancel.ts:43](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/withCancel.ts#L43)

## Type Parameters

### T

`T`

### TAsyncIterable

`TAsyncIterable` *extends* `AsyncIterable`\<`T`, `any`, `any`\>

### TReturn

`TReturn` = `any`

## Parameters

### asyncIterable

`TAsyncIterable`

### onCancel

(`value?`) => `void` \| `Promise`\<`void`\>

## Returns

`TAsyncIterable`
