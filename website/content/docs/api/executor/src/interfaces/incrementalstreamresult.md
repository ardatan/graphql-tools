---
title: "IncrementalStreamResult"
description: "The IncrementalStreamResult interface exported by @graphql-tools/executor."
---

Defined in: [packages/executor/src/execution/execute.ts:207](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L207)

## Type Parameters

### TData

`TData` = `unknown`[]

### TExtensions

`TExtensions` = `Record`\<`string`, `unknown`\>

## Properties

### errors?

> `optional` **errors?**: readonly `GraphQLError`[]

Defined in: [packages/executor/src/execution/execute.ts:211](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L211)

***

### extensions?

> `optional` **extensions?**: `TExtensions`

Defined in: [packages/executor/src/execution/execute.ts:215](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L215)

***

### items?

> `optional` **items?**: `TData` \| `null`

Defined in: [packages/executor/src/execution/execute.ts:212](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L212)

***

### label?

> `optional` **label?**: `string`

Defined in: [packages/executor/src/execution/execute.ts:214](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L214)

***

### path?

> `optional` **path?**: readonly (`string` \| `number`)[]

Defined in: [packages/executor/src/execution/execute.ts:213](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L213)
