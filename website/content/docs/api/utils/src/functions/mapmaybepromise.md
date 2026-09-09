---
title: "mapMaybePromise"
description: "The mapMaybePromise function exported by @graphql-tools/utils."
---

## Call Signature

> **mapMaybePromise**\<`TInput`, `TOutput`\>(`input`, `onSuccess`, `onError?`): [`MaybePromise`](/docs/api/utils/src/type-aliases/maybepromise)\<`TOutput`\>

Defined in: node\_modules/@whatwg-node/promise-helpers/typings/index.d.ts:23

### Type Parameters

#### TInput

`TInput`

#### TOutput

`TOutput`

### Parameters

#### input

[`MaybePromise`](/docs/api/utils/src/type-aliases/maybepromise)\<`TInput`\>

#### onSuccess

(`value`) => [`MaybePromise`](/docs/api/utils/src/type-aliases/maybepromise)\<`TOutput`\>

#### onError?

(`err`) => [`MaybePromise`](/docs/api/utils/src/type-aliases/maybepromise)\<`TOutput`\>

### Returns

[`MaybePromise`](/docs/api/utils/src/type-aliases/maybepromise)\<`TOutput`\>

### Deprecated

Use `handleMaybePromise` instead.

## Call Signature

> **mapMaybePromise**\<`TInput`, `TOutput`\>(`input`, `onSuccess`, `onError?`): `MaybePromiseLike`\<`TOutput`\>

Defined in: node\_modules/@whatwg-node/promise-helpers/typings/index.d.ts:24

### Type Parameters

#### TInput

`TInput`

#### TOutput

`TOutput`

### Parameters

#### input

`MaybePromiseLike`\<`TInput`\>

#### onSuccess

(`value`) => `MaybePromiseLike`\<`TOutput`\>

#### onError?

(`err`) => `MaybePromiseLike`\<`TOutput`\>

### Returns

`MaybePromiseLike`\<`TOutput`\>

### Deprecated

Use `handleMaybePromise` instead.
