---
title: "SubsequentIncrementalExecutionResult"
description: "The SubsequentIncrementalExecutionResult interface exported by @graphql-tools/executor."
---

Defined in: [packages/executor/src/execution/execute.ts:173](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L173)

## Type Parameters

### TData

`TData` = `Record`\<`string`, `unknown`\>

### TExtensions

`TExtensions` = `Record`\<`string`, `unknown`\>

## Properties

### extensions?

> `optional` **extensions?**: `TExtensions`

Defined in: [packages/executor/src/execution/execute.ts:179](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L179)

***

### hasNext

> **hasNext**: `boolean`

Defined in: [packages/executor/src/execution/execute.ts:177](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L177)

***

### incremental?

> `optional` **incremental?**: readonly [`IncrementalResult`](/docs/api/executor/src/type-aliases/incrementalresult)\<`TData`, `TExtensions`\>[]

Defined in: [packages/executor/src/execution/execute.ts:178](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L178)
