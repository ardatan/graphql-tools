---
title: "SchemaPrintOptions"
description: "The SchemaPrintOptions interface exported by @graphql-tools/utils."
---

Defined in: [packages/utils/src/types.ts:10](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L10)

## Properties

### assumeValid?

> `optional` **assumeValid?**: `boolean`

Defined in: [packages/utils/src/types.ts:20](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L20)

***

### commentDescriptions?

> `optional` **commentDescriptions?**: `boolean`

Defined in: [packages/utils/src/types.ts:19](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L19)

Descriptions are defined as preceding string literals, however an older
experimental version of the SDL supported preceding comments as
descriptions. Set to true to enable this deprecated behavior.
This option is provided to ease adoption and will be removed in v16.

Default: false
