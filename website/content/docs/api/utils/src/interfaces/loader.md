---
title: "Loader"
description: "The Loader interface exported by @graphql-tools/utils."
---

Defined in: [packages/utils/src/loaders.ts:21](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L21)

## Type Parameters

### TOptions

`TOptions` *extends* [`BaseLoaderOptions`](/docs/api/utils/src/type-aliases/baseloaderoptions) = [`BaseLoaderOptions`](/docs/api/utils/src/type-aliases/baseloaderoptions)

## Methods

### load()

> **load**(`pointer`, `options?`): `Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[] \| `null`\>

Defined in: [packages/utils/src/loaders.ts:22](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L22)

#### Parameters

##### pointer

`string`

##### options?

`TOptions`

#### Returns

`Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[] \| `null`\>

***

### loadSync()?

> `optional` **loadSync**(`pointer`, `options?`): [`Source`](/docs/api/utils/src/interfaces/source)[] \| `null`

Defined in: [packages/utils/src/loaders.ts:23](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L23)

#### Parameters

##### pointer

`string`

##### options?

`TOptions`

#### Returns

[`Source`](/docs/api/utils/src/interfaces/source)[] \| `null`
