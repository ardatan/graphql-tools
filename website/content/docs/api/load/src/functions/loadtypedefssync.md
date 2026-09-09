---
title: "loadTypedefsSync"
description: "The loadTypedefsSync function exported by @graphql-tools/load."
---

> **loadTypedefsSync**\<`AdditionalConfig`\>(`pointerOrPointers`, `options`): [`Source`](/docs/api/utils/src/interfaces/source)[]

Defined in: [packages/load/src/load-typedefs.ts:87](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/load-typedefs.ts#L87)

Synchronously loads any GraphQL documents (i.e. executable documents like
operations and fragments as well as type system definitions) from the
provided pointers.

## Type Parameters

### AdditionalConfig

`AdditionalConfig` = `Record`\<`string`, `unknown`\>

## Parameters

### pointerOrPointers

[`UnnormalizedTypeDefPointer`](/docs/api/load/src/type-aliases/unnormalizedtypedefpointer) \| [`UnnormalizedTypeDefPointer`](/docs/api/load/src/type-aliases/unnormalizedtypedefpointer)[]

Pointers to the sources to load the documents from

### options

[`LoadTypedefsOptions`](/docs/api/load/src/type-aliases/loadtypedefsoptions)\<`Partial`\<`AdditionalConfig`\>\>

Additional options

## Returns

[`Source`](/docs/api/utils/src/interfaces/source)[]
