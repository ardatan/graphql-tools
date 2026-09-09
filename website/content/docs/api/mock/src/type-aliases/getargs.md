---
title: "GetArgs"
description: "The GetArgs type alias exported by @graphql-tools/mock."
---

> **GetArgs**\<`KeyT`\> = `object`

Defined in: [packages/mock/src/types.ts:38](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L38)

## Type Parameters

### KeyT

`KeyT` *extends* [`KeyTypeConstraints`](/docs/api/mock/src/type-aliases/keytypeconstraints) = `string`

## Properties

### defaultValue?

> `optional` **defaultValue?**: `unknown` \| \{\[`fieldName`: `string`\]: `any`; \}

Defined in: [packages/mock/src/types.ts:60](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L60)

If no value found, insert the `defaultValue`.

***

### fieldArgs?

> `optional` **fieldArgs?**: `string` \| \{\[`argName`: `string`\]: `any`; \}

Defined in: [packages/mock/src/types.ts:56](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L56)

Optional arguments when querying the field.

Querying the field with the same arguments will return
the same value. Deep equality is checked.

```ts
store.get('User', 1, 'friend', { id: 2 }) === store.get('User', 1, 'friend', { id: 2 })
store.get('User', 1, 'friend', { id: 2 }) !== store.get('User', 1, 'friend')
```

Args can be a record, just like `args` argument of field resolver or an
arbitrary string.

***

### fieldName?

> `optional` **fieldName?**: `string`

Defined in: [packages/mock/src/types.ts:41](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L41)

***

### key?

> `optional` **key?**: `KeyT`

Defined in: [packages/mock/src/types.ts:40](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L40)

***

### typeName

> **typeName**: `string`

Defined in: [packages/mock/src/types.ts:39](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L39)
