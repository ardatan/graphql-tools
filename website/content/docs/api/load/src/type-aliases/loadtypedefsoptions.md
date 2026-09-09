---
title: "LoadTypedefsOptions"
description: "The LoadTypedefsOptions type alias exported by @graphql-tools/load."
---

> **LoadTypedefsOptions**\<`ExtraConfig`\> = [`BaseLoaderOptions`](/docs/api/utils/src/type-aliases/baseloaderoptions) & `ExtraConfig` & `object`

Defined in: [packages/load/src/load-typedefs.ts:18](https://github.com/ardatan/graphql-tools/blob/master/packages/load/src/load-typedefs.ts#L18)

## Type Declaration

### cache?

> `optional` **cache?**: `object`

#### Index Signature

\[`key`: `string`\]: [`Source`](/docs/api/utils/src/interfaces/source)[]

### filterKinds?

> `optional` **filterKinds?**: `string`[]

### loaders

> **loaders**: [`Loader`](/docs/api/utils/src/interfaces/loader)[]

### sort?

> `optional` **sort?**: `boolean`

## Type Parameters

### ExtraConfig

`ExtraConfig` = \{\[`key`: `string`\]: `any`; \}
