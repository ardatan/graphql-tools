---
title: "PromiseWithResolvers"
description: "The PromiseWithResolvers interface exported by @graphql-tools/utils."
---

Defined in: [packages/utils/src/types.ts:155](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L155)

## Type Parameters

### T

`T`

## Properties

### promise

> **promise**: `Promise`\<`T`\>

Defined in: [packages/utils/src/types.ts:156](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L156)

***

### reject

> **reject**: (`reason?`) => `void`

Defined in: [packages/utils/src/types.ts:158](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L158)

#### Parameters

##### reason?

`any`

#### Returns

`void`

***

### resolve

> **resolve**: (`value`) => `void`

Defined in: [packages/utils/src/types.ts:157](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L157)

#### Parameters

##### value

`T` \| `PromiseLike`\<`T`\>

#### Returns

`void`
