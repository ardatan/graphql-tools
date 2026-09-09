---
title: "buildExecutionContext"
description: "The buildExecutionContext function exported by @graphql-tools/executor."
---

> **buildExecutionContext**\<`TData`, `TVariables`, `TContext`\>(`args`): readonly `GraphQLError`[] \| [`ExecutionContext`](/docs/api/executor/src/interfaces/executioncontext)\<`any`, `any`\>

Defined in: [packages/executor/src/execution/execute.ts:411](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L411)

**`Internal`**

Constructs a ExecutionContext object from the arguments passed to
execute, which we will pass throughout the other execution methods.

Throws a GraphQLError if a valid execution context cannot be created.

TODO: consider no longer exporting this function

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

readonly `GraphQLError`[] \| [`ExecutionContext`](/docs/api/executor/src/interfaces/executioncontext)\<`any`, `any`\>
