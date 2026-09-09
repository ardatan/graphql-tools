---
title: "ExecutionResult"
description: "The ExecutionResult interface exported by @graphql-tools/utils."
---

Defined in: [packages/utils/src/Interfaces.ts:60](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L60)

The result of GraphQL execution.

  - `errors` is included when any errors occurred as a non-empty array.
  - `data` is the result of a successful execution of the query.
  - `hasNext` is true if a future payload is expected.
  - `extensions` is reserved for adding non-standard properties.

## Type Parameters

### TData

`TData` = `any`

### TExtensions

`TExtensions` = `any`

## Properties

### data?

> `optional` **data?**: `TData` \| `null`

Defined in: [packages/utils/src/Interfaces.ts:62](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L62)

***

### errors?

> `optional` **errors?**: readonly `GraphQLError`[]

Defined in: [packages/utils/src/Interfaces.ts:63](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L63)

***

### extensions?

> `optional` **extensions?**: `TExtensions`

Defined in: [packages/utils/src/Interfaces.ts:65](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L65)

***

### hasNext?

> `optional` **hasNext?**: `boolean`

Defined in: [packages/utils/src/Interfaces.ts:64](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L64)

***

### incremental?

> `optional` **incremental?**: readonly `ExecutionResult`\<`TData`, `TExtensions`\>[]

Defined in: [packages/utils/src/Interfaces.ts:61](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L61)

***

### items?

> `optional` **items?**: `TData` \| `null`

Defined in: [packages/utils/src/Interfaces.ts:68](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L68)

***

### label?

> `optional` **label?**: `string`

Defined in: [packages/utils/src/Interfaces.ts:66](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L66)

***

### path?

> `optional` **path?**: readonly (`string` \| `number`)[]

Defined in: [packages/utils/src/Interfaces.ts:67](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L67)
