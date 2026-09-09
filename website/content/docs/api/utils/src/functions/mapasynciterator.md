---
title: "mapAsyncIterator"
description: "The mapAsyncIterator function exported by @graphql-tools/utils."
---

> **mapAsyncIterator**\<`T`, `U`\>(`iterator`, `onNext`, `onError?`, `onEnd?`): `AsyncIterableIterator`\<`U`\>

Defined in: node\_modules/@whatwg-node/promise-helpers/typings/index.d.ts:29

Given an AsyncIterable and a callback function, return an AsyncIterator
which produces values mapped via calling the callback function.

## Type Parameters

### T

`T`

### U

`U`

## Parameters

### iterator

`AsyncIterable`\<`T`, `any`, `any`\> \| `AsyncIterator`\<`T`, `any`, `any`\>

### onNext

(`value`) => [`MaybePromise`](/docs/api/utils/src/type-aliases/maybepromise)\<`U`\>

### onError?

`any`

### onEnd?

() => [`MaybePromise`](/docs/api/utils/src/type-aliases/maybepromise)\<`void`\>

## Returns

`AsyncIterableIterator`\<`U`\>
