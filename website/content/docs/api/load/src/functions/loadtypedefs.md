---
title: "loadTypedefs"
description: "The loadTypedefs function exported by @graphql-tools/load."
---

> **loadTypedefs**\<`AdditionalConfig`\>(`pointerOrPointers`, `options`): `Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[]\>

Defined in: [packages/load/src/load-typedefs.ts:36](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/load-typedefs.ts#L36)

Asynchronously loads any GraphQL documents (i.e. executable documents like
operations and fragments as well as type system definitions) from the
provided pointers.
loadTypedefs does not merge the typeDefs when `#import` is used ( https://github.com/ardatan/graphql-tools/issues/2980#issuecomment-1003692728 )

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

`Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[]\>
