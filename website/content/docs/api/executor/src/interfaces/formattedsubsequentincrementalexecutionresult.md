---
title: "FormattedSubsequentIncrementalExecutionResult"
description: "The FormattedSubsequentIncrementalExecutionResult interface exported by @graphql-tools/executor."
---

Defined in: [packages/executor/src/execution/execute.ts:182](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L182)

## Type Parameters

### TData

`TData` = `Record`\<`string`, `unknown`\>

### TExtensions

`TExtensions` = `Record`\<`string`, `unknown`\>

## Properties

### extensions?

> `optional` **extensions?**: `TExtensions`

Defined in: [packages/executor/src/execution/execute.ts:188](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L188)

***

### hasNext

> **hasNext**: `boolean`

Defined in: [packages/executor/src/execution/execute.ts:186](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L186)

***

### incremental?

> `optional` **incremental?**: readonly [`FormattedIncrementalResult`](/docs/api/executor/src/type-aliases/formattedincrementalresult)\<`TData`, `TExtensions`\>[]

Defined in: [packages/executor/src/execution/execute.ts:187](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L187)
