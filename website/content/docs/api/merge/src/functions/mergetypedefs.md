---
title: "mergeTypeDefs"
description: "The mergeTypeDefs function exported by @graphql-tools/merge."
---

## Call Signature

> **mergeTypeDefs**(`typeSource`): `DocumentNode`

Defined in: [packages/merge/src/typedefs-mergers/merge-typedefs.ts:109](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L109)

Merges multiple type definitions into a single `DocumentNode`

### Parameters

#### typeSource

[`TypeSource`](/docs/api/utils/src/type-aliases/typesource)

### Returns

`DocumentNode`

## Call Signature

> **mergeTypeDefs**(`typeSource`, `config?`): `string`

Defined in: [packages/merge/src/typedefs-mergers/merge-typedefs.ts:110](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L110)

Merges multiple type definitions into a single `DocumentNode`

### Parameters

#### typeSource

[`TypeSource`](/docs/api/utils/src/type-aliases/typesource)

#### config?

`Partial`\<[`Config`](/docs/api/merge/src/interfaces/config)\> & `object`

### Returns

`string`

## Call Signature

> **mergeTypeDefs**(`typeSource`, `config?`): `DocumentNode`

Defined in: [packages/merge/src/typedefs-mergers/merge-typedefs.ts:114](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L114)

Merges multiple type definitions into a single `DocumentNode`

### Parameters

#### typeSource

[`TypeSource`](/docs/api/utils/src/type-aliases/typesource)

#### config?

`Omit`\<`Partial`\<[`Config`](/docs/api/merge/src/interfaces/config)\>, `"commentDescriptions"`\>

### Returns

`DocumentNode`
