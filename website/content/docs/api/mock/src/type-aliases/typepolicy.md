---
title: "TypePolicy"
description: "The TypePolicy type alias exported by @graphql-tools/mock."
---

> **TypePolicy** = `object`

Defined in: [packages/mock/src/types.ts:27](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L27)

## Properties

### keyFieldName?

> `optional` **keyFieldName?**: `string` \| `false`

Defined in: [packages/mock/src/types.ts:35](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L35)

The name of the field that should be used as store `key`.

If `false`, no field will be used and `id` or `_id` will be used,
otherwise we'll generate a random string
as key.
