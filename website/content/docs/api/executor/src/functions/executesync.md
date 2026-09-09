---
title: "executeSync"
description: "The executeSync function exported by @graphql-tools/executor."
---

> **executeSync**(`args`): [`SingularExecutionResult`](/docs/api/executor/src/interfaces/singularexecutionresult)

Defined in: [packages/executor/src/execution/execute.ts:345](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L345)

Also implements the "Executing requests" section of the GraphQL specification.
However, it guarantees to complete synchronously (or throw an error) assuming
that all field resolvers are also synchronous.

## Parameters

### args

[`ExecutionArgs`](/docs/api/executor/src/interfaces/executionargs)

## Returns

[`SingularExecutionResult`](/docs/api/executor/src/interfaces/singularexecutionresult)
