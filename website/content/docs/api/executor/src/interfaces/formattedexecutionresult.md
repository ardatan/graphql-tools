---
title: "FormattedExecutionResult"
description: "The FormattedExecutionResult interface exported by @graphql-tools/executor."
---

Defined in: [packages/executor/src/execution/execute.ts:134](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L134)

## Extended by

- [`FormattedInitialIncrementalExecutionResult`](/docs/api/executor/src/interfaces/formattedinitialincrementalexecutionresult)
- [`FormattedIncrementalDeferResult`](/docs/api/executor/src/interfaces/formattedincrementaldeferresult)

## Type Parameters

### TData

`TData` = `Record`\<`string`, `unknown`\>

### TExtensions

`TExtensions` = `Record`\<`string`, `unknown`\>

## Properties

### data?

> `optional` **data?**: `TData` \| `null`

Defined in: [packages/executor/src/execution/execute.ts:139](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L139)

***

### errors?

> `optional` **errors?**: readonly `GraphQLFormattedError`[]

Defined in: [packages/executor/src/execution/execute.ts:138](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L138)

***

### extensions?

> `optional` **extensions?**: `TExtensions`

Defined in: [packages/executor/src/execution/execute.ts:140](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L140)
