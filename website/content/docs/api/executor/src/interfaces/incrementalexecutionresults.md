---
title: "IncrementalExecutionResults"
description: "The IncrementalExecutionResults interface exported by @graphql-tools/executor."
---

Defined in: [packages/executor/src/execution/execute.ts:143](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L143)

## Type Parameters

### TData

`TData` = `Record`\<`string`, `unknown`\>

### TExtensions

`TExtensions` = `Record`\<`string`, `unknown`\>

## Properties

### initialResult

> **initialResult**: [`InitialIncrementalExecutionResult`](/docs/api/executor/src/interfaces/initialincrementalexecutionresult)\<`TData`, `TExtensions`\>

Defined in: [packages/executor/src/execution/execute.ts:147](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L147)

***

### subsequentResults

> **subsequentResults**: `AsyncGenerator`\<[`SubsequentIncrementalExecutionResult`](/docs/api/executor/src/interfaces/subsequentincrementalexecutionresult)\<`TData`, `TExtensions`\>, `void`, `void`\>

Defined in: [packages/executor/src/execution/execute.ts:148](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L148)
