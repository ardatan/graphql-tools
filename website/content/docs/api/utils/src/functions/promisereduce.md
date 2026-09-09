---
title: "promiseReduce"
description: "The promiseReduce function exported by @graphql-tools/utils."
---

> **promiseReduce**\<`T`, `U`\>(`values`, `callbackFn`, `initialValue`): [`MaybePromise`](/docs/api/utils/src/type-aliases/maybepromise)\<`U`\>

Defined in: [packages/utils/src/jsutils.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/jsutils.ts#L13)

## Type Parameters

### T

`T`

### U

`U`

## Parameters

### values

`Iterable`\<`T`\>

### callbackFn

(`accumulator`, `currentValue`) => [`MaybePromise`](/docs/api/utils/src/type-aliases/maybepromise)\<`U`\>

### initialValue

[`MaybePromise`](/docs/api/utils/src/type-aliases/maybepromise)\<`U`\>

## Returns

[`MaybePromise`](/docs/api/utils/src/type-aliases/maybepromise)\<`U`\>
