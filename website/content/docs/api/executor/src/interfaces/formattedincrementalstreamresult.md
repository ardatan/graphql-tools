---
title: "FormattedIncrementalStreamResult"
description: "The FormattedIncrementalStreamResult interface exported by @graphql-tools/executor."
---

Defined in: [packages/executor/src/execution/execute.ts:218](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L218)

## Type Parameters

### TData

`TData` = `unknown`[]

### TExtensions

`TExtensions` = `Record`\<`string`, `unknown`\>

## Properties

### errors?

> `optional` **errors?**: readonly `GraphQLFormattedError`[]

Defined in: [packages/executor/src/execution/execute.ts:222](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L222)

***

### extensions?

> `optional` **extensions?**: `TExtensions`

Defined in: [packages/executor/src/execution/execute.ts:226](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L226)

***

### items?

> `optional` **items?**: `TData` \| `null`

Defined in: [packages/executor/src/execution/execute.ts:223](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L223)

***

### label?

> `optional` **label?**: `string`

Defined in: [packages/executor/src/execution/execute.ts:225](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L225)

***

### path?

> `optional` **path?**: readonly (`string` \| `number`)[]

Defined in: [packages/executor/src/execution/execute.ts:224](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L224)
