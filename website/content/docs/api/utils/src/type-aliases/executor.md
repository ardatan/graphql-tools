---
title: "Executor"
description: "The Executor type alias exported by @graphql-tools/utils."
---

> **Executor**\<`TBaseContext`, `TBaseExtensions`\> = \<`TReturn`, `TArgs`, `TContext`, `TRoot`, `TExtensions`\>(`request`) => [`MaybePromise`](/docs/api/utils/src/type-aliases/maybepromise)\<[`MaybeAsyncIterable`](/docs/api/utils/src/type-aliases/maybeasynciterable)\<[`ExecutionResult`](/docs/api/utils/src/interfaces/executionresult)\<`TReturn`\>\>\>

Defined in: [packages/utils/src/executor.ts:34](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/executor.ts#L34)

## Type Parameters

### TBaseContext

`TBaseContext` = `Record`\<`string`, `any`\>

### TBaseExtensions

`TBaseExtensions` = `Record`\<`string`, `any`\>

## Type Parameters

### TReturn

`TReturn` = `any`

### TArgs

`TArgs` *extends* `Record`\<`string`, `any`\> = `Record`\<`string`, `any`\>

### TContext

`TContext` *extends* `TBaseContext` = `TBaseContext`

### TRoot

`TRoot` = `any`

### TExtensions

`TExtensions` *extends* `TBaseExtensions` = `TBaseExtensions`

## Parameters

### request

[`ExecutionRequest`](/docs/api/utils/src/interfaces/executionrequest)\<`TArgs`, `TContext`, `TRoot`, `TExtensions`, `TReturn`\>

## Returns

[`MaybePromise`](/docs/api/utils/src/type-aliases/maybepromise)\<[`MaybeAsyncIterable`](/docs/api/utils/src/type-aliases/maybeasynciterable)\<[`ExecutionResult`](/docs/api/utils/src/interfaces/executionresult)\<`TReturn`\>\>\>
