---
title: "subscribe"
description: "The subscribe function exported by @graphql-tools/executor."
---

> **subscribe**\<`TData`, `TVariables`, `TContext`\>(`args`): [`MaybePromise`](/docs/api/utils/src/type-aliases/maybepromise)\<[`SingularExecutionResult`](/docs/api/executor/src/interfaces/singularexecutionresult)\<`TData`, `any`\> \| `AsyncGenerator`\<[`SingularExecutionResult`](/docs/api/executor/src/interfaces/singularexecutionresult)\<`TData`, `any`\> \| [`InitialIncrementalExecutionResult`](/docs/api/executor/src/interfaces/initialincrementalexecutionresult)\<`TData`, `Record`\<`string`, `unknown`\>\> \| [`SubsequentIncrementalExecutionResult`](/docs/api/executor/src/interfaces/subsequentincrementalexecutionresult)\<`TData`, `Record`\<`string`, `unknown`\>\>, `void`, `void`\>\>

Defined in: [packages/executor/src/execution/execute.ts:1635](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L1635)

Implements the "Subscribe" algorithm described in the GraphQL specification,
including `@defer` and `@stream` as proposed in
https://github.com/graphql/graphql-spec/pull/742

Returns a Promise which resolves to either an AsyncIterator (if successful)
or an ExecutionResult (error). The promise will be rejected if the schema or
other arguments to this function are invalid, or if the resolved event stream
is not an async iterable.

If the client-provided arguments to this function do not result in a
compliant subscription, a GraphQL Response (ExecutionResult) with descriptive
errors and no data will be returned.

If the source stream could not be created due to faulty subscription resolver
logic or underlying systems, the promise will resolve to a single
ExecutionResult containing `errors` and no `data`.

If the operation succeeded, the promise resolves to an AsyncIterator, which
yields a stream of result representing the response stream.

Each result may be an ExecutionResult with no `hasNext` (if executing the
event did not use `@defer` or `@stream`), or an
`InitialIncrementalExecutionResult` or `SubsequentIncrementalExecutionResult`
(if executing the event used `@defer` or `@stream`). In the case of
incremental execution results, each event produces a single
`InitialIncrementalExecutionResult` followed by one or more
`SubsequentIncrementalExecutionResult`s; all but the last have `hasNext: true`,
and the last has `hasNext: false`. There is no interleaving between results
generated from the same original event.

Accepts an object with named arguments.

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

[`MaybePromise`](/docs/api/utils/src/type-aliases/maybepromise)\<[`SingularExecutionResult`](/docs/api/executor/src/interfaces/singularexecutionresult)\<`TData`, `any`\> \| `AsyncGenerator`\<[`SingularExecutionResult`](/docs/api/executor/src/interfaces/singularexecutionresult)\<`TData`, `any`\> \| [`InitialIncrementalExecutionResult`](/docs/api/executor/src/interfaces/initialincrementalexecutionresult)\<`TData`, `Record`\<`string`, `unknown`\>\> \| [`SubsequentIncrementalExecutionResult`](/docs/api/executor/src/interfaces/subsequentincrementalexecutionresult)\<`TData`, `Record`\<`string`, `unknown`\>\>, `void`, `void`\>\>
