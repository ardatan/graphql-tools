---
title: "execute"
description: "The execute function exported by @graphql-tools/executor."
---

> **execute**\<`TData`, `TVariables`, `TContext`\>(`args`): [`MaybePromise`](/docs/api/utils/src/type-aliases/maybepromise)\<[`SingularExecutionResult`](/docs/api/executor/src/interfaces/singularexecutionresult)\<`TData`, `any`\> \| [`IncrementalExecutionResults`](/docs/api/executor/src/interfaces/incrementalexecutionresults)\<`TData`, `Record`\<`string`, `unknown`\>\>\>

Defined in: [packages/executor/src/execution/execute.ts:267](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L267)

Implements the "Executing requests" section of the GraphQL specification,
including `@defer` and `@stream` as proposed in
https://github.com/graphql/graphql-spec/pull/742

This function returns a Promise of an IncrementalExecutionResults
object. This object either consists of a single ExecutionResult, or an
object containing an `initialResult` and a stream of `subsequentResults`.

If the arguments to this function do not result in a legal execution context,
a GraphQLError will be thrown immediately explaining the invalid input.

## Type Parameters

### TData

`TData` = `any`

### TVariables

`TVariables` = `any`

### TContext

`TContext` = `any`

## Parameters

### args

[`ExecutionArgs`](/docs/api/executor/src/interfaces/executionargs)\<`TData`, `TVariables`, `TContext`\>

## Returns

[`MaybePromise`](/docs/api/utils/src/type-aliases/maybepromise)\<[`SingularExecutionResult`](/docs/api/executor/src/interfaces/singularexecutionresult)\<`TData`, `any`\> \| [`IncrementalExecutionResults`](/docs/api/executor/src/interfaces/incrementalexecutionresults)\<`TData`, `Record`\<`string`, `unknown`\>\>\>
