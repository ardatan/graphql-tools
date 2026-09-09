---
title: "SetArgs"
description: "The SetArgs type alias exported by @graphql-tools/mock."
---

> **SetArgs**\<`KeyT`\> = `object`

Defined in: [packages/mock/src/types.ts:63](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L63)

## Type Parameters

### KeyT

`KeyT` *extends* [`KeyTypeConstraints`](/docs/api/mock/src/type-aliases/keytypeconstraints) = `string`

## Properties

### fieldArgs?

> `optional` **fieldArgs?**: `string` \| \{\[`argName`: `string`\]: `any`; \}

Defined in: [packages/mock/src/types.ts:72](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L72)

Optional arguments when querying the field.

#### See

GetArgs#fieldArgs

***

### fieldName?

> `optional` **fieldName?**: `string`

Defined in: [packages/mock/src/types.ts:66](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L66)

***

### key

> **key**: `KeyT`

Defined in: [packages/mock/src/types.ts:65](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L65)

***

### noOverride?

> `optional` **noOverride?**: `boolean`

Defined in: [packages/mock/src/types.ts:80](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L80)

If the value for this field is already set, it won't
be overridden.

Propagates down do nested `set`.

***

### typeName

> **typeName**: `string`

Defined in: [packages/mock/src/types.ts:64](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L64)

***

### value?

> `optional` **value?**: `unknown` \| \{\[`fieldName`: `string`\]: `any`; \}

Defined in: [packages/mock/src/types.ts:73](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L73)
